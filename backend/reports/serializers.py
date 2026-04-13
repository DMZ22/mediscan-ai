from rest_framework import serializers
from .models import LabReport


class LabReportSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    report_type_display = serializers.CharField(source="get_report_type_display", read_only=True)

    class Meta:
        model = LabReport
        fields = "__all__"
        read_only_fields = ["analysis", "summary", "created_by", "created_at"]

    def get_patient_name(self, obj):
        return obj.patient.full_name if obj.patient else None
