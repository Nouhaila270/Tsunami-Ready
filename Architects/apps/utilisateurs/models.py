from django.db import models

class Utilisateur(models.Model):
    telephone = models.CharField(max_length=20, blank=True, null=True)
    date_inscr = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.telephone or f"Utilisateur #{self.pk}"


class HistoriquePosition(models.Model):
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name="positions"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    en_evacuation = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.utilisateur_id} @ {self.timestamp:%Y-%m-%d %H:%M}"