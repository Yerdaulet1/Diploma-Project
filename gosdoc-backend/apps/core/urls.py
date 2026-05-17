"""
ГосДок — URL Help/FAQ (apps/core/urls.py)
"""

from django.urls import path
from .views import FaqListView, GlobalSearchView

urlpatterns = [
    path("faqs/", FaqListView.as_view(), name="faq-list"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
]
