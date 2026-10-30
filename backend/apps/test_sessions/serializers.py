from rest_framework import serializers
from django.utils import timezone
from apps.test_sessions.models import TestSession, TestSessionQuestion
from apps.catalog.serializers import SubjectSerializer

class ActiveQuestionSerializer(serializers.ModelSerializer):
    """Question serializer for in-progress tests. HIDES correct_index and explanation!"""
    text = serializers.CharField(source='question.text')
    options = serializers.JSONField(source='question.options')
    difficulty = serializers.CharField(source='question.difficulty')

    class Meta:
        model = TestSessionQuestion
        fields = ['id', 'position', 'text', 'options', 'difficulty', 'selected_index', 'is_flagged', 'time_spent_sec']

class ResultQuestionSerializer(serializers.ModelSerializer):
    """Question serializer for submitted tests. Includes correct answers & explanations."""
    text = serializers.CharField(source='question.text')
    options = serializers.JSONField(source='question.options')
    correct_index = serializers.IntegerField(source='question.correct_index')
    explanation = serializers.CharField(source='question.explanation')
    difficulty = serializers.CharField(source='question.difficulty')

    class Meta:
        model = TestSessionQuestion
        fields = [
            'id', 'position', 'text', 'options', 'difficulty',
            'selected_index', 'correct_index', 'is_correct', 'is_flagged',
            'explanation', 'time_spent_sec'
        ]

class TestSessionActiveSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    questions = ActiveQuestionSerializer(source='session_questions', many=True, read_only=True)
    server_now = serializers.SerializerMethodField()
    remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = TestSession
        fields = [
            'id', 'subject', 'topic_name', 'num_questions', 'duration_seconds',
            'started_at', 'expires_at', 'server_now', 'remaining_seconds',
            'status', 'questions'
        ]

    def get_server_now(self, obj):
        return timezone.now()

    def get_remaining_seconds(self, obj):
        now = timezone.now()
        rem = (obj.expires_at - now).total_seconds()
        return max(0, int(rem))

class TestSessionResultSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    questions = ResultQuestionSerializer(source='session_questions', many=True, read_only=True)

    class Meta:
        model = TestSession
        fields = [
            'id', 'subject', 'topic_name', 'num_questions', 'duration_seconds',
            'started_at', 'expires_at', 'submitted_at', 'status',
            'score', 'accuracy', 'total_time_spent_sec', 'questions'
        ]

class TestSessionListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_icon = serializers.CharField(source='subject.icon', read_only=True)

    class Meta:
        model = TestSession
        fields = [
            'id', 'subject_name', 'subject_icon', 'topic_name',
            'num_questions', 'status', 'score', 'accuracy',
            'total_time_spent_sec', 'started_at', 'submitted_at'
        ]
