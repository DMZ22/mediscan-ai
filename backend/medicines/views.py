import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics

from .models import MedicineQuery
from .serializers import MedicineQuerySerializer
from .openfda import search_drug, get_drug_label, get_adverse_events
from ai_engine.gemini_client import analyze_drug, check_interactions

logger = logging.getLogger(__name__)


class MedicineSearchView(APIView):
    """Search for medicines by name."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response({"error": "Search query must be at least 2 characters."}, status=400)

        results = search_drug(query)

        MedicineQuery.objects.create(
            query_type="search",
            medicines=[query],
            result={"results": results, "count": len(results)},
            created_by=request.user,
        )
        return Response({"query": query, "results": results})


class MedicineDetailView(APIView):
    """Get detailed information about a specific drug."""
    permission_classes = [IsAuthenticated]

    def get(self, request, drug_name):
        # Get FDA data
        fda_data = get_drug_label(drug_name)
        adverse = get_adverse_events(drug_name)

        # Get AI-enhanced analysis
        try:
            ai_data = analyze_drug(drug_name, fda_data if fda_data else None)
        except Exception as e:
            logger.error(f"AI drug analysis failed: {e}")
            ai_data = {}

        result = {
            "fda_data": fda_data,
            "adverse_events": adverse,
            "ai_analysis": ai_data,
        }

        MedicineQuery.objects.create(
            query_type="detail",
            medicines=[drug_name],
            result=result,
            created_by=request.user,
        )
        return Response(result)


class InteractionCheckView(APIView):
    """Check drug-drug interactions."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        drug_list = request.data.get("drugs", [])
        if not drug_list or len(drug_list) < 2:
            return Response({"error": "At least 2 drugs are required."}, status=400)
        if len(drug_list) > 10:
            return Response({"error": "Maximum 10 drugs allowed."}, status=400)

        # Get AI interaction analysis
        try:
            result = check_interactions(drug_list)
        except Exception as e:
            logger.error(f"Interaction check failed: {e}")
            return Response({"error": "Interaction analysis failed. Please try again."}, status=500)

        MedicineQuery.objects.create(
            query_type="interaction",
            medicines=drug_list,
            result=result,
            created_by=request.user,
        )
        return Response(result)


class MedicineHistoryView(generics.ListAPIView):
    """Get past medicine queries for the current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = MedicineQuerySerializer

    def get_queryset(self):
        return MedicineQuery.objects.filter(created_by=self.request.user)[:50]
