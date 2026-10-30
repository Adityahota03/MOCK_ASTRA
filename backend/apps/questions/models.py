import hashlib
import re
from django.db import models
from django.conf import settings
from apps.catalog.models import Subject, Topic

def normalize_question_text(text: str) -> str:
    """Normalize question text by lowercasing and stripping non-alphanumeric chars."""
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    return ' '.join(cleaned.split())

def hash_question_text(text: str) -> str:
    """Compute SHA-256 hash of normalized question text."""
    normalized = normalize_question_text(text)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

class Question(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions')
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    topic_name = models.CharField(max_length=150, db_index=True)
    text = models.TextField()
    options = models.JSONField(help_text="Array of 4 options [A, B, C, D]")
    correct_index = models.IntegerField(help_text="0 for A, 1 for B, 2 for C, 3 for D")
    explanation = models.TextField(blank=True, default='')
    difficulty = models.CharField(max_length=20, default='medium') # easy, medium, hard
    text_hash = models.CharField(max_length=64, db_index=True)
    model_name = models.CharField(max_length=100, default='llama-3.3-70b-versatile')
    verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.text_hash:
            self.text_hash = hash_question_text(self.text)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.subject.name} - {self.topic_name}] {self.text[:60]}..."

class UserQuestionHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='question_history')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='user_history')
    text_hash = models.CharField(max_length=64, db_index=True)
    seen_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'text_hash')
        indexes = [
            models.Index(fields=['user', 'text_hash']),
        ]

    def __str__(self):
        return f"User {self.user_id} seen {self.text_hash[:8]}"
