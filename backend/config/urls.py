from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/patients/', include('patients.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/admin-panel/', include('admin_panel.urls')),
    path('api/screening/', include('screening.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/medicines/', include('medicines.urls')),
    path('api/ai/', include('ai_engine.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
