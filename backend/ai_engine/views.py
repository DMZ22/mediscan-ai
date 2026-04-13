import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .gemini_client import analyze_symptoms, health_chat, summarize_clinical_notes

logger = logging.getLogger(__name__)


class SymptomAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symptoms = request.data.get("symptoms", "").strip()
        if not symptoms:
            return Response({"error": "Symptoms text is required."}, status=400)

        patient_info = request.data.get("patient_info")
        try:
            result = analyze_symptoms(symptoms, patient_info)
            return Response(result)
        except Exception as e:
            logger.error(f"Symptom analysis error: {e}")
            return Response({"error": f"AI analysis failed: {str(e)}"}, status=500)


class HealthChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response({"error": "Message is required."}, status=400)

        history = request.data.get("history", [])
        try:
            reply = health_chat(message, history)
            return Response({"reply": reply})
        except Exception as e:
            logger.error(f"Health chat error: {e}")
            return Response({"error": f"AI chat failed: {str(e)}"}, status=500)


class NoteSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notes = request.data.get("notes", "").strip()
        if not notes:
            return Response({"error": "Clinical notes text is required."}, status=400)

        try:
            result = summarize_clinical_notes(notes)
            return Response(result)
        except Exception as e:
            logger.error(f"Note summary error: {e}")
            return Response({"error": f"AI summarization failed: {str(e)}"}, status=500)
