from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "full_name", "role", "department", "is_active"]
    list_filter = ["role", "department", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("role", "phone", "department", "avatar")}),
    )
