from django.http import JsonResponse
from .models import Alerte, Sirene

def current_alert(request):
    alerte = Alerte.objects.order_by("-date").first()
    if not alerte:
        return JsonResponse({"has_alert": False})

    return JsonResponse({
        "has_alert": alerte.active,
        "id": alerte.id,
        "magnitude": alerte.magnitude,
        "epicentre": alerte.epicentre,
        "date": alerte.date.isoformat(),
    })

def sirens_status(request):
    data = list(Sirene.objects.values("id", "emplacement", "latitude", "longitude", "statut"))
    return JsonResponse({"sirens": data})