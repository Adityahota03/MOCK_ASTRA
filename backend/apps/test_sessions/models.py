import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.catalog.models import Subject
from apps.questions.models import Question

class TestSession(models.Model):
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('expired', 'Expired'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='test_sessions')
    topic_name = models.CharField(max_length=150)
    num_questions = models.IntegerField(default=30)
    duration_seconds = models.IntegerField(default=1800) # e.g. 30 * 60s
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    score = models.IntegerField(default=0)
    accuracy = models.FloatField(default=0.0) # Percentage: 0.0 - 100.0
    total_time_spent_sec = models.IntegerField(default=0)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'started_at']),
        ]

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Test {self.id} - {self.subject.name} - {self.user.email} ({self.status})"

class TestSessionQuestion(models.Model):
    session = models.ForeignKey(TestSession, on_delete=models.CASCADE, related_name='session_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    position = models.IntegerField()
    selected_index = models.IntegerField(null=True, blank=True) # 0, 1, 2, 3 or null
    is_flagged = models.BooleanField(default=False)
    is_correct = models.BooleanField(null=True, blank=True)
    time_spent_sec = models.IntegerField(default=0)

    class Meta:
        ordering = ['position']
        unique_together = ('session', 'position')

    def __str__(self):
        return f"Session {self.session_id} Q#{self.position} (Ans: {self.selected_index})"
