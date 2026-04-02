/**
 * evacuation.js — Algorithme de calcul des routes d'évacuation
 * Formule Haversine + Score composite
 */
const EvacAlgo = (() => {

  // ── Points de rassemblement en hauteur ──────────────────────
  const ASSEMBLY_POINTS = [
    { id:'AP1', name:'Colline Yachts Club',   lat:30.4320, lng:-9.6350, altitude_m:85,  capacity:3000,  district:'Agadir Centre',  facilities:['Eau potable','Premiers secours','Éclairage'] },
    { id:'AP2', name:'Plateau Founty',        lat:30.4010, lng:-9.5790, altitude_m:120, capacity:5000,  district:'Founty',         facilities:['Eau potable','Premiers secours','Abri','Toilettes'] },
    { id:'AP3', name:'Colline Anza Haute',    lat:30.4620, lng:-9.6490, altitude_m:95,  capacity:2500,  district:'Anza',           facilities:['Eau potable','Premiers secours'] },
    { id:'AP4', name:'Zone Industrielle',     lat:30.3920, lng:-9.5620, altitude_m:110, capacity:4000,  district:'Industriel',     facilities:['Abri','Eau potable','Générateur'] },
    { id:'AP5', name:'Université Ibn Zohr',   lat:30.3880, lng:-9.5430, altitude_m:140, capacity:8000,  district:'Hay Mohammadi',  facilities:['Eau potable','Premiers secours','Abri','Toilettes','Éclairage'] },
    { id:'AP6', name:'Colline Bensergao',     lat:30.4690, lng:-9.6240, altitude_m:75,  capacity:2000,  district:'Bensergao',      facilities:['Eau potable','Premiers secours'] },
  ];

  // ── Zones inondables côtières ────────────────────────────────
  const FLOOD_ZONES = [
    { id:'FZ1', name:'Front de mer Agadir',  lat:30.4180, lng:-9.6150, radius_km:0.8, risk:'high'   },
    { id:'FZ2', name:'Zone portuaire',       lat:30.4250, lng:-9.6210, radius_km:0.6, risk:'high'   },
    { id:'FZ3', name:'Plage Taghazout',      lat:30.5430, lng:-9.7090, radius_km:0.5, risk:'high'   },
    { id:'FZ4', name:'Bande littorale Anza', lat:30.4550, lng:-9.6450, radius_km:0.7, risk:'medium' },
  ];

  // ── Haversine (distance en km) ───────────────────────────────
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ── Vérifie si un point est dans une zone inondable ──────────
  function getFloodRisk(lat, lon) {
    let maxRisk = 0;
    for (const zone of FLOOD_ZONES) {
      const dist = haversine(lat, lon, zone.lat, zone.lng);
      if (dist <= zone.radius_km) {
        maxRisk = Math.max(maxRisk, zone.risk === 'high' ? 3 : 1);
      }
    }
    return maxRisk;
  }

  // ── Calcule les routes pour un citoyen ───────────────────────
  function computeRoutes(citizen) {
    const floodRisk = getFloodRisk(citizen.latitude, citizen.longitude);
    const walkSpeed = floodRisk >= 2 ? 2.5 : 4.0; // km/h

    const scored = ASSEMBLY_POINTS.map(ap => {
      const dist = haversine(citizen.latitude, citizen.longitude, ap.lat, ap.lng);
      const altitudeScore = 20 / (ap.altitude_m / 100 + 0.1);
      const occupancyPct  = (citizen.occupancy || 0) / ap.capacity * 100;
      const score = dist * 0.5 + altitudeScore + occupancyPct * 0.3 + floodRisk * 0.5;
      const duration_min = Math.round((dist / walkSpeed) * 60);
      return { ...ap, distance_km: dist.toFixed(2), duration_min, score };
    }).sort((a, b) => a.score - b.score);

    const best = scored[0];

    // Waypoints simplifiés (ligne droite avec point intermédiaire)
    const midLat = (citizen.latitude + best.lat) / 2 + 0.005;
    const midLon = (citizen.longitude + best.lng) / 2;
    const waypoints = [
      [citizen.latitude, citizen.longitude],
      [midLat, midLon],
      [best.lat, best.lng]
    ];

    return {
      citizen_id: citizen.id,
      flood_risk_at_origin: floodRisk,
      best,
      alternatives: [scored[1], scored[2]].filter(Boolean),
      waypoints,
      walk_speed_kmh: walkSpeed
    };
  }

  // ── Calcule les routes pour tous les citoyens ────────────────
  function computeAllRoutes(citizens) {
    return citizens.map(c => ({
      citizen: c,
      route: computeRoutes(c)
    }));
  }

  return { ASSEMBLY_POINTS, FLOOD_ZONES, haversine, getFloodRisk, computeRoutes, computeAllRoutes };
})();
