import json
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.conf import settings
from apps.utilisateurs.models import Utilisateur, HistoriquePosition
from .models import Itineraire
from .services import select_best_refuge, get_google_directions

def evacuation_page(request):
    return render(request, "utilisateur/evacuation.html", {
        "google_maps_api_key": settings.GOOGLE_MAPS_API_KEY
    })

def calculate_route(request):
    if request.method != "POST":
        return JsonResponse({"error": "Méthode non autorisée"}, status=405)

    try:
        data = json.loads(request.body)
        lat = float(data["latitude"])
        lon = float(data["longitude"])
        telephone = data.get("telephone", "")
    except Exception:
        return JsonResponse({"error": "Données invalides"}, status=400)

    utilisateur, _ = Utilisateur.objects.get_or_create(telephone=telephone or None)

    HistoriquePosition.objects.create(
        utilisateur=utilisateur,
        latitude=lat,
        longitude=lon,
        en_evacuation=True
    )

    refuge, fallback_distance = select_best_refuge(lat, lon)
    if not refuge:
        return JsonResponse({"error": "Aucun refuge trouvé"}, status=404)

    directions = get_google_directions(lat, lon, refuge.latitude, refuge.longitude)
    if not directions:
        return JsonResponse({"error": "Impossible de calculer l'itinéraire Google"}, status=500)

    itineraire = Itineraire.objects.create(
        utilisateur=utilisateur,
        refuge=refuge,
        distance=directions["distance_m"],
        temps_estime=directions["duration_s"],
        waypoints=directions["waypoints"],
        fichier_gpx=directions["gpx"],
    )
    google_maps_url = (
    f"https://www.google.com/maps/dir/?api=1"
    f"&origin={lat},{lon}"
    f"&destination={refuge.latitude},{refuge.longitude}"
    f"&travelmode=walking"
)
    

    return JsonResponse({
        "itineraire_id": itineraire.id,
        "refuge": {
            "nom": refuge.nom,
            "latitude": refuge.latitude,
            "longitude": refuge.longitude,
            "altitude": refuge.altitude,
            "capacite_max": refuge.capacite_max,
        },
        "distance_m": directions["distance_m"],
        "duration_s": directions["duration_s"],
        "waypoints": directions["waypoints"],
        "gpx_download_url": f"/evacuation/gpx/{itineraire.id}/",
        "google_maps_url": google_maps_url,
    })

def download_gpx(request, itineraire_id):
    itineraire = Itineraire.objects.get(id=itineraire_id)
    response = HttpResponse(itineraire.fichier_gpx, content_type="application/gpx+xml")
    response["Content-Disposition"] = f'attachment; filename="itineraire_{itineraire.id}.gpx"'
    return response