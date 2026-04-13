from django.urls import path
from .views import (
    PatientListCreateView, PatientDetailView,
    AssessmentCreateView, AssessmentListView,
    AssessmentDetailView, PatientAssessmentsView,
)
from .bulk_import import BulkImportPatientsView, BulkImportTemplateView

urlpatterns = [
    path('', PatientListCreateView.as_view(), name='patient-list'),
    path('<int:pk>/', PatientDetailView.as_view(), name='patient-detail'),
    path('<int:patient_id>/assessments/', PatientAssessmentsView.as_view(), name='patient-assessments'),
    path('assessments/', AssessmentListView.as_view(), name='assessment-list'),
    path('assessments/create/', AssessmentCreateView.as_view(), name='assessment-create'),
    path('assessments/<int:pk>/', AssessmentDetailView.as_view(), name='assessment-detail'),
    # Bulk import
    path('bulk-import/', BulkImportPatientsView.as_view(), name='bulk-import'),
    path('bulk-import/template/', BulkImportTemplateView.as_view(), name='bulk-import-template'),
]
