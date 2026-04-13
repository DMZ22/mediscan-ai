from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, RegisterView, ProfileView, UserListView
from .password_reset import PasswordResetRequestView, PasswordResetConfirmView, ChangePasswordView

urlpatterns = [
    path("login/", LoginView.as_view()),
    path("register/", RegisterView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("profile/", ProfileView.as_view()),
    path("users/", UserListView.as_view()),
    path("password/change/", ChangePasswordView.as_view()),
    path("password/reset/", PasswordResetRequestView.as_view()),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view()),
]
