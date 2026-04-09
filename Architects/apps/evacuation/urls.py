from django.urls import path
from . import views

app_name = "evacuation"

urlpatterns = [
    path("", views.evacuation_page, name="page"),
    path("calculate/", views.calculate_route, name="calculate"),
    path("gpx/<int:itineraire_id>/", views.download_gpx, name="download_gpx"),
]