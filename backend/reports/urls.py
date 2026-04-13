from django.urls import path
from .views import PanelListView, ReportAnalyzeView, ReportUploadView, ReportListView, PatientReportsView

urlpatterns = [
    path('panels/', PanelListView.as_view(), name='panel-list'),
    path('analyze/', ReportAnalyzeView.as_view(), name='report-analyze'),
    path('upload/', ReportUploadView.as_view(), name='report-upload'),
    path('', ReportListView.as_view(), name='report-list'),
    path('patient/<int:patient_id>/', PatientReportsView.as_view(), name='patient-reports'),
]
