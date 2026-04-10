from functools import wraps
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

def require_role(*allowed_roles):
    """Décorateur : vérifie que l'utilisateur a le bon rôle."""
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(request, *args, **kwargs):
            if request.user.role not in allowed_roles:
                return JsonResponse({'error': 'Permission insuffisante'}, status=403)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator