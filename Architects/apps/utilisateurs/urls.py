from django.urls import path
from . import views

app_name = "utilisateurs"

urlpatterns = [
    path("", views.home, name="home"),
    path("prevention/", views.prevention, name="prevention"),
]