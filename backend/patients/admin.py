from django.contrib import admin
from .models import Patient, Assessment

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["full_name", "age", "gender", "blood_group", "contact", "created_at"]
    list_filter = ["gender", "blood_group"]
    search_fields = ["first_name", "last_name", "contact"]

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["patient", "risk_level", "risk_score", "assessed_by", "assessed_at"]
    list_filter = ["risk_level"]
    readonly_fields = ["risk_score", "risk_level", "risk_factors", "model_confidence", "shap_values", "model_breakdown"]
