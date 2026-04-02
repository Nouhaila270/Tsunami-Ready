/**
 * dashboard.js — Mise à jour des KPIs et du dashboard
 */
const Dashboard = (() => {

  function updateKPIs(state) {
    const { latestMag, activeSirens, citizens, routes } = state;

    const m = document.getElementById('kpi-mag');
    if (m) m.textContent = latestMag ? latestMag.toFixed(1) : '—';

    const loc = document.getElementById('kpi-loc');
    if (loc && state.events.length) loc.textContent = state.events[0].location || '—';

    const si = document.getElementById('kpi-sirens');
    if (si) si.textContent = activeSirens;

    const ev = document.getElementById('kpi-evac');
    if (ev) ev.textContent = citizens ? citizens.length : 0;

    const ro = document.getElementById('kpi-routes');
    if (ro) ro.textContent = routes ? routes.length : 0;

    const up = document.getElementById('last-update');
    if (up) up.textContent = `Mis à jour : ${new Date().toLocaleTimeString('fr')}`;
  }

  return { updateKPIs };
})();
