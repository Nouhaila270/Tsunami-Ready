/**
 * api.js — Service API REST
 * Flask :5000  -> événements / alertes
 * Node  :3001  -> auth / users / GPS / sirènes
 */

const API = (() => {
  // Remplacez les ports si nécessaire pour correspondre à votre config locale
const BASE_M1 = 'https://localhost:5000'; // Si Flask est aussi en HTTPS
const BASE_M2 = 'https://localhost:3001'; // Votre serveur Node sécurisé
  // const BASE_M1 = window.API_BASE_M1 || 'http://localhost:5000';
  // const BASE_M2 = window.API_BASE_M2 || 'http://localhost:3001';

  function getToken() {
    return localStorage.getItem('tsunami_token') || '';
  }

  async function _fetch(base, path, opts = {}) {
    try {
      const headers = opts.headers || {};
      const res = await fetch(base + path, {
        ...opts,
        headers
      });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      console.error("Erreur API :", e);
      return null;
    }
  }

  async function _fetchNode(path, opts = {}) {
    const token = getToken();
    const headers = {
      ...(opts.headers || {}),
      Authorization: token ? ('Bearer ' + token) : ''
    };
    return _fetch(BASE_M2, path, { ...opts, headers });
  }

  async function getSeismicEvents() {
    const data = await _fetch(BASE_M1, '/events?limit=20');
    return data ? data.events || [] : [];
  }

  async function getAlerts() {
    const data = await _fetch(BASE_M1, '/alerts');
    return data ? data.alerts || [] : [];
  }

  async function getSirensStatus() {
    const data = await _fetchNode('/api/sirens/status');
    return data ? data.sirens || [] : [];
  }

  async function getCitizenPositions() {
    const data = await _fetchNode('/api/locations/active');
    if (!data || !data.locations) return [];

    return data.locations.map(l => ({
      id: l.user_id,
      latitude: parseFloat(l.lat),
      longitude: parseFloat(l.lng),
      speed_kmh: parseFloat(l.speed || 0),
      last_seen: l.timestamp,
      full_name: l.full_name || null,
      role: l.role || 'citizen'
    }));
  }

  async function getCitizensList() {
    const data = await _fetchNode('/api/users/citizens');
    return data ? data.citizens || [] : [];
  }

  async function getMyProfile(userId) {
    const data = await _fetchNode(`/api/users/${userId}`);
    return data || null;
  }

  async function updateMyProfile(userId, payload) {
    return await _fetchNode(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async function sendMyPosition(lat, lng, speed_kmh = 0) {
    return await _fetchNode('/api/locations/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, speed_kmh })
    });
  }

  return {
    getSeismicEvents,
    getAlerts,
    getSirensStatus,
    getCitizenPositions,
    getCitizensList,
    getMyProfile,
    updateMyProfile,
    sendMyPosition
  };
})();