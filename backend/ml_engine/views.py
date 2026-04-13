from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .predictor import get_model_info, predict_risk


class ModelInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_model_info())


class QuickPredictView(APIView):
    """Predict without saving — for frontend previews."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            result = predict_risk(request.data)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
