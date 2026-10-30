from django.urls import path
from apps.chat.views import ConversationListView, MessageListView

urlpatterns = [
    path('chat/conversations/', ConversationListView.as_view(), name='conversation_list'),
    path('chat/conversations/<uuid:conversation_id>/messages/', MessageListView.as_view(), name='message_list'),
]
