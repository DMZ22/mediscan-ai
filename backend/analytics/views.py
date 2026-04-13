from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta
from patients.models import Patient, Assessment
from ml_engine.predictor import get_model_info


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)

        total_patients = Patient.objects.count()
        total_assessments = Assessment.objects.count()
        today_assessments = Assessment.objects.filter(assessed_at__date=today).count()
        today_patients = Patient.objects.filter(created_at__date=today).count()
        high_risk_count = Assessment.objects.filter(
            risk_level__in=["high", "critical"]
        ).values("patient").distinct().count()

        avg_stats = Assessment.objects.aggregate(
            avg_bmi=Avg("bmi"),
            avg_risk_score=Avg("risk_score"),
        )

        week_trend = (
            Assessment.objects
            .filter(assessed_at__gte=week_ago)
            .annotate(date=TruncDate("assessed_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        risk_dist = (
            Assessment.objects
            .values("risk_level")
            .annotate(count=Count("id"))
        )

        return Response({
            "totals": {
                "patients": total_patients,
                "assessments": total_assessments,
                "high_risk_patients": high_risk_count,
                "today_assessments": today_assessments,
                "today_new_patients": today_patients,
            },
            "risk_distribution": list(risk_dist),
            "averages": {
                "bmi": round(avg_stats["avg_bmi"] or 0, 1),
                "risk_score": round((avg_stats["avg_risk_score"] or 0) * 100, 1),
            },
            "week_trend": [
                {"date": str(item["date"]), "count": item["count"]}
                for item in week_trend
            ],
        })


class RiskDistributionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total = Assessment.objects.count()
        if total == 0:
            return Response({"data": [], "total": 0})

        distribution = Assessment.objects.values("risk_level").annotate(count=Count("id"))
        colors = {"low": "#00ff88", "medium": "#ffb800", "high": "#ff4757", "critical": "#9d4edd"}

        data = [
            {
                "level": item["risk_level"],
                "count": item["count"],
                "percentage": round((item["count"] / total) * 100, 1),
                "color": colors.get(item["risk_level"], "#64748b"),
            }
            for item in distribution
        ]
        return Response({"data": data, "total": total})


class TrendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        months = int(request.query_params.get("months", 6))
        since = timezone.now() - timedelta(days=30 * months)

        monthly = (
            Assessment.objects
            .filter(assessed_at__gte=since)
            .annotate(month=TruncMonth("assessed_at"))
            .values("month")
            .annotate(
                total=Count("id"),
                high_risk=Count("id", filter=Q(risk_level__in=["high", "critical"])),
                avg_bmi=Avg("bmi"),
                avg_risk=Avg("risk_score"),
            )
            .order_by("month")
        )

        return Response({
            "monthly_data": [
                {
                    "month": item["month"].strftime("%b %Y"),
                    "total_assessments": item["total"],
                    "high_risk_count": item["high_risk"],
                    "avg_bmi": round(item["avg_bmi"] or 0, 1),
                    "avg_risk_score": round((item["avg_risk"] or 0) * 100, 1),
                }
                for item in monthly
            ]
        })


class AgeGroupAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assessments = Assessment.objects.all()
        age_groups = {
            "18-30": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "31-45": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "46-60": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            "60+":   {"low": 0, "medium": 0, "high": 0, "critical": 0},
        }
        for a in assessments:
            cat = a.age_category
            level = a.risk_level
            if cat <= 3:
                age_groups["18-30"][level] += 1
            elif cat <= 6:
                age_groups["31-45"][level] += 1
            elif cat <= 9:
                age_groups["46-60"][level] += 1
            else:
                age_groups["60+"][level] += 1

        return Response({
            "age_groups": [{"group": g, **c} for g, c in age_groups.items()]
        })


class RecentActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        recent = Assessment.objects.select_related(
            "patient", "assessed_by"
        ).order_by("-assessed_at")[:limit]

        return Response({
            "recent_assessments": [
                {
                    "id": a.id,
                    "patient_name": a.patient.full_name,
                    "patient_id": a.patient.id,
                    "risk_level": a.risk_level,
                    "risk_score": a.risk_percentage,
                    "assessed_by": a.assessed_by.full_name if a.assessed_by else "System",
                    "assessed_at": a.assessed_at,
                    "bmi": a.bmi,
                    "gen_health": a.gen_health,
                    "high_bp": a.high_bp,
                    "model_confidence": round(a.model_confidence * 100, 1),
                }
                for a in recent
            ]
        })


class ModelInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_model_info())