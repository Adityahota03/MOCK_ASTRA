from django.contrib import admin
from apps.chat.models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('role', 'content', 'created_at')
    can_delete = False


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    inlines = [ChatMessageInline]
    list_display = ('id', 'user', 'title', 'created_at', 'updated_at')
    search_fields = ('user__email', 'title')
    list_per_page = 30
