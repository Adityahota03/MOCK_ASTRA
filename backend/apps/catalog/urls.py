from django.urls import path
from apps.catalog.views import SubjectListView, TopicListView

urlpatterns = [
    path('subjects/', SubjectListView.as_view(), name='subject_list'),
    path('subjects/<int:subject_id>/topics/', TopicListView.as_view(), name='topic_list'),
]
