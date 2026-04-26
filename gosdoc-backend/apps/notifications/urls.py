from django.urls import path
from .views import (
    NotificationBulkDeleteView,
    NotificationListView,
    NotificationReadAllView,
    NotificationReadView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("bulk-delete/", NotificationBulkDeleteView.as_view(), name="notification-bulk-delete"),
    path("<uuid:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
]
