from rest_framework import serializers
from .models import Patient, Assessment


class AssessmentSerializer(serializers.ModelSerializer):
    risk_percentage = serializers.ReadOnlyField()
    assessed_by_name = serializers.CharField(source="assessed_by.full_name", read_only=True)

    class Meta:
        model = Assessment
        fields = [
            "id", "patient", "assessed_by", "assessed_by_name",
            "high_bp", "high_chol", "chol_check", "bmi", "smoker",
            "stroke", "heart_disease", "phys_activity", "fruits", "veggies",
            "heavy_alcohol", "any_healthcare", "no_doc_cost", "gen_health",
            "ment_health", "phys_health", "diff_walk", "sex", "age_category",
            "education", "income",
            "risk_score", "risk_level", "risk_factors", "model_confidence",
            "shap_values", "model_breakdown", "risk_percentage",
            "doctor_notes", "recommendations", "assessed_at",
        ]
        read_only_fields = ["id", "risk_score", "risk_level", "risk_factors",
                            "model_confidence", "shap_values", "model_breakdown",
                            "assessed_at", "assessed_by"]


class AssessmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = [
            "patient", "high_bp", "high_chol", "chol_check", "bmi", "smoker",
            "stroke", "heart_disease", "phys_activity", "fruits", "veggies",
            "heavy_alcohol", "any_healthcare", "no_doc_cost", "gen_health",
            "ment_health", "phys_health", "diff_walk", "sex", "age_category",
            "education", "income", "doctor_notes",
        ]


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    full_name = serializers.ReadOnlyField()
    latest_risk_level = serializers.SerializerMethodField()
    latest_risk_score = serializers.SerializerMethodField()
    assessment_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "first_name", "last_name", "full_name", "date_of_birth",
            "age", "gender", "blood_group", "contact", "email", "address",
            "medical_history", "allergies", "current_medications",
            "created_by", "created_by_name", "created_at", "updated_at",
            "latest_risk_level", "latest_risk_score", "assessment_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def get_latest_risk_level(self, obj):
        a = obj.latest_assessment
        return a.risk_level if a else None

    def get_latest_risk_score(self, obj):
        a = obj.latest_assessment
        return a.risk_percentage if a else None

    def get_assessment_count(self, obj):
        return obj.assessments.count()


class PatientDetailSerializer(PatientSerializer):
    assessments = AssessmentSerializer(many=True, read_only=True)

    class Meta(PatientSerializer.Meta):
        fields = PatientSerializer.Meta.fields + ["assessments"]
