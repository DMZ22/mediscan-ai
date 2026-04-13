from django.db import models
from django.conf import settings


class MedicineQuery(models.Model):
    QUERY_TYPES = [
        ("search", "Search"),
        ("detail", "Detail"),
        ("interaction", "Interaction"),
    ]

    query_type = models.CharField(max_length=15, choices=QUERY_TYPES)
    medicines = models.JSONField(default=list)
    result = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="medicine_queries"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_query_type_display()}: {', '.join(self.medicines[:3])}"
