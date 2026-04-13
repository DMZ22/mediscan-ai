from django.urls import path
from .views import SymptomAnalysisView, HealthChatView, NoteSummaryView

urlpatterns = [
    path('symptoms/', SymptomAnalysisView.as_view(), name='symptom-analysis'),
    path('chat/', HealthChatView.as_view(), name='health-chat'),
    path('summarize-notes/', NoteSummaryView.as_view(), name='note-summary'),
]
