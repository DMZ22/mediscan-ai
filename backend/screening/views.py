from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, status, filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import Screening
from .serializers import ScreeningSerializer, ScreeningCreateSerializer, DISEASE_INDICATORS
from patients.models import Patient
from ai_engine.gemini_client import screen_disease
from ml_engine.predictor import predict_risk


class DiseaseListView(APIView):
    """List available diseases with their indicator fields."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        diseases = []
        # Add diabetes (uses local ML model)
        diseases.append({
            "key": "diabetes",
            "label": "Diabetes",
            "icon": "activity",
            "description": "CDC Health Indicators — powered by local ML ensemble model",
            "ai_powered": False,
        })
        # Add Gemini-powered diseases
        for key, info in DISEASE_INDICATORS.items():
            diseases.append({
                "key": key,
                "label": info["label"],
                "icon": info["icon"],
                "fields": info["fields"],
                "description": f"{info['label']} risk screening — powered by AI",
                "ai_powered": True,
            })
        return Response({"diseases": diseases})


class ScreeningCreateView(APIView):
    """Run a disease risk screening."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ScreeningCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        disease_type = data["disease_type"]
        indicators = data["indicators"]

        try:
            patient = Patient.objects.get(id=data["patient"])
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found."}, status=404)

        # Route diabetes to local ML model
        if disease_type == "diabetes":
            return self._handle_diabetes(request, patient, indicators)

        # All other diseases use Gemini AI
        return self._handle_ai_screening(request, patient, disease_type, indicators)

    def _handle_diabetes(self, request, patient, indicators):
        """Use existing local ML model for diabetes prediction."""
        prediction = predict_risk(indicators)
        screening = Screening.objects.create(
            patient=patient,
            disease_type="diabetes",
            indicators=indicators,
            risk_score=round(prediction["risk_score"] * 100, 2),
            risk_level=prediction["risk_level"],
            risk_factors=prediction["risk_factors"],
            recommendations=prediction["recommendations"],
            ai_analysis=f"Local ML ensemble prediction. Confidence: {prediction['confidence']:.1%}",
            assessed_by=request.user,
        )
        return Response(ScreeningSerializer(screening).data, status=status.HTTP_201_CREATED)

    def _handle_ai_screening(self, request, patient, disease_type, indicators):
        """Use Gemini AI for disease risk screening."""
        label = dict(Screening._meta.get_field("disease_type").choices).get(disease_type, disease_type)

        result = screen_disease(label, indicators)

        if result.get("parse_error"):
            return Response({"error": "AI analysis failed. Please try again."}, status=500)

        screening = Screening.objects.create(
            patient=patient,
            disease_type=disease_type,
            indicators=indicators,
            risk_score=result.get("risk_score", 0),
            risk_level=result.get("risk_level", "low"),
            risk_factors=result.get("risk_factors", []),
            recommendations=result.get("recommendations", ""),
            ai_analysis=result.get("analysis", ""),
            assessed_by=request.user,
        )
        response_data = ScreeningSerializer(screening).data
        response_data["disclaimer"] = result.get("disclaimer", "")
        return Response(response_data, status=status.HTTP_201_CREATED)


class ScreeningListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ScreeningSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["disease_type", "risk_level", "patient"]
    ordering_fields = ["assessed_at", "risk_score"]

    def get_queryset(self):
        return Screening.objects.select_related("patient", "assessed_by")


class PatientScreeningsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ScreeningSerializer

    def get_queryset(self):
        return Screening.objects.filter(
            patient_id=self.kwargs["patient_id"]
        ).select_related("assessed_by").order_by("-assessed_at")
