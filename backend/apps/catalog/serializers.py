from rest_framework import serializers
from apps.catalog.models import Subject, Topic

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'name', 'slug', 'description']

class SubjectSerializer(serializers.ModelSerializer):
    topics_count = serializers.IntegerField(source='topics.count', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'name', 'slug', 'icon', 'description', 'topics_count']
