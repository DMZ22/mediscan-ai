from django.urls import path
from .views import DiseaseListView, ScreeningCreateView, ScreeningListView, PatientScreeningsView

urlpatterns = [
    path('diseases/', DiseaseListView.as_view(), name='disease-list'),
    path('create/', ScreeningCreateView.as_view(), name='screening-create'),
    path('', ScreeningListView.as_view(), name='screening-list'),
    path('patient/<int:patient_id>/', PatientScreeningsView.as_view(), name='patient-screenings'),
]
