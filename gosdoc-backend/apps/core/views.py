"""
ГосДок — Views Core (apps/core/views.py)
"""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FAQ


class FaqListView(APIView):
    """
    GET /api/v1/help/faqs/
    Returns active FAQs, optionally filtered by ?topic=platform|tasks|orgs.
    No authentication required — public endpoint.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = FAQ.objects.filter(is_active=True)
        topic = request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic=topic)
        data = [
            {"id": faq.id, "topic": faq.topic, "question": faq.question, "answer": faq.answer, "order": faq.order}
            for faq in qs
        ]
        return Response(data)
