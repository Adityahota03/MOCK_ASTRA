from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from apps.test_sessions.models import TestSession, TestSessionQuestion
from apps.test_sessions.serializers import (
    TestSessionActiveSerializer,
    TestSessionResultSerializer,
    TestSessionListSerializer
)
from apps.questions.services import generate_test_session, QuestionGenerationUnavailable

class GenerateTestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subject_id = request.data.get('subject_id')
        topic_name = request.data.get('topic')
        count = int(request.data.get('count', 30))

        if not subject_id or not topic_name:
            return Response(
                {"detail": "Both subject_id and topic are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session = generate_test_session(
                user=request.user,
                subject_id=int(subject_id),
                topic_name=str(topic_name),
                num_questions=count
            )
            return Response({"session_id": str(session.id)}, status=status.HTTP_201_CREATED)
        except QuestionGenerationUnavailable as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({"detail": f"Failed to generate test: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        # Enforce IDOR protection: return 404 if not owned by request.user
        try:
            session = TestSession.objects.get(id=session_id, user=request.user)
        except TestSession.DoesNotExist:
            return Response({"detail": "Test session not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if expired while still marked in_progress
        if session.status == 'in_progress' and session.is_expired():
            # Auto-score on access if time elapsed
            self._auto_submit_session(session)

        serializer = TestSessionActiveSerializer(session)
        return Response(serializer.data)

    def _auto_submit_session(self, session: TestSession):
        with transaction.atomic():
            correct_count = 0
            total_time = 0
            for sq in session.session_questions.select_related('question').all():
                is_corr = (sq.selected_index is not None and sq.selected_index == sq.question.correct_index)
                sq.is_correct = is_corr
                sq.save(update_fields=['is_correct'])
                if is_corr:
                    correct_count += 1
                total_time += sq.time_spent_sec

            session.status = 'expired'
            session.submitted_at = timezone.now()
            session.score = correct_count
            session.accuracy = round((correct_count / max(1, session.num_questions)) * 100, 1)
            session.total_time_spent_sec = total_time
            session.save()

class AutosaveAnswersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, user=request.user)
        except TestSession.DoesNotExist:
            return Response({"detail": "Test session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != 'in_progress':
            return Response({"detail": "Test session is no longer active."}, status=status.HTTP_400_BAD_REQUEST)

        answers_data = request.data.get('answers', [])
        for item in answers_data:
            position = item.get('position')
            selected_idx = item.get('selected_index')
            is_flagged = item.get('is_flagged')
            time_spent = item.get('time_spent_sec')

            if position is not None:
                update_fields = []
                sq = session.session_questions.filter(position=position).first()
                if sq:
                    if selected_idx is not None or 'selected_index' in item:
                        sq.selected_index = selected_idx
                        update_fields.append('selected_index')
                    if is_flagged is not None:
                        sq.is_flagged = is_flagged
                        update_fields.append('is_flagged')
                    if time_spent is not None:
                        sq.time_spent_sec = max(sq.time_spent_sec, time_spent)
                        update_fields.append('time_spent_sec')
                    if update_fields:
                        sq.save(update_fields=update_fields)

        return Response({"status": "saved"})

class SubmitTestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, user=request.user)
        except TestSession.DoesNotExist:
            return Response({"detail": "Test session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status in ('submitted', 'expired'):
            return Response(TestSessionResultSerializer(session).data, status=status.HTTP_200_OK)

        now = timezone.now()
        # 5 second grace period
        grace_expiry = session.expires_at + timezone.timedelta(seconds=5)
        is_late = now > grace_expiry

        # Process any final answers passed in body
        answers_data = request.data.get('answers', [])
        with transaction.atomic():
            for item in answers_data:
                pos = item.get('position')
                sel_idx = item.get('selected_index')
                sq = session.session_questions.filter(position=pos).first()
                if sq and sel_idx is not None:
                    sq.selected_index = sel_idx
                    sq.save(update_fields=['selected_index'])

            correct_count = 0
            total_time = 0
            for sq in session.session_questions.select_related('question').all():
                is_corr = (sq.selected_index is not None and sq.selected_index == sq.question.correct_index)
                sq.is_correct = is_corr
                sq.save(update_fields=['is_correct'])
                if is_corr:
                    correct_count += 1
                total_time += sq.time_spent_sec

            session.status = 'expired' if is_late else 'submitted'
            session.submitted_at = now
            session.score = correct_count
            session.accuracy = round((correct_count / max(1, session.num_questions)) * 100, 1)
            session.total_time_spent_sec = total_time
            session.save()

        return Response(TestSessionResultSerializer(session).data, status=status.HTTP_200_OK)

class TestResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = TestSession.objects.get(id=session_id, user=request.user)
        except TestSession.DoesNotExist:
            return Response({"detail": "Test session not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status == 'in_progress':
            if session.is_expired():
                # Auto expire
                SubmitTestView().post(request, session_id)
                session.refresh_from_db()
            else:
                return Response(
                    {"detail": "Cannot view answers while test is in progress."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = TestSessionResultSerializer(session)
        return Response(serializer.data)

class TestListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = TestSession.objects.filter(user=request.user).order_by('-started_at')[:50]
        serializer = TestSessionListSerializer(sessions, many=True)
        return Response(serializer.data)
