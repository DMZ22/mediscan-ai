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
            name="Screening",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("disease_type", models.CharField(choices=[
                    ("diabetes", "Diabetes"), ("heart_disease", "Heart Disease"),
                    ("stroke", "Stroke"), ("kidney_disease", "Kidney Disease"),
                    ("liver_disease", "Liver Disease"), ("lung_disease", "Lung Disease"),
                    ("thyroid", "Thyroid Disorder"),
                ], max_length=20)),
                ("indicators", models.JSONField(default=dict)),
                ("risk_score", models.FloatField(default=0.0)),
                ("risk_level", models.CharField(choices=[
                    ("low", "Low"), ("medium", "Medium"),
                    ("high", "High"), ("critical", "Critical"),
                ], default="low", max_length=10)),
                ("risk_factors", models.JSONField(default=list)),
                ("recommendations", models.TextField(blank=True)),
                ("ai_analysis", models.TextField(blank=True)),
                ("assessed_at", models.DateTimeField(auto_now_add=True)),
                ("assessed_by", models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="screenings_done", to=settings.AUTH_USER_MODEL,
                )),
                ("patient", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="screenings", to="patients.patient",
                )),
            ],
            options={"ordering": ["-assessed_at"]},
        ),
    ]
