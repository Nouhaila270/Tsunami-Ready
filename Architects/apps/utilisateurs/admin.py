from django.contrib import admin
from .models import Utilisateur, HistoriquePosition

@admin.register(Utilisateur)
class UtilisateurAdmin(admin.ModelAdmin):
    list_display = ("id", "telephone", "date_inscr")
    search_fields = ("telephone",)

@admin.register(HistoriquePosition)
class HistoriquePositionAdmin(admin.ModelAdmin):
    list_display = ("id", "utilisateur", "latitude", "longitude", "timestamp", "en_evacuation")
    list_filter = ("en_evacuation", "timestamp")