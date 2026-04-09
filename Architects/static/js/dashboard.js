function initDashboardMap() {
    const positions = JSON.parse(document.getElementById("positions-data").textContent);
    const refuges = JSON.parse(document.getElementById("refuges-data").textContent);
    const sirenes = JSON.parse(document.getElementById("sirenes-data").textContent);

    const map = new google.maps.Map(document.getElementById("dashboard-map"), {
        zoom: 12,
        center: { lat: 30.4278, lng: -9.5981 }
    });

    refuges.forEach(r => {
        new google.maps.Marker({
            position: { lat: r.latitude, lng: r.longitude },
            map,
            title: `${r.nom} (${r.altitude}m)`,
        });
    });

    sirenes.forEach(s => {
        new google.maps.Marker({
            position: { lat: s.latitude, lng: s.longitude },
            map,
            title: `${s.emplacement} - ${s.statut}`,
            icon: s.statut === "actif"
                ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        });
    });

    positions.forEach(p => {
        new google.maps.Circle({
            strokeColor: p.en_evacuation ? "#dc2626" : "#16a34a",
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: p.en_evacuation ? "#dc2626" : "#16a34a",
            fillOpacity: 0.35,
            map,
            center: { lat: p.latitude, lng: p.longitude },
            radius: 20
        });
    });
}

