from django.db import models

class Alerte(models.Model):
    DECLENCHEMENT_CHOICES = [
        ("auto", "Automatique"),
        ("manuel", "Manuel"),
        ("exercice", "Exercice"),
    ]

    date = models.DateTimeField(auto_now_add=True)
    magnitude = models.FloatField()
    epicentre = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    en_mer = models.BooleanField(default=True)
    declenchement = models.CharField(max_length=20, choices=DECLENCHEMENT_CHOICES, default="auto")
    active = models.BooleanField(default=False)

    def __str__(self):
        return f"Alerte {self.id} - M{self.magnitude}"


class Sirene(models.Model):
    emplacement = models.CharField(max_length=255)
    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    statut = models.CharField(max_length=20, choices=[("actif", "Actif"), ("inactif", "Inactif")], default="inactif")

    def __str__(self):
        return f"{self.emplacement} ({self.statut})"


class SimulationAlerte(models.Model):
    magnitude = models.FloatField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    epicentre = models.CharField(max_length=255, default="Simulation")
    en_mer = models.BooleanField(default=True)
    traitee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Simulation M{self.magnitude} - traitée={self.traitee}"