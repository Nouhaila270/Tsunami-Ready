from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.conf import settings
from apps.utilisateurs.models import HistoriquePosition
from apps.alertes.models import Alerte, Sirene
from apps.evacuation.models import Refuge
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required


@login_required
def dashboard(request):
    positions = list(HistoriquePosition.objects.order_by("-timestamp").values(
        "id", "latitude", "longitude", "timestamp", "en_evacuation", "utilisateur_id"
    )[:500])

    refuges = list(Refuge.objects.values(
        "id", "nom", "latitude", "longitude", "altitude", "capacite_max"
    ))

    sirenes = list(Sirene.objects.values(
        "id", "emplacement", "latitude", "longitude", "statut"
    ))

    alertes = list(Alerte.objects.order_by("-date").values(
        "id", "magnitude", "epicentre", "date", "active", "declenchement"
    )[:20])

    return render(request, "admin/dashboard.html", {
        "google_maps_api_key": settings.GOOGLE_MAPS_API_KEY,
        "positions_json": positions,
        "refuges_json": refuges,
        "sirenes_json": sirenes,
        "alertes_json": alertes,
        "refuges": list(Refuge.objects.values()),
        "sirenes": list(Sirene.objects.values()),
    })



@login_required
@require_POST
def add_refuge(request):
    data = json.loads(request.body)
    refuge = Refuge.objects.create(
        nom=data["nom"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        altitude=data.get("altitude"),
        capacite_max=data.get("capacite_max"),
    )
    return JsonResponse({
        "id": refuge.id,
        "nom": refuge.nom,
        "latitude": float(refuge.latitude),
        "longitude": float(refuge.longitude),
        "altitude": float(refuge.altitude) if refuge.altitude else None,
        "capacite_max": refuge.capacite_max,
    })


@login_required
@require_POST
def add_sirene(request):
    data = json.loads(request.body)
    sirene = Sirene.objects.create(
        emplacement=data["emplacement"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        statut="inactif",
    )
    return JsonResponse({
        "id": sirene.id,
        "emplacement": sirene.emplacement,
        "latitude": float(sirene.latitude),
        "longitude": float(sirene.longitude),
        "statut": sirene.statut,
    })

@login_required
@require_POST
def delete_refuge(request, refuge_id):
    Refuge.objects.filter(id=refuge_id).delete()
    return JsonResponse({"success": True})

@login_required
@require_POST
def delete_sirene(request, sirene_id):
    Sirene.objects.filter(id=sirene_id).delete()
    return JsonResponse({"success": True})

@login_required
@require_POST
def edit_refuge(request, refuge_id):
    data = json.loads(request.body)
    Refuge.objects.filter(id=refuge_id).update(
        nom=data["nom"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        altitude=data.get("altitude"),
        capacite_max=data.get("capacite_max"),
    )
    return JsonResponse({"success": True})


@login_required
@require_POST
def edit_sirene(request, sirene_id):
    data = json.loads(request.body)
    Sirene.objects.filter(id=sirene_id).update(
        emplacement=data["emplacement"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        statut=data["statut"],
    )
    return JsonResponse({"success": True})
