"""
Password Reset & Change Password — users/password_reset.py
Uses Brevo HTTP API instead of SMTP (works on Render free tier)
"""
import os
import secrets
import logging
import requests as http_requests
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import CustomUser

logger = logging.getLogger(__name__)

_reset_tokens = {}


def _clean_expired_tokens():
    now = timezone.now()
    expired = [t for t, d in _reset_tokens.items() if now > d["expires"]]
    for t in expired:
        del _reset_tokens[t]


def send_reset_email_brevo(to_email: str, to_name: str, reset_link: str):
    """Send password reset email via Brevo HTTP API — works on all hosting."""
    api_key = os.getenv('BREVO_API_KEY', '')
    if not api_key:
        raise Exception('BREVO_API_KEY environment variable not set')

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#020b18;border-radius:16px;overflow:hidden;border:1px solid rgba(0,212,255,0.15);">
    <div style="padding:24px;border-bottom:1px solid rgba(0,212,255,0.1);">
      <h1 style="margin:0;color:#00d4ff;font-size:20px;">MediScan AI</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Clinical Intelligence Platform</p>
    </div>
    <div style="padding:28px;">
      <p style="color:#94a3b8;margin-top:0;">Hello <strong style="color:#e2e8f0;">{to_name}</strong>,</p>
      <p style="color:#94a3b8;">We received a request to reset your MediScan AI password.</p>
      <p style="color:#94a3b8;">Click the button below to set a new password. This link is valid for <strong style="color:#e2e8f0;">1 hour</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{reset_link}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00d4ff,#2563eb);color:#020b18;font-weight:bold;text-decoration:none;border-radius:12px;font-size:15px;">
          Reset Password
        </a>
      </div>
      <div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:8px;padding:12px;margin-top:16px;">
        <p style="color:#64748b;font-size:12px;margin:0;">Or copy this link:</p>
        <p style="color:#00d4ff;font-size:11px;word-break:break-all;margin:4px 0 0;">{reset_link}</p>
      </div>
      <p style="color:#334155;font-size:12px;margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(0,212,255,0.1);text-align:center;">
      <p style="color:#1e293b;font-size:11px;margin:0;">MediScan AI · Automated Security Alert · Do not reply</p>
    </div>
  </div>
</body>
</html>"""

    plain_text = (
        f"Hello {to_name},\n\n"
        f"Reset your MediScan AI password:\n{reset_link}\n\n"
        f"Link valid for 1 hour. If you didn't request this, ignore this email.\n\n"
        f"MediScan AI"
    )

    response = http_requests.post(
        'https://api.brevo.com/v3/smtp/email',
        headers={
            'api-key': api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        json={
            'sender': {'name': 'MediScan AI', 'email': os.getenv('SENDER_EMAIL', 'noreply@mediscan.ai')},
            'to': [{'email': to_email, 'name': to_name}],
            'subject': 'MediScan AI — Password Reset Request',
            'htmlContent': html_body,
            'textContent': plain_text,
        },
        timeout=15,
    )

    if response.status_code not in (200, 201):
        raise Exception(f'Brevo API error {response.status_code}: {response.text}')

    logger.info(f"Reset email sent to {to_email} via Brevo API")


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old = request.data.get("old_password", "")
        new = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")

        if not old or not new or not confirm:
            return Response({"error": "All fields are required."}, status=400)
        if not request.user.check_password(old):
            return Response({"error": "Current password is incorrect."}, status=400)
        if len(new) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=400)
        if new != confirm:
            return Response({"error": "Passwords do not match."}, status=400)
        if old == new:
            return Response({"error": "New password must be different from current password."}, status=400)

        request.user.set_password(new)
        request.user.save()
        return Response({"message": "Password changed successfully."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=400)

        _clean_expired_tokens()

        user = CustomUser.objects.filter(email__iexact=email).first()

        success_response = Response({
            "message": "If this email is registered, a reset link has been sent."
        })

        if not user or not user.is_active:
            return success_response

        token = secrets.token_urlsafe(32)
        _reset_tokens[token] = {
            "user_id": user.id,
            "expires": timezone.now() + timedelta(hours=1),
        }

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={token}"

        try:
            send_reset_email_brevo(user.email, user.display_name, reset_link)
        except Exception as e:
            logger.error(f"Failed to send reset email to {user.email}: {e}")
            return Response(
                {"error": f"Email failed: {str(e)}"},
                status=500
            )

        return success_response


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        new = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")

        if not token:
            return Response({"error": "Reset token is required."}, status=400)

        _clean_expired_tokens()

        if token not in _reset_tokens:
            return Response(
                {"error": "Invalid or expired reset link. Please request a new one."},
                status=400
            )

        token_data = _reset_tokens[token]

        if timezone.now() > token_data["expires"]:
            del _reset_tokens[token]
            return Response(
                {"error": "Reset link has expired. Please request a new one."},
                status=400
            )

        if not new or not confirm:
            return Response({"error": "Both password fields are required."}, status=400)
        if len(new) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=400)
        if new != confirm:
            return Response({"error": "Passwords do not match."}, status=400)

        try:
            user = CustomUser.objects.get(id=token_data["user_id"])
            user.set_password(new)
            user.save()
            del _reset_tokens[token]
            logger.info(f"Password reset successful for {user.username}")
            return Response({"message": "Password reset successfully. You can now sign in."})
        except CustomUser.DoesNotExist:
            return Response({"error": "User account not found."}, status=404)