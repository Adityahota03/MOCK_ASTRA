from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.chat.models import ChatConversation, ChatMessage
from apps.chat.serializers import ChatConversationSerializer, ChatMessageSerializer
from apps.llm.providers import get_llm_provider

class ConversationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = ChatConversation.objects.filter(user=request.user).order_by('-updated_at')
        serializer = ChatConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get('title', 'Study Doubt Session').strip()[:200]
        conversation = ChatConversation.objects.create(
            user=request.user,
            title=title or 'Study Doubt Session'
        )
        return Response(ChatConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)

class MessageListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = ChatConversation.objects.get(id=conversation_id, user=request.user)
        except ChatConversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = conversation.messages.all().order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, conversation_id):
        try:
            conversation = ChatConversation.objects.get(id=conversation_id, user=request.user)
        except ChatConversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({"detail": "Message content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Save user message
        user_msg = ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )

        # Auto title conversation from first message if default
        if conversation.messages.count() <= 2 and conversation.title == 'Study Doubt Session':
            short_title = content[:40].replace('\n', ' ')
            conversation.title = f"Doubt: {short_title}..."
            conversation.save(update_fields=['title'])

        # 2. Gather conversation history
        history_msgs = [
            {"role": m.role, "content": m.content}
            for m in conversation.messages.order_by('created_at')[:20]
        ]

        # 3. Call AI tutor via LLM provider
        llm = get_llm_provider()
        try:
            reply_text = llm.tutor_chat(history_msgs)
        except Exception as e:
            reply_text = f"I apologize, I encountered an issue while generating a solution: {str(e)}. Please check your query or try again in a moment."

        # 4. Save assistant reply
        assistant_msg = ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=reply_text
        )

        return Response({
            "user_message": ChatMessageSerializer(user_msg).data,
            "assistant_message": ChatMessageSerializer(assistant_msg).data
        }, status=status.HTTP_201_CREATED)
