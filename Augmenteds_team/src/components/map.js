/**
 * map.js — Carte Leaflet Interactive
 * Affiche : routes d'évacuation, GPS citoyens, zones inondables, points en hauteur
 */

const MapComp = (() => {
  let map = null;
  let inited = false;
  let layers = { citizens: L.layerGroup(), routes: L.layerGroup(), assembly: L.layerGroup(), danger: L.layerGroup() };
  let visible = { citizens: true, routes: true, assembly: true, danger: true };
  const BTN_IDS = { citizens:'btn-citoyens', routes:'btn-routes', assembly:'btn-assembly', danger:'btn-zones' };

  function init() {
    if (inited) return;
    inited = true;

    map = L.map('map', { center: [30.425, -9.600], zoom: 13, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    Object.values(layers).forEach(l => l.addTo(map));

    // Zones inondables
    EvacAlgo.FLOOD_ZONES.forEach(z => {
      L.circle([z.lat, z.lng], {
        radius: z.radius_km * 1000,
        color: z.risk === 'high' ? '#ff1744' : '#ffab00',
        fillColor: z.risk === 'high' ? '#ff1744' : '#ffab00',
        fillOpacity: 0.1, weight: 2, dashArray: '6,4'
      }).bindPopup(`<b>Zone inondable</b><br>Risque: ${z.risk.toUpperCase()}`).addTo(layers.danger);
    });

    // Points de rassemblement (statiques)
    EvacAlgo.ASSEMBLY_POINTS.forEach(ap => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#aa00ff;color:#fff;border:2px solid #fff;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 0 10px rgba(170,0,255,0.5);">▲ ${ap.name.substring(0,12)}</div>`,
        iconAnchor: [50, 12]
      });
      L.marker([ap.lat, ap.lng], { icon })
        .bindPopup(`<b>${ap.name}</b><br>Altitude: ${ap.altitude_m}m<br>Capacité: ${ap.capacity.toLocaleString()} personnes<br>${ap.district}`)
        .addTo(layers.assembly);
    });
  }

  function updateCitizens(citizens, routes) {
    layers.citizens.clearLayers();
    layers.routes.clearLayers();

    citizens.forEach((c, i) => {
      // Icône citoyen
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;background:#00b0ff;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px #00b0ff88;"></div>`,
        iconSize: [10,10], iconAnchor: [5,5]
      });
      L.marker([c.latitude, c.longitude], { icon })
        .bindPopup(`<b>Citoyen ${c.id}</b><br>Vitesse: ${c.speed_kmh} km/h<br>GPS: ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`)
        .addTo(layers.citizens);

      // Route d'évacuation associée
      if (routes && routes[i]) {
        const r = routes[i].route;
        const riskColor = r.flood_risk_at_origin >= 2 ? '#ffab00' : '#00e676';
        L.polyline(r.waypoints, { color: riskColor, weight: 2.5, opacity: 0.65, dashArray: r.flood_risk_at_origin ? '8,5' : null })
          .bindPopup(`<b>Route → ${r.best.name}</b><br>Distance: ${r.best.distance_km} km<br>Durée estimée: ${r.best.duration_min} min`)
          .addTo(layers.routes);
      }
    });
  }

  function addSeismicMarker(event) {
    if (!map) return;
    const r = event.magnitude * 7000;
    L.circle([event.latitude, event.longitude], {
      radius: r, color: '#ff1744', fillColor: '#ff1744', fillOpacity: 0.06, weight: 2
    }).bindPopup(`<b>Séisme M${event.magnitude}</b><br>${event.location}`).addTo(map);
    if (event.magnitude >= 5) map.flyTo([event.latitude, event.longitude], 10, { duration: 1.5 });
  }

  function toggleLayer(name) {
    visible[name] = !visible[name];
    if (visible[name]) map.addLayer(layers[name]);
    else map.removeLayer(layers[name]);
    const btn = document.getElementById(BTN_IDS[name]);
    if (btn) btn.classList.toggle('active', visible[name]);
  }

  return { init, updateCitizens, addSeismicMarker, toggleLayer };
})();
