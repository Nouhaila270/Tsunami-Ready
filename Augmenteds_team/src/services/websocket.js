/**
 * src/services/websocket.js — Temps réel GPS + alertes séismes
 * Version backend réel — MOCK désactivé
 */

const WS = (() => {
  // Adresse WebSocket Node.js backend
  const WS_URL = window.WS_URL || 'ws://localhost:3001/ws';
  let socket = null;
  let listeners = {};

  // Connexion WebSocket
  function connect() {
    try {
      socket = new WebSocket(WS_URL);

      // Quand connexion ouverte
      socket.onopen = () => {
        _setDot('dot-ws', 'ok'); // point vert
        console.log('[WS] Connecté');

        // Identifier le citoyen connecté
        try {
          const user = JSON.parse(localStorage.getItem('tsunami_user') || '{}');
          const token = localStorage.getItem('tsunami_token') || '';
          if (user.id) {
            socket.send(JSON.stringify({
              type: 'identify',
              payload: { user_id: user.id, role: user.role || 'citizen', token }
            }));
          }
        } catch (_) {
          console.warn('[WS] Impossible d’identifier l’utilisateur');
        }
      };

      // Quand un message est reçu
      socket.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          _emit(d.type, d.payload);
        } catch (_) {
          console.error('[WS] Erreur parsing message', e.data);
        }
      };

      // Quand la connexion est fermée
      socket.onclose = () => {
        _setDot('dot-ws', 'err'); // point rouge
        console.warn('[WS] Déconnecté, tentative reconnexion...');
        setTimeout(connect, 6000); // reconnexion automatique
      };

      // Gestion erreurs
      socket.onerror = () => socket.close();

    } catch (e) {
      _setDot('dot-ws', 'err');
      console.error('[WS] Impossible de se connecter', e);
      setTimeout(connect, 10000);
    }
  }

  // Ajouter un listener pour un type d’événement
  function on(type, cb) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(cb);
  }

  // Émettre un événement à tous les listeners
  function _emit(type, payload) {
    (listeners[type] || []).forEach(cb => cb(payload));
  }

  // Mettre à jour le point de statut WebSocket
  function _setDot(id, cls) {
    const el = document.getElementById(id);
    if (el) el.className = `dot ${cls}`;
  }

  // ❌ MOCK DATA désactivé
  // Toutes les fonctions _startMock et _stopMock ont été supprimées
  // plus aucune génération aléatoire de positions ou séismes

  // Export fonctions
  return { connect, on };

})();