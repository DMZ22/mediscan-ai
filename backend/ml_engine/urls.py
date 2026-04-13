from django.urls import path
from .views import ModelInfoView, QuickPredictView

urlpatterns = [
    path('info/',    ModelInfoView.as_view(),    name='ml-info'),
    path('predict/', QuickPredictView.as_view(), name='ml-predict'),
]
