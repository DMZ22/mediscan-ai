from django.db import models
from django.conf import settings
from patients.models import Patient


DISEASE_CHOICES = [
    ("diabetes", "Diabetes"),
    ("heart_disease", "Heart Disease"),
    ("stroke", "Stroke"),
    ("kidney_disease", "Kidney Disease"),
    ("liver_disease", "Liver Disease"),
    ("lung_disease", "Lung Disease"),
    ("thyroid", "Thyroid Disorder"),
]

RISK_CHOICES = [
    ("low", "Low"), ("medium", "Medium"),
    ("high", "High"), ("critical", "Critical"),
]


class Screening(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="screenings")
    disease_type = models.CharField(max_length=20, choices=DISEASE_CHOICES)
    indicators = models.JSONField(default=dict)
    risk_score = models.FloatField(default=0.0)
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, default="low")
    risk_factors = models.JSONField(default=list)
    recommendations = models.TextField(blank=True)
    ai_analysis = models.TextField(blank=True)
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="screenings_done"
    )
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assessed_at"]

    def __str__(self):
        return f"{self.get_disease_type_display()} screening for {self.patient}"
