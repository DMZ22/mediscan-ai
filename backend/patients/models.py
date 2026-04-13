from django.db import models
from django.conf import settings


class Patient(models.Model):
    GENDER_CHOICES = [("M", "Male"), ("F", "Female"), ("O", "Other")]
    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"), ("A-", "A-"), ("B+", "B+"), ("B-", "B-"),
        ("AB+", "AB+"), ("AB-", "AB-"), ("O+", "O+"), ("O-", "O-"),
    ]
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES, blank=True)
    contact = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="patients_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def latest_assessment(self):
        return self.assessments.order_by("-assessed_at").first()


class Assessment(models.Model):
    RISK_CHOICES = [
        ("low", "Low"), ("medium", "Medium"),
        ("high", "High"), ("critical", "Critical"),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="assessments")
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="assessments_done"
    )

    # CDC Health Indicators Features
    high_bp = models.IntegerField(default=0, help_text="High Blood Pressure (0=No, 1=Yes)")
    high_chol = models.IntegerField(default=0, help_text="High Cholesterol (0=No, 1=Yes)")
    chol_check = models.IntegerField(default=1, help_text="Cholesterol Check in 5 years (0=No, 1=Yes)")
    bmi = models.FloatField(help_text="Body Mass Index")
    smoker = models.IntegerField(default=0, help_text="Smoked 100+ cigarettes (0=No, 1=Yes)")
    stroke = models.IntegerField(default=0, help_text="Ever had stroke (0=No, 1=Yes)")
    heart_disease = models.IntegerField(default=0, help_text="Heart disease or attack (0=No, 1=Yes)")
    phys_activity = models.IntegerField(default=1, help_text="Physical activity last 30 days (0=No, 1=Yes)")
    fruits = models.IntegerField(default=1, help_text="Consumes fruit daily (0=No, 1=Yes)")
    veggies = models.IntegerField(default=1, help_text="Consumes vegetables daily (0=No, 1=Yes)")
    heavy_alcohol = models.IntegerField(default=0, help_text="Heavy alcohol consumption (0=No, 1=Yes)")
    any_healthcare = models.IntegerField(default=1, help_text="Has healthcare coverage (0=No, 1=Yes)")
    no_doc_cost = models.IntegerField(default=0, help_text="Could not see doctor due to cost (0=No, 1=Yes)")
    gen_health = models.IntegerField(default=3, help_text="General health 1=Excellent to 5=Poor")
    ment_health = models.IntegerField(default=0, help_text="Mental health bad days (0-30)")
    phys_health = models.IntegerField(default=0, help_text="Physical health bad days (0-30)")
    diff_walk = models.IntegerField(default=0, help_text="Difficulty walking (0=No, 1=Yes)")
    sex = models.IntegerField(default=0, help_text="Sex (0=Female, 1=Male)")
    age_category = models.IntegerField(default=5, help_text="Age category 1=18-24 to 13=80+")
    education = models.IntegerField(default=4, help_text="Education level (1-6)")
    income = models.IntegerField(default=5, help_text="Income level (1-8)")

    # AI Results
    risk_score = models.FloatField()
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES)
    risk_factors = models.JSONField(default=list)
    model_confidence = models.FloatField(default=0.0)
    shap_values = models.JSONField(default=dict)
    model_breakdown = models.JSONField(default=dict)

    # Notes
    doctor_notes = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    assessed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-assessed_at"]

    def __str__(self):
        return f"Assessment for {self.patient.full_name} — {self.risk_level}"

    @property
    def risk_percentage(self):
        return round(self.risk_score * 100, 1)
