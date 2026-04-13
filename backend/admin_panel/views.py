"""
Fixed admin_panel/views.py
Changes:
1. Filter out superusers from doctor list
2. Admin cannot delete other admins
3. Admin cannot toggle other admins
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
import csv
import io
from django.http import HttpResponse
from users.models import CustomUser
from patients.models import Patient, Assessment


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Exclude superusers from counts
        total_doctors = CustomUser.objects.filter(
            role='doctor', is_superuser=False
        ).count()
        active_doctors = CustomUser.objects.filter(
            role='doctor', is_active=True, is_superuser=False
        ).count()
        total_patients = Patient.objects.count()
        total_assessments = Assessment.objects.count()
        this_week = Assessment.objects.filter(assessed_at__gte=week_ago).count()
        this_month = Assessment.objects.filter(assessed_at__gte=month_ago).count()
        critical_count = Assessment.objects.filter(risk_level='critical').count()

        return Response({
            'doctors': {
                'total': total_doctors,
                'active': active_doctors,
                'inactive': total_doctors - active_doctors,
            },
            'patients': {'total': total_patients},
            'assessments': {
                'total': total_assessments,
                'this_week': this_week,
                'this_month': this_month,
                'critical': critical_count,
            },
        })


class AdminDoctorListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # Exclude superusers completely from the list
        doctors = CustomUser.objects.filter(
            role__in=['doctor', 'nurse', 'receptionist'],
            is_superuser=False,
        ).annotate(
            assessment_count=Count('assessments_done'),
            patient_count=Count('patients_created'),
            avg_risk=Avg('assessments_done__risk_score'),
        ).order_by('-assessment_count')

        data = []
        for d in doctors:
            last_assessment = Assessment.objects.filter(
                assessed_by=d
            ).order_by('-assessed_at').first()

            data.append({
                'id': d.id,
                'username': d.username,
                'full_name': d.full_name,
                'email': d.email,
                'role': d.role,
                'department': d.department,
                'phone': d.phone,
                'is_active': d.is_active,
                'date_joined': d.date_joined,
                'assessment_count': d.assessment_count,
                'patient_count': d.patient_count,
                'avg_risk_score': round((d.avg_risk or 0) * 100, 1),
                'last_activity': last_assessment.assessed_at if last_assessment else None,
            })

        return Response({'doctors': data, 'total': len(data)})


class AdminToggleDoctorView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, doctor_id):
        try:
            doctor = CustomUser.objects.get(id=doctor_id)

            # Block toggling admins, superusers, or self
            if doctor.is_superuser:
                return Response(
                    {'error': 'Cannot modify superuser accounts.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if doctor.role == 'admin':
                return Response(
                    {'error': 'Cannot deactivate other admin accounts.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if doctor.id == request.user.id:
                return Response(
                    {'error': 'Cannot deactivate your own account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            doctor.is_active = not doctor.is_active
            doctor.save()
            action = 'activated' if doctor.is_active else 'deactivated'
            return Response({
                'message': f'{doctor.full_name} {action} successfully.',
                'is_active': doctor.is_active,
            })
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class AdminDeleteDoctorView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, doctor_id):
        try:
            doctor = CustomUser.objects.get(id=doctor_id)

            # Block deleting admins, superusers, or self
            if doctor.is_superuser:
                return Response(
                    {'error': 'Cannot delete superuser accounts.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if doctor.role == 'admin':
                return Response(
                    {'error': 'Cannot delete other admin accounts.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if doctor.id == request.user.id:
                return Response(
                    {'error': 'Cannot delete your own account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            name = doctor.full_name
            doctor.delete()
            return Response({'message': f'{name} permanently deleted.'})
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)


class AdminDoctorDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, doctor_id):
        try:
            doctor = CustomUser.objects.get(id=doctor_id, is_superuser=False)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        assessments = Assessment.objects.filter(
            assessed_by=doctor
        ).select_related('patient').order_by('-assessed_at')[:20]

        return Response({
            'doctor': {
                'id': doctor.id,
                'full_name': doctor.full_name,
                'email': doctor.email,
                'role': doctor.role,
                'department': doctor.department,
                'is_active': doctor.is_active,
                'date_joined': doctor.date_joined,
            },
            'recent_assessments': [
                {
                    'id': a.id,
                    'patient_name': a.patient.full_name,
                    'risk_level': a.risk_level,
                    'risk_score': round(a.risk_score * 100, 1),
                    'assessed_at': a.assessed_at,
                }
                for a in assessments
            ]
        })


class AdminAllAssessmentsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        risk_filter = request.query_params.get('risk_level', '')
        doctor_filter = request.query_params.get('doctor_id', '')
        limit = int(request.query_params.get('limit', 50))

        qs = Assessment.objects.select_related(
            'patient', 'assessed_by'
        ).order_by('-assessed_at')

        if risk_filter:
            qs = qs.filter(risk_level=risk_filter)
        if doctor_filter:
            qs = qs.filter(assessed_by_id=doctor_filter)

        qs = qs[:limit]

        return Response({
            'assessments': [
                {
                    'id': a.id,
                    'patient_name': a.patient.full_name,
                    'patient_id': a.patient.id,
                    'doctor_name': a.assessed_by.full_name if a.assessed_by else 'Unknown',
                    'doctor_id': a.assessed_by.id if a.assessed_by else None,
                    'risk_level': a.risk_level,
                    'risk_score': round(a.risk_score * 100, 1),
                    'assessed_at': a.assessed_at,
                }
                for a in qs
            ]
        })


class AdminPatientListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        search = request.query_params.get('search', '')
        patients = Patient.objects.prefetch_related(
            'assessments'
        ).order_by('-created_at')

        if search:
            patients = patients.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )

        data = []
        for p in patients:
            latest = p.assessments.order_by('-assessed_at').first()
            data.append({
                'id': p.id,
                'full_name': p.full_name,
                'age': p.age,
                'gender': p.gender,
                'blood_group': p.blood_group,
                'contact': p.contact,
                'assessment_count': p.assessments.count(),
                'latest_risk': latest.risk_level if latest else None,
                'created_at': p.created_at,
                'created_by': p.created_by.full_name if p.created_by else 'Unknown',
            })

        return Response({'patients': data, 'total': len(data)})


class AdminDeletePatientView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, patient_id):
        try:
            patient = Patient.objects.get(id=patient_id)
            name = patient.full_name
            count = patient.assessments.count()
            patient.delete()
            return Response({
                'message': f'{name} and {count} assessments permanently deleted.'
            })
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found.'}, status=404)


class AdminExportCSVView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        export_type = request.query_params.get('type', 'assessments')
        output = io.StringIO()

        if export_type == 'patients':
            writer = csv.writer(output)
            writer.writerow([
                'ID', 'Name', 'Age', 'Gender', 'Blood Group',
                'Contact', 'Latest Risk', 'Assessment Count', 'Created'
            ])
            for p in Patient.objects.prefetch_related('assessments').all():
                latest = p.assessments.order_by('-assessed_at').first()
                writer.writerow([
                    p.id, p.full_name, p.age, p.gender, p.blood_group,
                    p.contact,
                    latest.risk_level if latest else 'N/A',
                    p.assessments.count(),
                    p.created_at.strftime('%Y-%m-%d'),
                ])
            filename = 'mediscan_patients.csv'
        else:
            writer = csv.writer(output)
            writer.writerow([
                'ID', 'Patient', 'Doctor', 'Risk Level', 'Risk Score %',
                'BMI', 'High BP', 'Gen Health', 'Age Category', 'Date'
            ])
            for a in Assessment.objects.select_related('patient', 'assessed_by').all():
                writer.writerow([
                    a.id,
                    a.patient.full_name,
                    a.assessed_by.full_name if a.assessed_by else 'Unknown',
                    a.risk_level,
                    round(a.risk_score * 100, 1),
                    a.bmi,
                    'Yes' if a.high_bp else 'No',
                    a.gen_health,
                    a.age_category,
                    a.assessed_at.strftime('%Y-%m-%d'),
                ])
            filename = 'mediscan_assessments.csv'

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response