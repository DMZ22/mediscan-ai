from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Patient, Assessment
from .serializers import (
    PatientSerializer, PatientDetailSerializer,
    AssessmentSerializer, AssessmentCreateSerializer,
)
from ml_engine.predictor import predict_risk


class PatientListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["gender", "blood_group"]
    search_fields = ["first_name", "last_name", "contact", "email"]
    ordering_fields = ["created_at", "first_name", "last_name"]

    def get_queryset(self):
        return Patient.objects.select_related("created_by").prefetch_related("assessments")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PatientDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Patient.objects.prefetch_related("assessments__assessed_by")

    def get_serializer_class(self):
        if self.request.method == "GET":
            return PatientDetailSerializer
        return PatientSerializer


class AssessmentCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AssessmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Validate numeric ranges
        range_rules = {
            "bmi": (10, 98, "BMI must be between 10 and 98"),
            "gen_health": (1, 5, "General health must be between 1 and 5"),
            "ment_health": (0, 30, "Mental health days must be between 0 and 30"),
            "phys_health": (0, 30, "Physical health days must be between 0 and 30"),
            "age_category": (1, 13, "Age category must be between 1 and 13"),
            "education": (1, 6, "Education level must be between 1 and 6"),
            "income": (1, 8, "Income level must be between 1 and 8"),
        }
        errors = {}
        for field, (lo, hi, msg) in range_rules.items():
            val = data.get(field)
            if val is not None and not (lo <= val <= hi):
                errors[field] = msg
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        prediction = predict_risk({
            "high_bp": data.get("high_bp", 0),
            "high_chol": data.get("high_chol", 0),
            "chol_check": data.get("chol_check", 1),
            "bmi": data.get("bmi", 25),
            "smoker": data.get("smoker", 0),
            "stroke": data.get("stroke", 0),
            "heart_disease": data.get("heart_disease", 0),
            "phys_activity": data.get("phys_activity", 1),
            "fruits": data.get("fruits", 1),
            "veggies": data.get("veggies", 1),
            "heavy_alcohol": data.get("heavy_alcohol", 0),
            "any_healthcare": data.get("any_healthcare", 1),
            "no_doc_cost": data.get("no_doc_cost", 0),
            "gen_health": data.get("gen_health", 3),
            "ment_health": data.get("ment_health", 0),
            "phys_health": data.get("phys_health", 0),
            "diff_walk": data.get("diff_walk", 0),
            "sex": data.get("sex", 0),
            "age_category": data.get("age_category", 5),
            "education": data.get("education", 4),
            "income": data.get("income", 5),
        })

        assessment = Assessment.objects.create(
            **data,
            assessed_by=request.user,
            risk_score=prediction["risk_score"],
            risk_level=prediction["risk_level"],
            risk_factors=prediction["risk_factors"],
            model_confidence=prediction["confidence"],
            shap_values=prediction.get("shap_values", {}),
            model_breakdown=prediction.get("model_breakdown", {}),
            recommendations=prediction["recommendations"],
        )

        return Response(AssessmentSerializer(assessment).data, status=status.HTTP_201_CREATED)


class AssessmentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["patient", "risk_level"]
    ordering_fields = ["assessed_at", "risk_score"]

    def get_queryset(self):
        return Assessment.objects.select_related("patient", "assessed_by")


class AssessmentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentSerializer
    queryset = Assessment.objects.select_related("patient", "assessed_by")


class PatientAssessmentsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssessmentSerializer

    def get_queryset(self):
        return Assessment.objects.filter(
            patient_id=self.kwargs["patient_id"]
        ).select_related("assessed_by").order_by("-assessed_at")
