from rest_framework import serializers
from .models import Screening, DISEASE_CHOICES


class ScreeningSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    assessed_by_name = serializers.CharField(source="assessed_by.get_full_name", read_only=True)
    disease_display = serializers.CharField(source="get_disease_type_display", read_only=True)

    class Meta:
        model = Screening
        fields = "__all__"
        read_only_fields = [
            "risk_score", "risk_level", "risk_factors",
            "recommendations", "ai_analysis", "assessed_by", "assessed_at",
        ]


class ScreeningCreateSerializer(serializers.Serializer):
    patient = serializers.IntegerField()
    disease_type = serializers.ChoiceField(choices=DISEASE_CHOICES)
    indicators = serializers.DictField()


DISEASE_INDICATORS = {
    "heart_disease": {
        "label": "Heart Disease",
        "icon": "heart",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "sex", "label": "Sex", "type": "select", "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}]},
            {"key": "chest_pain", "label": "Chest Pain Type", "type": "select", "options": [{"value": "none", "label": "None"}, {"value": "typical_angina", "label": "Typical Angina"}, {"value": "atypical_angina", "label": "Atypical Angina"}, {"value": "non_anginal", "label": "Non-Anginal Pain"}]},
            {"key": "blood_pressure", "label": "Resting Blood Pressure (mmHg)", "type": "number", "min": 60, "max": 250},
            {"key": "cholesterol", "label": "Total Cholesterol (mg/dL)", "type": "number", "min": 100, "max": 600},
            {"key": "fasting_sugar", "label": "Fasting Blood Sugar > 120 mg/dL", "type": "toggle"},
            {"key": "smoking", "label": "Current Smoker", "type": "toggle"},
            {"key": "diabetes", "label": "Has Diabetes", "type": "toggle"},
            {"key": "family_history", "label": "Family History of Heart Disease", "type": "toggle"},
            {"key": "bmi", "label": "BMI", "type": "number", "min": 10, "max": 60},
            {"key": "exercise", "label": "Regular Exercise (150+ min/week)", "type": "toggle"},
        ],
    },
    "stroke": {
        "label": "Stroke",
        "icon": "brain",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "sex", "label": "Sex", "type": "select", "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}]},
            {"key": "hypertension", "label": "Has Hypertension", "type": "toggle"},
            {"key": "heart_disease", "label": "Has Heart Disease", "type": "toggle"},
            {"key": "avg_glucose", "label": "Average Glucose Level (mg/dL)", "type": "number", "min": 50, "max": 400},
            {"key": "bmi", "label": "BMI", "type": "number", "min": 10, "max": 60},
            {"key": "smoking", "label": "Smoking Status", "type": "select", "options": [{"value": "never", "label": "Never"}, {"value": "formerly", "label": "Formerly"}, {"value": "currently", "label": "Currently"}]},
            {"key": "atrial_fibrillation", "label": "Atrial Fibrillation", "type": "toggle"},
            {"key": "diabetes", "label": "Has Diabetes", "type": "toggle"},
            {"key": "physical_activity", "label": "Regular Physical Activity", "type": "toggle"},
        ],
    },
    "kidney_disease": {
        "label": "Kidney Disease",
        "icon": "droplets",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "blood_pressure", "label": "Blood Pressure (mmHg)", "type": "number", "min": 60, "max": 250},
            {"key": "diabetes", "label": "Has Diabetes", "type": "toggle"},
            {"key": "family_history", "label": "Family History of Kidney Disease", "type": "toggle"},
            {"key": "protein_urine", "label": "Protein in Urine", "type": "select", "options": [{"value": "none", "label": "None"}, {"value": "trace", "label": "Trace"}, {"value": "moderate", "label": "Moderate"}, {"value": "high", "label": "High"}]},
            {"key": "creatinine", "label": "Serum Creatinine (mg/dL)", "type": "number", "min": 0.1, "max": 15},
            {"key": "hemoglobin", "label": "Hemoglobin (g/dL)", "type": "number", "min": 3, "max": 20},
            {"key": "smoking", "label": "Current Smoker", "type": "toggle"},
            {"key": "obesity", "label": "Obese (BMI > 30)", "type": "toggle"},
            {"key": "nsaid_use", "label": "Regular NSAID Use", "type": "toggle"},
        ],
    },
    "liver_disease": {
        "label": "Liver Disease",
        "icon": "scan",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "sex", "label": "Sex", "type": "select", "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}]},
            {"key": "alcohol_use", "label": "Alcohol Consumption", "type": "select", "options": [{"value": "none", "label": "None"}, {"value": "moderate", "label": "Moderate"}, {"value": "heavy", "label": "Heavy"}]},
            {"key": "bmi", "label": "BMI", "type": "number", "min": 10, "max": 60},
            {"key": "diabetes", "label": "Has Diabetes", "type": "toggle"},
            {"key": "hepatitis_exposure", "label": "Hepatitis B/C Exposure", "type": "toggle"},
            {"key": "fatigue", "label": "Chronic Fatigue", "type": "toggle"},
            {"key": "jaundice", "label": "Jaundice (Yellow Skin/Eyes)", "type": "toggle"},
            {"key": "abdominal_pain", "label": "Upper Right Abdominal Pain", "type": "toggle"},
            {"key": "medications", "label": "Taking Hepatotoxic Medications", "type": "toggle"},
        ],
    },
    "lung_disease": {
        "label": "Lung Disease",
        "icon": "wind",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "smoking_history", "label": "Smoking History", "type": "select", "options": [{"value": "never", "label": "Never Smoked"}, {"value": "former", "label": "Former Smoker"}, {"value": "current_light", "label": "Current Light Smoker"}, {"value": "current_heavy", "label": "Current Heavy Smoker"}]},
            {"key": "chronic_cough", "label": "Chronic Cough (>3 weeks)", "type": "toggle"},
            {"key": "shortness_of_breath", "label": "Shortness of Breath", "type": "toggle"},
            {"key": "wheezing", "label": "Wheezing", "type": "toggle"},
            {"key": "chest_tightness", "label": "Chest Tightness", "type": "toggle"},
            {"key": "pollution_exposure", "label": "High Pollution/Dust Exposure", "type": "toggle"},
            {"key": "family_history", "label": "Family History of Lung Disease", "type": "toggle"},
            {"key": "asthma", "label": "Has Asthma", "type": "toggle"},
            {"key": "occupational_hazard", "label": "Occupational Chemical/Dust Exposure", "type": "toggle"},
        ],
    },
    "thyroid": {
        "label": "Thyroid Disorder",
        "icon": "thermometer",
        "fields": [
            {"key": "age", "label": "Age", "type": "number", "min": 1, "max": 120},
            {"key": "sex", "label": "Sex", "type": "select", "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}]},
            {"key": "weight_change", "label": "Unexplained Weight Change", "type": "select", "options": [{"value": "none", "label": "None"}, {"value": "gain", "label": "Weight Gain"}, {"value": "loss", "label": "Weight Loss"}]},
            {"key": "fatigue", "label": "Persistent Fatigue", "type": "toggle"},
            {"key": "heart_rate", "label": "Heart Rate Issues", "type": "select", "options": [{"value": "normal", "label": "Normal"}, {"value": "fast", "label": "Unusually Fast"}, {"value": "slow", "label": "Unusually Slow"}]},
            {"key": "temperature_sensitivity", "label": "Temperature Sensitivity", "type": "select", "options": [{"value": "none", "label": "None"}, {"value": "cold", "label": "Cold Intolerance"}, {"value": "heat", "label": "Heat Intolerance"}]},
            {"key": "hair_loss", "label": "Hair Loss/Thinning", "type": "toggle"},
            {"key": "neck_swelling", "label": "Neck Swelling/Goiter", "type": "toggle"},
            {"key": "family_history", "label": "Family History of Thyroid Disease", "type": "toggle"},
            {"key": "mood_changes", "label": "Mood Changes (Anxiety/Depression)", "type": "toggle"},
        ],
    },
}
