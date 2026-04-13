from django.urls import path
from .views import (
    DashboardSummaryView, RiskDistributionView,
    TrendsView, AgeGroupAnalysisView, RecentActivityView, ModelInfoView,
)

urlpatterns = [
    path("summary/", DashboardSummaryView.as_view(), name="analytics-summary"),
    path("risk-distribution/", RiskDistributionView.as_view(), name="risk-distribution"),
    path("trends/", TrendsView.as_view(), name="trends"),
    path("age-groups/", AgeGroupAnalysisView.as_view(), name="age-groups"),
    path("recent/", RecentActivityView.as_view(), name="recent-activity"),
    path("model-info/", ModelInfoView.as_view(), name="model-info"),
]
