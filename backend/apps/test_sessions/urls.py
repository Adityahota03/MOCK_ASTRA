from django.urls import path
from apps.test_sessions.views import (
    GenerateTestView,
    TestDetailView,
    AutosaveAnswersView,
    SubmitTestView,
    TestResultView,
    TestListView,
)

urlpatterns = [
    path('tests/generate/', GenerateTestView.as_view(), name='generate_test'),
    path('tests/', TestListView.as_view(), name='test_list'),
    path('tests/<uuid:session_id>/', TestDetailView.as_view(), name='test_detail'),
    path('tests/<uuid:session_id>/answers/', AutosaveAnswersView.as_view(), name='autosave_answers'),
    path('tests/<uuid:session_id>/submit/', SubmitTestView.as_view(), name='submit_test'),
    path('tests/<uuid:session_id>/result/', TestResultView.as_view(), name='test_result'),
]
