/**
 * src/store/state.js — État global de l'application
 */
const Store = (() => {
  let state = {
    events:      [],
    alerts:      [],
    sensors:     [],
    sirens:      [],
    citizens:    [],
    routes:      [],
    latestMag:   null,
    activeSirens: 0,
    fluxHistory: Array(14).fill(0),
    occupancy:   {},
    currentUser: null,   // citoyen connecté (injecté par auth.js)
  };

  function get() { return state; }

  function setCurrentUser(user) { state.currentUser = user; }

  function setEvents(events) {
    state.events = events;
    if (events.length) state.latestMag = events[0].magnitude;
  }

  function setSirens(sirens) {
    state.sirens = sirens;
    state.activeSirens = sirens.filter(s => s.active).length;
  }

  function updateSirens(sirens) {
    state.sirens = sirens;
    state.activeSirens = sirens.filter(s => s.active).length;
  }

  function activateSiren(id) {
    state.sirens = state.sirens.map(s => s.id === id ? { ...s, active: true } : s);
    state.activeSirens = state.sirens.filter(s => s.active).length;
  }

  function setCitizens(citizens) {
    state.citizens = citizens;
    state.routes = EvacAlgo.computeAllRoutes(citizens);
    state.fluxHistory = [...state.fluxHistory.slice(1), citizens.filter(c => c.speed_kmh > 0).length];
    const occ = {};
    EvacAlgo.ASSEMBLY_POINTS.forEach(ap => { occ[ap.id] = 0; });
    state.routes.forEach(r => {
      const bestId = r.route.best.id;
      if (occ[bestId] !== undefined) occ[bestId]++;
    });
    Object.keys(occ).forEach(k => { occ[k] = occ[k] * 120; });
    state.occupancy = occ;
  }

  function addEvent(event) {
    state.events = [event, ...state.events].slice(0, 50);
    state.latestMag = event.magnitude;
  }

  return { get, setCurrentUser, setEvents, setSirens, updateSirens, activateSiren, setCitizens, addEvent };
})();