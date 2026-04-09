from django.urls import path
from . import views

app_name = "admin_dashboard"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("add-refuge/", views.add_refuge, name="add_refuge"),
    path("add-sirene/", views.add_sirene, name="add_sirene"),
    path("delete-refuge/<int:refuge_id>/", views.delete_refuge, name="delete_refuge"),
    path("delete-sirene/<int:sirene_id>/", views.delete_sirene, name="delete_sirene"),
    path("edit-refuge/<int:refuge_id>/", views.edit_refuge, name="edit_refuge"),
    path("edit-sirene/<int:sirene_id>/", views.edit_sirene, name="edit_sirene"),
]