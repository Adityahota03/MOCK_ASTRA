from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.catalog.urls')),
    path('api/', include('apps.test_sessions.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.chat.urls')),
]
