from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("doctor", "Doctor"),
        ("nurse", "Nurse"),
        ("receptionist", "Receptionist"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="doctor")
    phone = models.CharField(max_length=15, blank=True)
    department = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Make email unique — prevents duplicate email issues
    email = models.EmailField(unique=True, blank=False)

    class Meta:
        ordering = ["-date_joined"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    @property
    def full_name(self):
        name = self.get_full_name()
        return name if name.strip() else self.username

    @property
    def display_name(self):
        """Returns Dr. prefix for doctors."""
        name = self.full_name
        if self.role == "doctor":
            return f"Dr. {name}"
        return name

    @property
    def is_clinical_staff(self):
        """True for doctor and nurse roles."""
        return self.role in ("doctor", "nurse")