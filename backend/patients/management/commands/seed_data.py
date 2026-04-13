"""
Seed database with realistic CDC-style sample data.
Run: python manage.py seed_data
"""
import random
from datetime import date
from django.core.management.base import BaseCommand
from users.models import CustomUser
from patients.models import Patient, Assessment
from ml_engine.predictor import predict_risk

PATIENTS = [
    ("Arjun",    "Sharma",  "M", "1985-04-12", "A+",  "9876543210", "Delhi"),
    ("Priya",    "Patel",   "F", "1990-08-22", "B+",  "9123456789", "Mumbai"),
    ("Rajesh",   "Kumar",   "M", "1962-12-05", "O+",  "9988776655", "Bangalore"),
    ("Sunita",   "Verma",   "F", "1975-03-18", "AB+", "9871234567", "Chennai"),
    ("Mohammed", "Ali",     "M", "1958-07-30", "B-",  "9765432109", "Hyderabad"),
    ("Ananya",   "Singh",   "F", "1995-01-14", "A-",  "9654321098", "Pune"),
    ("Vikram",   "Mehta",   "M", "1970-09-25", "O-",  "9543210987", "Kolkata"),
    ("Kavya",    "Reddy",   "F", "1988-05-07", "AB-", "9432109876", "Ahmedabad"),
    ("Suresh",   "Nair",    "M", "1950-11-19", "A+",  "9321098765", "Jaipur"),
    ("Deepika",  "Joshi",   "F", "1982-02-28", "B+",  "9210987654", "Lucknow"),
    ("Aditya",   "Gupta",   "M", "1978-06-15", "O+",  "9109876543", "Indore"),
    ("Meena",    "Iyer",    "F", "1965-09-03", "A-",  "9098765432", "Bhopal"),
]

AGE_CATEGORY_MAP = {
    (18, 24): 1, (25, 29): 2, (30, 34): 3, (35, 39): 4,
    (40, 44): 5, (45, 49): 6, (50, 54): 7, (55, 59): 8,
    (60, 64): 9, (65, 69): 10, (70, 74): 11, (75, 79): 12,
}


def age_to_category(age):
    for (low, high), cat in AGE_CATEGORY_MAP.items():
        if low <= age <= high:
            return cat
    return 13


class Command(BaseCommand):
    help = "Seed database with sample data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding MediScan database...")

        admin, created = CustomUser.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@mediscan.ai",
                "first_name": "Admin", "last_name": "User",
                "role": "admin", "department": "Administration",
                "is_staff": True, "is_superuser": True,
            }
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write("  Created admin (admin / admin123)")

        doctor, created = CustomUser.objects.get_or_create(
            username="doctor1",
            defaults={
                "email": "doctor@mediscan.ai",
                "first_name": "Dr. Ramesh", "last_name": "Gupta",
                "role": "doctor", "department": "Endocrinology",
            }
        )
        if created:
            doctor.set_password("doctor123")
            doctor.save()
            self.stdout.write("  Created doctor (doctor1 / doctor123)")

        for first, last, gender, dob, blood, phone, city in PATIENTS:
            patient, created = Patient.objects.get_or_create(
                first_name=first, last_name=last,
                defaults={
                    "date_of_birth": date.fromisoformat(dob),
                    "gender": gender, "blood_group": blood,
                    "contact": phone, "address": city,
                    "created_by": doctor,
                }
            )
            if created:
                age = (date.today() - date.fromisoformat(dob)).days // 365
                age_cat = age_to_category(age)
                for _ in range(random.randint(1, 3)):
                    vitals = {
                        "high_bp": random.randint(0, 1),
                        "high_chol": random.randint(0, 1),
                        "chol_check": 1,
                        "bmi": round(random.uniform(18, 48), 1),
                        "smoker": random.randint(0, 1),
                        "stroke": random.choices([0, 1], weights=[90, 10])[0],
                        "heart_disease": random.choices([0, 1], weights=[85, 15])[0],
                        "phys_activity": random.randint(0, 1),
                        "fruits": random.randint(0, 1),
                        "veggies": random.randint(0, 1),
                        "heavy_alcohol": random.choices([0, 1], weights=[90, 10])[0],
                        "any_healthcare": random.choices([0, 1], weights=[20, 80])[0],
                        "no_doc_cost": random.choices([0, 1], weights=[80, 20])[0],
                        "gen_health": random.randint(1, 5),
                        "ment_health": random.randint(0, 30),
                        "phys_health": random.randint(0, 30),
                        "diff_walk": random.choices([0, 1], weights=[80, 20])[0],
                        "sex": 1 if gender == "M" else 0,
                        "age_category": age_cat,
                        "education": random.randint(3, 6),
                        "income": random.randint(3, 8),
                    }
                    pred = predict_risk(vitals)
                    Assessment.objects.create(
                        patient=patient, assessed_by=doctor,
                        **vitals,
                        risk_score=pred["risk_score"],
                        risk_level=pred["risk_level"],
                        risk_factors=pred["risk_factors"],
                        model_confidence=pred["confidence"],
                        shap_values=pred.get("shap_values", {}),
                        model_breakdown=pred.get("model_breakdown", {}),
                        recommendations=pred["recommendations"],
                    )

        self.stdout.write(self.style.SUCCESS("\nDatabase seeded successfully!"))
        self.stdout.write("  admin   / admin123")
        self.stdout.write("  doctor1 / doctor123")
