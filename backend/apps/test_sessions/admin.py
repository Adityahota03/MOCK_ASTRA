from django.contrib import admin
from apps.test_sessions.models import TestSession, TestSessionQuestion


class TestSessionQuestionInline(admin.TabularInline):
    model = TestSessionQuestion
    extra = 0
    readonly_fields = ('question', 'position', 'selected_index', 'is_correct', 'is_flagged', 'time_spent_sec')
    can_delete = False


@admin.register(TestSession)
class TestSessionAdmin(admin.ModelAdmin):
    inlines = [TestSessionQuestionInline]
    list_display = ('id', 'user', 'subject', 'topic_name', 'status', 'score', 'accuracy', 'started_at')
    list_filter = ('status', 'subject')
    search_fields = ('user__email', 'topic_name')
    readonly_fields = ('id', 'started_at', 'expires_at', 'submitted_at')
    list_per_page = 30
