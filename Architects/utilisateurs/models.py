from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from encrypted_model_fields.fields import EncryptedFloatField

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin',    'Administrateur'),
        ('operator', 'Opérateur'),
        ('citizen',  'Citoyen'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='citizen')

class LocalisationCitoyen(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Champs chiffrés automatiquement (AES-256)
    latitude   = EncryptedFloatField()
    longitude  = EncryptedFloatField()
    altitude_m = EncryptedFloatField(null=True, blank=True)

    horodatage = models.DateTimeField(auto_now_add=True)
