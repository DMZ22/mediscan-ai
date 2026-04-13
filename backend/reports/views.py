import base64
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import generics, status

from .models import LabReport
from .serializers import LabReportSerializer
from .reference_ranges import analyze_panel, get_panel_fields, REFERENCE_RANGES
from ai_engine.gemini_client import analyze_lab_values, _extract_lab_vision

logger = logging.getLogger(__name__)


class PanelListView(APIView):
    """List available lab test panels with their fields."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        panels = []
        for key, tests in REFERENCE_RANGES.items():
            panels.append({
                "key": key,
                "label": key.replace("_", " ").title(),
                "fields": get_panel_fields(key),
            })
        return Response({"panels": panels})


class ReportAnalyzeView(APIView):
    """Analyze manually entered lab values."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        panel_type = request.data.get("panel_type", "").strip()
        values = request.data.get("values", {})
        patient_id = request.data.get("patient_id")
        sex = request.data.get("sex", "male")

        if not panel_type or panel_type not in REFERENCE_RANGES:
            return Response(
                {"error": f"Invalid panel type. Choose from: {list(REFERENCE_RANGES.keys())}"},
                status=400,
            )
        if not values:
            return Response({"error": "Lab values are required."}, status=400)

        # Step 1: Rule-based flagging
        flagged = analyze_panel(panel_type, values, sex)

        # Step 2: AI interpretation
        try:
            ai_result = analyze_lab_values(panel_type, flagged)
        except Exception as e:
            logger.error(f"AI lab analysis failed: {e}")
            ai_result = {"summary": "AI analysis unavailable.", "findings": [], "concerns": [], "recommendations": ""}

        # Save report
        report = LabReport.objects.create(
            patient_id=patient_id if patient_id else None,
            report_type=panel_type,
            lab_values=flagged,
            analysis=ai_result,
            summary=ai_result.get("summary", ""),
            input_method="manual",
            created_by=request.user,
        )

        response_data = LabReportSerializer(report).data
        response_data["flagged_values"] = flagged
        response_data["ai_interpretation"] = ai_result
        return Response(response_data, status=status.HTTP_201_CREATED)


class ReportUploadView(APIView):
    """Upload a lab report image/PDF for AI extraction."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        patient_id = request.data.get("patient_id")

        if not file:
            return Response({"error": "File is required."}, status=400)

        # Read file bytes
        file_bytes = file.read()
        mime_type = file.content_type or "image/jpeg"

        # Extract values using Gemini Vision
        try:
            extraction = _extract_lab_vision(file_bytes, mime_type)
        except Exception as e:
            logger.error(f"Lab report extraction failed: {e}")
            return Response({"error": "Failed to extract values from report."}, status=500)

        if extraction.get("error"):
            return Response({"error": extraction["error"]}, status=500)

        extracted_values = extraction.get("values", {})
        panel_type = extraction.get("panel_type", "comprehensive")

        # AI interpretation of extracted values
        try:
            ai_result = analyze_lab_values(panel_type, extracted_values)
        except Exception:
            ai_result = {"summary": "AI analysis unavailable.", "findings": []}

        # Save with uploaded file
        file.seek(0)
        report = LabReport(
            patient_id=patient_id if patient_id else None,
            report_type=panel_type,
            lab_values=extracted_values,
            analysis=ai_result,
            summary=ai_result.get("summary", ""),
            input_method="upload",
            created_by=request.user,
        )
        report.uploaded_file.save(file.name, file, save=True)

        response_data = LabReportSerializer(report).data
        response_data["extraction"] = extraction
        response_data["ai_interpretation"] = ai_result
        return Response(response_data, status=status.HTTP_201_CREATED)


class ReportListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LabReportSerializer

    def get_queryset(self):
        return LabReport.objects.select_related("patient", "created_by")


class PatientReportsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LabReportSerializer

    def get_queryset(self):
        return LabReport.objects.filter(
            patient_id=self.kwargs["patient_id"]
        ).select_related("created_by").order_by("-created_at")
