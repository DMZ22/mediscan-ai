import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("patients", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="LabReport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("report_type", models.CharField(choices=[
                    ("cbc", "Complete Blood Count"), ("lipid_panel", "Lipid Panel"),
                    ("metabolic", "Metabolic Panel"), ("liver_function", "Liver Function"),
                    ("kidney_function", "Kidney Function"), ("thyroid", "Thyroid Panel"),
                    ("comprehensive", "Comprehensive"),
                ], max_length=20)),
                ("lab_values", models.JSONField(default=dict)),
                ("analysis", models.JSONField(default=dict)),
                ("summary", models.TextField(blank=True)),
                ("uploaded_file", models.FileField(blank=True, null=True, upload_to="lab_reports/")),
                ("input_method", models.CharField(default="manual", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="reports_created", to=settings.AUTH_USER_MODEL,
                )),
                ("patient", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="lab_reports", to="patients.patient",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
