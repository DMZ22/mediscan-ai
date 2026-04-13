from django.urls import path
from .views import MedicineSearchView, MedicineDetailView, InteractionCheckView, MedicineHistoryView

urlpatterns = [
    path('search/', MedicineSearchView.as_view(), name='medicine-search'),
    path('interactions/', InteractionCheckView.as_view(), name='interaction-check'),
    path('history/', MedicineHistoryView.as_view(), name='medicine-history'),
    path('<str:drug_name>/', MedicineDetailView.as_view(), name='medicine-detail'),
]
