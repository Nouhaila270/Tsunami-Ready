import hmac, hashlib, os
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from utilisateurs.views import require_role

@require_POST
def receive_seismic(request):
    data = request.POST
    signature = request.headers.get('X-HMAC-Signature', '')

    if not verify_hmac(data, signature):
        return JsonResponse({'error': 'Signature invalide'}, status=403)

    magnitude = float(data.get('magnitude', 0))
    if not (0 <= magnitude <= 10):
        return JsonResponse({'error': 'Magnitude invalide'}, status=400)

def verify_hmac(data, received_sig):
    secret = os.environ['SEISMIC_HMAC_SECRET'].encode()
    payload = f"{data['magnitude']}{data['latitude']}{data['longitude']}{data['timestamp']}"
    expected = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(received_sig, expected)