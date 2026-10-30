from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from datetime import timedelta
from apps.test_sessions.models import TestSession
from apps.accounts.models import User
from apps.questions.models import Question
from apps.chat.models import ChatConversation, ChatMessage
from apps.catalog.models import Subject, Topic


# ─────────────────────────────────────────────
#  Student Dashboard Views (authenticated user)
# ─────────────────────────────────────────────

class DashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        sessions = TestSession.objects.filter(user=user, status__in=['submitted', 'expired'])

        total_tests = sessions.count()
        if total_tests == 0:
            return Response({
                "total_tests": 0,
                "average_accuracy": 0.0,
                "best_subject": "N/A",
                "current_streak": 0,
                "total_questions_solved": 0,
                "recent_tests": []
            })

        avg_acc = sessions.aggregate(Avg('accuracy'))['accuracy__avg'] or 0.0
        total_q = sessions.aggregate(Sum('num_questions'))['num_questions__sum'] or 0

        best_subj_row = sessions.values('subject__name').annotate(
            avg_sub_acc=Avg('accuracy')
        ).order_by('-avg_sub_acc').first()
        best_subject = best_subj_row['subject__name'] if best_subj_row else "N/A"

        # Calculate streak
        streak = 0
        dates_with_tests = set(
            s.started_at.date() for s in sessions.order_by('-started_at')
        )
        today = timezone.now().date()
        check_date = today if today in dates_with_tests else today - timedelta(days=1)
        while check_date in dates_with_tests:
            streak += 1
            check_date -= timedelta(days=1)

        recent = [
            {
                "id": str(s.id),
                "subject": s.subject.name,
                "topic": s.topic_name,
                "score": s.score,
                "total": s.num_questions,
                "accuracy": s.accuracy,
                "date": s.started_at.strftime("%Y-%m-%d %H:%M")
            }
            for s in sessions[:5]
        ]

        return Response({
            "total_tests": total_tests,
            "average_accuracy": round(avg_acc, 1),
            "best_subject": best_subject,
            "current_streak": streak,
            "total_questions_solved": total_q,
            "recent_tests": recent
        })


class DashboardTrendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = TestSession.objects.filter(
            user=request.user,
            status__in=['submitted', 'expired']
        ).order_by('started_at')[:30]

        trend_data = [
            {
                "test_num": idx + 1,
                "id": str(s.id),
                "date": s.started_at.strftime("%b %d"),
                "accuracy": s.accuracy,
                "score": s.score,
                "total": s.num_questions,
                "subject": s.subject.name,
                "topic": s.topic_name
            }
            for idx, s in enumerate(sessions)
        ]
        return Response(trend_data)


class DashboardSubjectsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = TestSession.objects.filter(
            user=request.user,
            status__in=['submitted', 'expired']
        )

        subject_stats = sessions.values('subject__name', 'subject__icon').annotate(
            tests_count=Count('id'),
            avg_accuracy=Avg('accuracy')
        ).order_by('-avg_accuracy')

        subjects_data = [
            {
                "subject": row['subject__name'],
                "icon": row['subject__icon'],
                "tests_count": row['tests_count'],
                "accuracy": round(row['avg_accuracy'], 1)
            }
            for row in subject_stats
        ]

        weak_topics = sessions.values('subject__name', 'topic_name').annotate(
            avg_acc=Avg('accuracy'),
            count=Count('id')
        ).filter(avg_acc__lt=65.0).order_by('avg_acc')[:8]

        weak_data = [
            {
                "subject": wt['subject__name'],
                "topic": wt['topic_name'],
                "accuracy": round(wt['avg_acc'], 1),
                "attempts": wt['count']
            }
            for wt in weak_topics
        ]

        return Response({
            "subjects": subjects_data,
            "weak_topics": weak_data
        })


# ─────────────────────────────────────────────
#  Admin Panel Views (staff only)
# ─────────────────────────────────────────────

class IsAdminUser(permissions.BasePermission):
    """Only allow staff/superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class AdminOverviewView(APIView):
    """Dashboard overview stats for the admin panel."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        last_7_days = now - timedelta(days=7)

        total_users = User.objects.filter(is_active=True, is_staff=False).count()
        new_users_7d = User.objects.filter(created_at__gte=last_7_days, is_staff=False).count()

        total_tests = TestSession.objects.filter(status__in=['submitted', 'expired']).count()
        tests_7d = TestSession.objects.filter(
            status__in=['submitted', 'expired'],
            started_at__gte=last_7_days
        ).count()

        total_questions = Question.objects.count()
        verified_questions = Question.objects.filter(verified=True).count()

        avg_accuracy = TestSession.objects.filter(
            status__in=['submitted', 'expired']
        ).aggregate(avg=Avg('accuracy'))['avg'] or 0.0

        total_chats = ChatConversation.objects.count()
        total_messages = ChatMessage.objects.count()

        daily_tests = []
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).date()
            count = TestSession.objects.filter(
                started_at__date=day,
                status__in=['submitted', 'expired']
            ).count()
            daily_tests.append({"date": day.strftime("%b %d"), "count": count})

        return Response({
            "total_users": total_users,
            "new_users_7d": new_users_7d,
            "total_tests": total_tests,
            "tests_7d": tests_7d,
            "total_questions": total_questions,
            "verified_questions": verified_questions,
            "average_accuracy": round(avg_accuracy, 1),
            "total_chats": total_chats,
            "total_messages": total_messages,
            "daily_tests": daily_tests,
        })


