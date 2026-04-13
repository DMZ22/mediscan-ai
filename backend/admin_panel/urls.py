from django.urls import path
from .views import (
    AdminDashboardView, AdminDoctorListView, AdminToggleDoctorView,
    AdminDoctorDetailView, AdminAllAssessmentsView, AdminExportCSVView,
    AdminDeleteDoctorView, AdminDeletePatientView, AdminPatientListView,
)

urlpatterns = [
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('doctors/', AdminDoctorListView.as_view(), name='admin-doctors'),
    path('doctors/<int:doctor_id>/', AdminDoctorDetailView.as_view(), name='admin-doctor-detail'),
    path('doctors/<int:doctor_id>/toggle/', AdminToggleDoctorView.as_view(), name='admin-toggle-doctor'),
    path('doctors/<int:doctor_id>/delete/', AdminDeleteDoctorView.as_view(), name='admin-delete-doctor'),
    path('patients/', AdminPatientListView.as_view(), name='admin-patients'),
    path('patients/<int:patient_id>/delete/', AdminDeletePatientView.as_view(), name='admin-delete-patient'),
    path('assessments/', AdminAllAssessmentsView.as_view(), name='admin-assessments'),
    path('export/', AdminExportCSVView.as_view(), name='admin-export'),
]
