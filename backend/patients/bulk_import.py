"""
Bulk patient import via CSV upload.
POST /api/patients/bulk-import/ with a CSV file.

CSV format:
first_name,last_name,date_of_birth,gender,blood_group,contact,email,address
John,Doe,1985-06-15,M,A+,9876543210,john@example.com,Mumbai
"""
import csv
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework import status
from patients.models import Patient


class BulkImportPatientsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded.'}, status=400)

        if not file.name.endswith('.csv'):
            return Response({'error': 'Only CSV files are supported.'}, status=400)

        content = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))

        created = []
        errors = []
        skipped = 0

        REQUIRED = ['first_name', 'last_name', 'date_of_birth', 'gender']

        for i, row in enumerate(reader, start=2):
            row = {k.strip().lower(): v.strip() for k, v in row.items()}

            # Validate required fields
            missing = [f for f in REQUIRED if not row.get(f)]
            if missing:
                errors.append({'row': i, 'error': f'Missing: {", ".join(missing)}', 'data': row})
                continue

            # Validate gender
            gender = row['gender'].upper()
            if gender not in ['M', 'F', 'O']:
                errors.append({'row': i, 'error': f'Invalid gender: {row["gender"]} (use M/F/O)', 'data': row})
                continue

            # Validate date format
            try:
                from datetime import date
                date.fromisoformat(row['date_of_birth'])
            except ValueError:
                errors.append({'row': i, 'error': f'Invalid date: {row["date_of_birth"]} (use YYYY-MM-DD)', 'data': row})
                continue

            # Skip if patient already exists
            if Patient.objects.filter(
                first_name=row['first_name'],
                last_name=row['last_name'],
                date_of_birth=row['date_of_birth']
            ).exists():
                skipped += 1
                continue

            # Create patient
            try:
                patient = Patient.objects.create(
                    first_name=row['first_name'],
                    last_name=row['last_name'],
                    date_of_birth=row['date_of_birth'],
                    gender=gender,
                    blood_group=row.get('blood_group', ''),
                    contact=row.get('contact', ''),
                    email=row.get('email', ''),
                    address=row.get('address', ''),
                    medical_history=row.get('medical_history', ''),
                    created_by=request.user,
                )
                created.append({'id': patient.id, 'name': patient.full_name})
            except Exception as e:
                errors.append({'row': i, 'error': str(e), 'data': row})

        return Response({
            'message': f'Import complete. {len(created)} created, {skipped} skipped, {len(errors)} errors.',
            'created_count': len(created),
            'skipped_count': skipped,
            'error_count': len(errors),
            'created': created[:10],
            'errors': errors[:10],
        }, status=status.HTTP_200_OK)


class BulkImportTemplateView(APIView):
    """Download CSV template for bulk import."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.http import HttpResponse
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'first_name', 'last_name', 'date_of_birth', 'gender',
            'blood_group', 'contact', 'email', 'address', 'medical_history'
        ])
        # Sample rows
        writer.writerow(['Rahul', 'Sharma', '1985-06-15', 'M', 'A+', '9876543210', 'rahul@example.com', 'Mumbai', ''])
        writer.writerow(['Priya', 'Patel', '1990-03-22', 'F', 'B+', '9123456789', 'priya@example.com', 'Delhi', 'Hypertension'])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="patient_import_template.csv"'
        return response
