from django.contrib import admin
from apps.catalog.models import Subject, Topic


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'slug')
    list_filter = ('subject',)
    search_fields = ('name', 'subject__name')
    prepopulated_fields = {'slug': ('name',)}
