from django.urls import path
from apps.analytics.views import (
    DashboardSummaryView, DashboardTrendView, DashboardSubjectsView,
    AdminOverviewView, AdminUsersView, AdminSubjectsView,
    AdminQuestionsView, AdminTestsView,
)

urlpatterns = [
    # Student dashboard
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('dashboard/trend/', DashboardTrendView.as_view(), name='dashboard_trend'),
    path('dashboard/subjects/', DashboardSubjectsView.as_view(), name='dashboard_subjects'),

    # Admin panel
    path('admin-panel/overview/', AdminOverviewView.as_view(), name='admin_overview'),
    path('admin-panel/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin-panel/subjects/', AdminSubjectsView.as_view(), name='admin_subjects'),
    path('admin-panel/questions/', AdminQuestionsView.as_view(), name='admin_questions'),
    path('admin-panel/tests/', AdminTestsView.as_view(), name='admin_tests'),
]
