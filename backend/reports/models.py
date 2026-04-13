from django.db import models
from django.conf import settings
from patients.models import Patient


PANEL_CHOICES = [
    ("cbc", "Complete Blood Count"),
    ("lipid_panel", "Lipid Panel"),
    ("metabolic", "Metabolic Panel"),
    ("liver_function", "Liver Function"),
    ("kidney_function", "Kidney Function"),
    ("thyroid", "Thyroid Panel"),
    ("comprehensive", "Comprehensive"),
]


class LabReport(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE,
        related_name="lab_reports", null=True, blank=True
    )
    report_type = models.CharField(max_length=20, choices=PANEL_CHOICES)
    lab_values = models.JSONField(default=dict)
    analysis = models.JSONField(default=dict)
    summary = models.TextField(blank=True)
    uploaded_file = models.FileField(upload_to="lab_reports/", null=True, blank=True)
    input_method = models.CharField(max_length=10, default="manual")  # manual or upload
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="reports_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        patient_name = self.patient.full_name if self.patient else "Unknown"
        return f"{self.get_report_type_display()} — {patient_name}"
