from django.urls import path
from . import views

app_name = "cartes"

urlpatterns = [
    path("refuges.geojson", views.refuges_geojson, name="refuges_geojson"),
]