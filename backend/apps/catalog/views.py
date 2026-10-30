from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.catalog.models import Subject, Topic
from apps.catalog.serializers import SubjectSerializer, TopicSerializer

class SubjectListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        subjects = Subject.objects.filter(is_active=True)
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data)

class TopicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, subject_id):
        try:
            subject = Subject.objects.get(id=subject_id, is_active=True)
        except Subject.DoesNotExist:
            return Response({"detail": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

        query = request.query_params.get('search', '').strip()
        topics = subject.topics.all()
        if query:
            topics = topics.filter(name__icontains=query)

        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)
