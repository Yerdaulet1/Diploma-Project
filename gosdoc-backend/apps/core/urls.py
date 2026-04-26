"""
ГосДок — URL Help/FAQ (apps/core/urls.py)
"""

from django.urls import path
from .views import FaqListView

urlpatterns = [
    path("faqs/", FaqListView.as_view(), name="faq-list"),
]
