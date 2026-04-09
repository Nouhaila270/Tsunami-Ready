from django.urls import path
from . import views

app_name = "alertes"

urlpatterns = [
    path("current/", views.current_alert, name="current_alert"),
    path("sirens/", views.sirens_status, name="sirens_status"),
]