let map;
let bounds;
let refugeMarkers = {};
let sireneMarkers = {};
let refugeData = [];
let sireneData = [];

// ================= CSRF =================
function getCSRF() {
    return document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
           document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "";
}

// ================= MAP =================
function initDashboardMap() {
    refugeData = JSON.parse(document.getElementById("refuges-data").textContent) || [];
    sireneData = JSON.parse(document.getElementById("sirenes-data").textContent) || [];
    window.refugeData = refugeData;
    window.sireneData = sireneData;
    window.refreshMap = refreshMap;

    map = new google.maps.Map(document.getElementById("dashboard-map"), {
        zoom: 12,
        center: { lat: 30.4278, lng: -9.5981 }
    });

    refreshMap();
}

function clearMarkers() {
    Object.values(refugeMarkers).forEach(marker => marker.setMap(null));
    Object.values(sireneMarkers).forEach(marker => marker.setMap(null));
    refugeMarkers = {};
    sireneMarkers = {};
}

function refreshMap() {
    if (!map) return;

    clearMarkers();
    bounds = new google.maps.LatLngBounds();

    refugeData.forEach(addRefugeMarker);
    sireneData.forEach(addSireneMarker);

    if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
    }
}

// ================= MARKERS =================
function addRefugeMarker(r) {
    if (!map) {
        console.error("Map is not initialized yet.");
        return;
    }

    const position = new google.maps.LatLng(r.latitude, r.longitude);
    const marker = new google.maps.Marker({
        position,
        map,
        title: r.nom
    });

    refugeMarkers[r.id] = marker;
    bounds.extend(position);
}

function addSireneMarker(s) {
    if (!map) {
        console.error("Map is not initialized yet.");
        return;
    }

    const position = new google.maps.LatLng(s.latitude, s.longitude);
    const marker = new google.maps.Marker({
        position,
        map,
        title: s.emplacement,
        icon: s.statut === "actif"
            ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    });

    sireneMarkers[s.id] = marker;
    bounds.extend(position);
}

function removeRefugeMarker(id) {
    refugeMarkers[id]?.setMap(null);
    delete refugeMarkers[id];
}

function removeSireneMarker(id) {
    sireneMarkers[id]?.setMap(null);
    delete sireneMarkers[id];
}

function updateRefugeMarker(r) {
    removeRefugeMarker(r.id);
    addRefugeMarker(r);
}

function updateSireneMarker(s) {
    removeSireneMarker(s.id);
    addSireneMarker(s);
}

// ================= ADD =================
async function addItem(type, data) {
    const url = type === "refuge"
        ? "/dashboard/add-refuge/"
        : "/dashboard/add-sirene/";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRF()
        },
        body: JSON.stringify(data)
    });

    const newItem = await res.json();

    if (type === "refuge") {
        addRefugeMarker(newItem);
    } else {
        addSireneMarker(newItem);
    }
}

// ================= DELETE =================
async function deleteRefuge(id) {
    await fetch(`/dashboard/delete-refuge/${id}/`, {
        method: "POST",
        headers: { "X-CSRFToken": getCSRF() }
    });

    removeRefugeMarker(id);
}

async function deleteSirene(id) {
    await fetch(`/dashboard/delete-sirene/${id}/`, {
        method: "POST",
        headers: { "X-CSRFToken": getCSRF() }
    });

    removeSireneMarker(id);
}

// ================= EDIT =================
async function editRefuge(r) {
    await fetch(`/dashboard/edit-refuge/${r.id}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRF()
        },
        body: JSON.stringify(r)
    });

    updateRefugeMarker(r);
}

async function editSirene(s) {
    await fetch(`/dashboard/edit-sirene/${s.id}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRF()
        },
        body: JSON.stringify(s)
    });

    updateSireneMarker(s);
}