class AdminUsersView(APIView):
    """List and manage users."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.filter(is_staff=False).order_by('-created_at')[:100]
        users_data = []
        for u in users:
            test_count = TestSession.objects.filter(user=u, status__in=['submitted', 'expired']).count()
            avg_acc = TestSession.objects.filter(
                user=u, status__in=['submitted', 'expired']
            ).aggregate(avg=Avg('accuracy'))['avg'] or 0.0
            users_data.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M"),
                "tests_taken": test_count,
                "average_accuracy": round(avg_acc, 1),
            })
        return Response(users_data)

    def patch(self, request):
        """Toggle user active status."""
        user_id = request.data.get('user_id')
        is_active = request.data.get('is_active')
        try:
            user = User.objects.get(id=user_id, is_staff=False)
            user.is_active = is_active
            user.save(update_fields=['is_active'])
            return Response({"detail": f"User {user.email} {'activated' if is_active else 'deactivated'}."})
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminSubjectsView(APIView):
    """Manage subjects and their stats."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        subjects = Subject.objects.annotate(
            topics_count=Count('topics'),
            questions_count=Count('questions'),
            tests_count=Count('test_sessions'),
        ).order_by('name')

        data = []
        for s in subjects:
            avg_acc = TestSession.objects.filter(
                subject=s, status__in=['submitted', 'expired']
            ).aggregate(avg=Avg('accuracy'))['avg'] or 0.0
            data.append({
                "id": s.id,
                "name": s.name,
                "slug": s.slug,
                "icon": s.icon,
                "is_active": s.is_active,
                "topics_count": s.topics_count,
                "questions_count": s.questions_count,
                "tests_count": s.tests_count,
                "average_accuracy": round(avg_acc, 1),
            })
        return Response(data)

    def post(self, request):
        """Create a new subject."""
        from django.utils.text import slugify
        name = request.data.get('name', '').strip()
        icon = request.data.get('icon', 'book').strip()
        description = request.data.get('description', '').strip()
        if not name:
            return Response({"detail": "Subject name is required."}, status=status.HTTP_400_BAD_REQUEST)
        subject, created = Subject.objects.get_or_create(
            slug=slugify(name),
            defaults={'name': name, 'icon': icon, 'description': description, 'is_active': True}
        )
        if not created:
            return Response({"detail": "Subject already exists."}, status=status.HTTP_409_CONFLICT)
        return Response({"id": subject.id, "name": subject.name}, status=status.HTTP_201_CREATED)

    def patch(self, request):
        """Toggle subject active status."""
        subject_id = request.data.get('subject_id')
        is_active = request.data.get('is_active')
        try:
            subject = Subject.objects.get(id=subject_id)
            subject.is_active = is_active
            subject.save(update_fields=['is_active'])
            return Response({"detail": f"Subject '{subject.name}' {'activated' if is_active else 'deactivated'}."})
        except Subject.DoesNotExist:
            return Response({"detail": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminQuestionsView(APIView):
    """View and manage questions."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        subject_id = request.query_params.get('subject_id')
        qs = Question.objects.select_related('subject').order_by('-created_at')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        questions = qs[:100]
        data = [
            {
                "id": q.id,
                "subject": q.subject.name,
                "topic_name": q.topic_name,
                "text": q.text[:120],
                "difficulty": q.difficulty,
                "verified": q.verified,
                "model_name": q.model_name,
                "created_at": q.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for q in questions
        ]
        return Response(data)

    def delete(self, request):
        """Delete a question by ID."""
        question_id = request.data.get('question_id')
        try:
            q = Question.objects.get(id=question_id)
            q.delete()
            return Response({"detail": "Question deleted."})
        except Question.DoesNotExist:
            return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)


class AdminTestsView(APIView):
    """View test sessions."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        sessions = TestSession.objects.select_related('user', 'subject').order_by('-started_at')[:100]
        data = [
            {
                "id": str(s.id),
                "user_email": s.user.email,
                "subject": s.subject.name,
                "topic": s.topic_name,
                "status": s.status,
                "score": s.score,
                "num_questions": s.num_questions,
                "accuracy": s.accuracy,
                "started_at": s.started_at.strftime("%Y-%m-%d %H:%M"),
            }
            for s in sessions
        ]
        return Response(data)
