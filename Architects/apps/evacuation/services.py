import requests
from math import radians, sin, cos, sqrt, atan2
from django.conf import settings
from apps.evacuation.models import Refuge

def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c

def select_best_refuge(user_lat, user_lon):
    refuges = Refuge.objects.filter(zone_hors_eau=True, altitude__gt=20).all()
    best = None
    best_distance = None

    for refuge in refuges:
        d = haversine_distance(user_lat, user_lon, refuge.latitude, refuge.longitude)
        if best is None or d < best_distance:
            best = refuge
            best_distance = d

    return best, best_distance

def build_gpx(points, name="Evacuation Route"):
    gpx_points = "\n".join(
        [f'<trkpt lat="{p["lat"]}" lon="{p["lng"]}"></trkpt>' for p in points]
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Agadir Tsunami Ready">
  <trk>
    <name>{name}</name>
    <trkseg>
      {gpx_points}
    </trkseg>
  </trk>
</gpx>"""

def get_google_directions(origin_lat, origin_lon, dest_lat, dest_lon):
    api_key = settings.GOOGLE_MAPS_API_KEY
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin_lat},{origin_lon}",
        "destination": f"{dest_lat},{dest_lon}",
        "mode": "walking",
        "key": api_key,
    }
    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    if data.get("status") != "OK":
        return None

    route = data["routes"][0]
    leg = route["legs"][0]

    points = []
    for step in leg["steps"]:
        points.append({
            "lat": step["start_location"]["lat"],
            "lng": step["start_location"]["lng"],
        })
    points.append({
        "lat": leg["end_location"]["lat"],
        "lng": leg["end_location"]["lng"],
    })

    return {
        "distance_m": leg["distance"]["value"],
        "duration_s": leg["duration"]["value"],
        "waypoints": points,
        "gpx": build_gpx(points),
    }