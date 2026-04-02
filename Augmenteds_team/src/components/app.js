/**
 * app.js — Orchestrateur principal
 * Initialise tous les composants et coordonne les mises à jour
 */

// ── Navigation entre vues ────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const view = document.getElementById(`view-${name}`);
  if (view) view.classList.add('active');
  const btn = document.querySelector(`[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  if (name === 'map') setTimeout(() => MapComp.init(), 100);
}

// ── Mise à jour générale ─────────────────────────────────────
function updateAll() {
  const state = Store.get();
  Dashboard.updateKPIs({
    latestMag:    state.latestMag,
    activeSirens: state.activeSirens,
    citizens:     state.citizens,
    routes:       state.routes,
    events:       state.events
  });
  Charts.updateFlux(state.fluxHistory);
  Charts.updateMag(state.events);
  AssemblyComp.renderCards(state.occupancy);
  AssemblyComp.renderSummaryBars(state.occupancy);
  MapComp.updateCitizens(state.citizens, state.routes);
}

// ── Gestion événement sismique ───────────────────────────────
function handleSeismicEvent(event) {
  Store.addEvent(event);

  // ★ TRIGGER SIRÈNES si magnitude >= 6.5 et type marine
  if (event.magnitude >= 6.5 && event.type === 'marine') {
    SirenComp.autoActivate(event.magnitude);
  }

  MapComp.addSeismicMarker(event);
  Dashboard.updateKPIs({
    latestMag:    event.magnitude,
    activeSirens: Store.get().activeSirens,
    citizens:     Store.get().citizens,
    routes:       Store.get().routes,
    events:       Store.get().events
  });
  Charts.updateMag(Store.get().events);
}

// ── Initialisation ───────────────────────────────────────────
async function init() {
  // Statut API
  const dotApi = document.getElementById('dot-api');
  if (dotApi) dotApi.className = 'dot loading';

  // Charger données initiales
  const [events, sirens, citizens] = await Promise.all([
    API.getSeismicEvents(),
    API.getSirensStatus(),
    API.getCitizenPositions()
  ]);

  Store.setEvents(events);
  Store.setSirens(sirens);
  Store.setCitizens(citizens);

  // Rendre les sirènes
  SirenComp.render(sirens);

  // Initialiser les charts
  Charts.init();

  // Mise à jour complète
  updateAll();

  // Statut API OK
  if (dotApi) dotApi.className = 'dot ok';
  const dotSirens = document.getElementById('dot-sirens');
  if (dotSirens) dotSirens.className = 'dot ok';

  // WebSocket temps réel
  WS.on('citizen_positions', (citizens) => {
    Store.setCitizens(citizens);
    updateAll();
  });

  WS.on('seismic_event', (event) => {
    handleSeismicEvent(event);
  });

  WS.on('siren_activate', ({ siren_id, active }) => {
    if (active) {
      Store.activateSiren(siren_id);
      SirenComp.updateCard(siren_id, true);
      const kEl = document.getElementById('kpi-sirens');
      if (kEl) kEl.textContent = Store.get().activeSirens;
    }
  });

  WS.connect();

  // Polling backup API toutes les 30s
  setInterval(async () => {
    const events = await API.getSeismicEvents();
    if (events && events.length) {
      Store.setEvents(events);
      Charts.updateMag(events);
    }
  }, 30000);

  // Notification navigateur
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Lancement au chargement de la page
window.addEventListener('DOMContentLoaded', init);
