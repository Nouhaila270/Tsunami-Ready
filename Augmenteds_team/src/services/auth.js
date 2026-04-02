/**
 * src/services/auth.js
 * ✅ Guard login
 * ✅ Widget utilisateur
 * ✅ GPS watch + envoi position serveur
 * ✅ Route d'évacuation perso
 * ✅ Contrôle hors zone Agadir
 * ✅ Compatible avec map.js / state.js
 */

const Auth = (() => {

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('tsunami_user') || 'null');
    } catch (_) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem('tsunami_token') || null;
  }

  function guard() {
    if (!getToken()) {
      window.location.href = 'login.html';
      return false;
    }

    const user = getUser();
    if (user && typeof Store !== 'undefined') {
      Store.setCurrentUser(user);
    }

    return true;
  }

  function logout() {
    const token = getToken();

    if (token) {
      fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }).catch(() => {});
    }

    localStorage.removeItem('tsunami_token');
    localStorage.removeItem('tsunami_user');
    window.location.href = 'login.html';
  }

  function renderUserWidget() {
    const user = getUser();
    if (!user) return;

    const roleMap = {
      citizen: { label: 'Citoyen', color: '#00b0ff', icon: '👤' },
      admin:   { label: 'Administrateur', color: '#ffab00', icon: '🛡' }
    };

    const role = roleMap[user.role] || roleMap.citizen;

    const old = document.getElementById('user-widget');
    if (old) old.remove();

    const widget = document.createElement('div');
    widget.id = 'user-widget';
    widget.style.cssText = [
      'margin:12px 0 0 0',
      'padding:12px 14px',
      'background:rgba(0,176,255,.07)',
      'border:1px solid rgba(0,176,255,.15)',
      'border-radius:12px',
      'font-family:\'Barlow Condensed\',sans-serif'
    ].join(';');

    widget.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:22px">${role.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#e8f4f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${_esc(user.name || user.full_name || user.email || '—')}
          </div>
          <div style="font-size:10px;font-family:'DM Mono',monospace;color:${role.color};letter-spacing:1px">
            ${role.label.toUpperCase()}
          </div>
        </div>
        <button onclick="Auth.logout()" title="Déconnexion"
          style="background:rgba(255,23,68,.12);border:1px solid rgba(255,23,68,.25);
                 color:#ff6b6b;border-radius:6px;padding:4px 8px;cursor:pointer;
                 font-size:11px;font-family:'DM Mono',monospace">⏻</button>
      </div>

      <div id="user-gps-status"
        style="font-size:10px;font-family:'DM Mono',monospace;color:#6ea8c0">
        📍 Localisation en cours…
      </div>

      <div id="user-route-info"
        style="display:none;margin-top:6px;font-size:11px;font-family:'DM Mono',monospace;
               color:#e8f4f8;background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.2);
               border-radius:6px;padding:6px 10px;line-height:1.5">
      </div>
    `;

    const sidebar = document.getElementById('sidebar');
    const sysStatus = sidebar && sidebar.querySelector('.sys-status');

    if (sysStatus) sysStatus.parentNode.insertBefore(widget, sysStatus.nextSibling);
    else if (sidebar) sidebar.appendChild(widget);
  }

  function isInAgadirServiceArea(lat, lng) {
    if (typeof EvacAlgo === 'undefined') return true;

    const AGADIR_CENTER = { lat: 30.4250, lng: -9.6000 };
    const d = EvacAlgo.haversine(lat, lng, AGADIR_CENTER.lat, AGADIR_CENTER.lng);

    return d <= 100;
  }

  function buildWaypoints(lat, lng, best) {
    if (!best) return [];

    // Si l'algo fournit déjà des waypoints
    if (Array.isArray(best.waypoints) && best.waypoints.length >= 2) {
      return best.waypoints;
    }

    // Si l'algo fournit path
    if (Array.isArray(best.path) && best.path.length >= 2) {
      return best.path;
    }

    // Fallback : ligne simple utilisateur -> point refuge
    if (typeof best.lat === 'number' && typeof best.lng === 'number') {
      return [
        [lat, lng],
        [best.lat, best.lng]
      ];
    }

    return [];
  }

  function injectPersonalRouteToMap(lat, lng, computedRoute) {
    if (typeof Store === 'undefined') return;

    const best = computedRoute.best;
    const waypoints = buildWaypoints(lat, lng, best);

    const personalRoute = {
      id: 'ME',
      route: {
        best: best,
        waypoints: waypoints,
        flood_risk_at_origin: computedRoute.flood_risk_at_origin || 0
      }
    };

    // On garde les routes existantes calculées pour les citoyens,
    // mais on ajoute/remplace la route perso au début.
    const currentRoutes = Array.isArray(Store.get().routes) ? Store.get().routes : [];
    const otherRoutes = currentRoutes.filter(r => r && r.id !== 'ME');
    const nextRoutes = [personalRoute, ...otherRoutes];

    Store.get().routes = nextRoutes;

    if (typeof MapComp !== 'undefined') {
      MapComp.updateCitizens(Store.get().citizens || [], nextRoutes);
    }
  }

  function clearPersonalRouteFromMap() {
    if (typeof Store === 'undefined') return;

    const currentRoutes = Array.isArray(Store.get().routes) ? Store.get().routes : [];
    const nextRoutes = currentRoutes.filter(r => r && r.id !== 'ME');

    Store.get().routes = nextRoutes;

    if (typeof MapComp !== 'undefined') {
      MapComp.updateCitizens(Store.get().citizens || [], nextRoutes);
    }
  }

  function _updateRouteInfo(lat, lng) {
    if (typeof EvacAlgo === 'undefined') return;

    const el = document.getElementById('user-route-info');
    if (!el) return;

    if (!isInAgadirServiceArea(lat, lng)) {
      el.style.display = 'block';
      el.style.borderColor = 'rgba(255,171,0,.4)';
      el.innerHTML = `
        📍 <strong>Hors zone couverte</strong><br>
        Ce système calcule les routes d'évacuation pour <strong>Agadir côte</strong> uniquement.
      `;
      clearPersonalRouteFromMap();
      return;
    }

    try {
      const computedRoute = EvacAlgo.computeRoutes({
        id: 'ME',
        latitude: lat,
        longitude: lng,
        speed_kmh: 3
      });

      const best = computedRoute.best;
      const risk = computedRoute.flood_risk_at_origin || 0;
      const riskLabel = risk >= 3 ? '🔴 Élevé' : risk >= 1 ? '🟠 Moyen' : '🟢 Faible';

      el.style.display = 'block';
      el.innerHTML = `
        🛤 <strong>${_esc(best.name)}</strong><br>
        ⏱ ${best.duration_min} min · ${best.distance_km} km<br>
        ⚠️ Risque: ${riskLabel}
      `;
      el.style.borderColor = risk >= 3
        ? 'rgba(255,23,68,.4)'
        : risk >= 1
          ? 'rgba(255,171,0,.4)'
          : 'rgba(0,230,118,.2)';

      injectPersonalRouteToMap(lat, lng, computedRoute);

      console.log('Route perso calculée:', computedRoute);

    } catch (e) {
      console.error('Erreur calcul route perso', e);
      el.style.display = 'block';
      el.innerHTML = `⚠️ Impossible de calculer la route`;
      el.style.borderColor = 'rgba(255,23,68,.35)';
      clearPersonalRouteFromMap();
    }
  }

  async function _sendPosition(lat, lng, speed, accuracy) {
    const token = getToken();
    if (!token) return;

    try {
      await fetch('http://localhost:3001/api/locations/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          lat,
          lng,
          speed_kmh: speed || 0,
          accuracy: accuracy || null,
          timestamp: new Date().toISOString()
        })
      });
    } catch (_) {}
  }

  function startGpsWatch() {
    const user = getUser();
    if (!user) return;

    const fallLat = parseFloat(user.lat || user.latitude) || 30.4202;
    const fallLng = parseFloat(user.lng || user.longitude) || -9.5982;

    _updateRouteInfo(fallLat, fallLng);

    const gpsEl = document.getElementById('user-gps-status');

    if (!navigator.geolocation) {
      if (gpsEl) gpsEl.textContent = `📍 ${fallLat.toFixed(4)}, ${fallLng.toFixed(4)}`;
      return;
    }

    navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 0);

        user.lat = lat;
        user.lng = lng;
        user.latitude = lat;
        user.longitude = lng;

        localStorage.setItem('tsunami_user', JSON.stringify(user));
        if (typeof Store !== 'undefined') Store.setCurrentUser(user);

        if (gpsEl) gpsEl.innerHTML = `📍 Live · ±${acc}m`;

        if (acc > 5000) {
          if (gpsEl) gpsEl.innerHTML = `📍 Signal faible · ±${acc}m`;
          _updateRouteInfo(lat, lng);
          return;
        }

        _updateRouteInfo(lat, lng);
        _sendPosition(lat, lng, 0, acc);
      },
      () => {
        if (gpsEl) gpsEl.textContent = `📍 ${fallLat.toFixed(4)}, ${fallLng.toFixed(4)}`;
        _updateRouteInfo(fallLat, fallLng);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );
  }

  function showToast(title, body, type) {
    const old = document.getElementById('auth-toast');
    if (old) old.remove();

    const colors = {
      alert: { border: '#ff1744', title: '#ff6b6b' },
      warn:  { border: '#ffab00', title: '#ffab00' },
      info:  { border: '#00b0ff', title: '#00b0ff' },
    };

    const c = colors[type] || colors.info;

    if (!document.getElementById('_akf')) {
      const s = document.createElement('style');
      s.id = '_akf';
      s.textContent = '@keyframes _tI{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes _tO{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}';
      document.head.appendChild(s);
    }

    const t = document.createElement('div');
    t.id = 'auth-toast';
    t.style.cssText = `position:fixed;bottom:24px;right:24px;max-width:340px;z-index:9999;background:rgba(0,15,25,.97);border:1px solid ${c.border};border-radius:14px;padding:16px 20px;box-shadow:0 0 30px rgba(0,0,0,.5);font-family:'Barlow Condensed',sans-serif;animation:_tI .4s cubic-bezier(.175,.885,.32,1.275)`;

    t.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:14px;font-weight:700;color:${c.title};letter-spacing:1px">${title}</div>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#6ea8c0;cursor:pointer;font-size:16px;padding:0 0 0 12px">✕</button>
      </div>
      <div style="font-size:12px;font-family:'DM Mono',monospace;color:#e8f4f8;line-height:1.5">${body}</div>
    `;

    document.body.appendChild(t);

    const ttl = type === 'alert' ? 12000 : 5000;
    setTimeout(() => {
      if (t.parentNode) {
        t.style.animation = '_tO .3s ease forwards';
        setTimeout(() => t.remove(), 300);
      }
    }, ttl);
  }

  async function pushNotification(title, body, urgent) {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body.replace(/<br>/g, '\n'),
        tag: 'tsunami-alert',
        requireInteraction: !!urgent
      });
    }

    showToast(title, body, urgent ? 'alert' : 'warn');
  }

  function listenForAlerts() {
    if (typeof WS === 'undefined') return;

    WS.on('seismic_event', ev => {
      if (!ev || ev.magnitude < 4.5) return;

      const urgent = ev.magnitude >= 6.5;
      const title = urgent ? '🚨 ALERTE TSUNAMI' : `⚠️ Séisme M${ev.magnitude}`;
      const body = urgent
        ? `M${ev.magnitude} — ${ev.location || '—'}<br>ÉVACUEZ IMMÉDIATEMENT !`
        : `M${ev.magnitude} — ${ev.location || '—'}<br>Restez vigilant.`;

      pushNotification(title, body, urgent);

      if (urgent) {
        const banner = document.getElementById('tsunami-banner');
        if (banner) {
          banner.classList.remove('hidden');
          const t = document.getElementById('banner-text');
          if (t) t.textContent = `ALERTE TSUNAMI M${ev.magnitude} — ${ev.location || '—'} — ÉVACUEZ IMMÉDIATEMENT`;
        }
      }
    });

    WS.on('siren_activate', data => {
      pushNotification(
        '📢 Sirène activée',
        `Sirène ${(data || {}).siren_id || '—'} déclenchée.<br>Préparez-vous à évacuer.`,
        true
      );
    });
  }

  function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function init() {
    if (!guard()) return false;

    renderUserWidget();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    window.addEventListener('load', () => {
      startGpsWatch();
      listenForAlerts();
    });

    return true;
  }

  return { init, getUser, getToken, logout, pushNotification, showToast };
})();

Auth.init();