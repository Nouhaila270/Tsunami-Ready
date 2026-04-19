from django.http import JsonResponse
from apps.evacuation.models import Refuge

def refuges_geojson(request):
    features = []
    for refuge in Refuge.objects.all():
        features.append({
            "type": "Feature",
            "properties": {
                "id": refuge.id,
                "nom": refuge.nom,
                "altitude": refuge.altitude,
                "capacite_max": refuge.capacite_max,
            },
            "geometry": {
                "type": "Point",
                "coordinates": [float(refuge.longitude), float(refuge.latitude)]
            }
        })
    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })