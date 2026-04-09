from django.db import models
from apps.utilisateurs.models import Utilisateur

class Refuge(models.Model):
    nom = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField()
    capacite_max = models.PositiveIntegerField(default=0)
    zone_hors_eau = models.BooleanField(default=True)

    def __str__(self):
        return self.nom


class Itineraire(models.Model):
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name="itineraires")
    refuge = models.ForeignKey(Refuge, on_delete=models.CASCADE, related_name="itineraires")
    date_calcul = models.DateTimeField(auto_now_add=True)
    distance = models.FloatField(help_text="Distance en mètres")
    temps_estime = models.PositiveIntegerField(help_text="Temps en secondes")
    waypoints = models.JSONField(default=list, blank=True)
    fichier_gpx = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Itinéraire {self.id} -> Refuge {self.refuge.nom}"