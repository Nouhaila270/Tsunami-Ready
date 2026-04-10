from django.http import JsonResponse
from utilisateurs.views import require_role

BOUNDS = { 'lat': (29.0, 31.5), 'lon': (-10.0, -7.5) }

def validate_gps(lat, lon):
    if not (BOUNDS['lat'][0] <= lat <= BOUNDS['lat'][1]):
        raise ValueError(f'Latitude invalide: {lat}')
    if not (BOUNDS['lon'][0] <= lon <= BOUNDS['lon'][1]):
        raise ValueError(f'Longitude invalide: {lon}')

@require_role('admin', 'operator', 'citizen')
def get_evacuation_route(request):
    lat = float(request.GET.get('lat'))
    lon = float(request.GET.get('lon'))
    validate_gps(lat, lon)

    routes = EvacuationRoute.objects.filter(active=True).order_by('estimated_time_min')[:3]
    return JsonResponse({'routes': list(routes.values())})