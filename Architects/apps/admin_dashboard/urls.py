from django.urls import path
from . import views

app_name = "admin_dashboard"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
     path("add-refuge/", views.add_refuge, name="add-refuge"),
    path("add-sirene/", views.add_sirene, name="add-sirene"),

    path("delete-refuge/<int:refuge_id>/", views.delete_refuge, name="delete-refuge"),
    path("delete-sirene/<int:sirene_id>/", views.delete_sirene, name="delete-sirene"),

    path("edit-refuge/<int:refuge_id>/", views.edit_refuge, name="edit-refuge"),
    path("edit-sirene/<int:sirene_id>/", views.edit_sirene, name="edit-sirene"),

]