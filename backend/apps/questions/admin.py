from django.contrib import admin
from apps.questions.models import Question, UserQuestionHistory


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'topic_name', 'difficulty', 'verified', 'created_at')
    list_filter = ('subject', 'difficulty', 'verified')
    search_fields = ('text', 'topic_name')
    readonly_fields = ('text_hash', 'created_at')
    list_per_page = 50


@admin.register(UserQuestionHistory)
class UserQuestionHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'question', 'text_hash', 'seen_at')
    list_filter = ('user',)
    search_fields = ('user__email',)
