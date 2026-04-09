let evacMap = null;
let userMarker = null;
let refugeMarker = null;
let routePolyline = null;


function initEvacuationMap() {
    const center = { lat: 30.4278, lng: -9.5981 }; // Agadir

    const mapElement = document.getElementById("map");
    if (!mapElement) {
        console.error("Element #map introuvable.");
        return;
    }

    evacMap = new google.maps.Map(mapElement, {
        zoom: 12,
        center: center,
    });

    console.log("Carte initialisée avec succès.");
}

function setAlert(message) {
    const box = document.getElementById("alert-box");
    if (!box) return;

    box.textContent = message;
    box.classList.remove("hidden");
}

function hideAlert() {
    const box = document.getElementById("alert-box");
    if (!box) return;

    box.textContent = "";
    box.classList.add("hidden");
}

function drawRoute(points) {
    if (!evacMap) {
        console.error("La carte n'est pas initialisée.");
        return;
    }

    if (!Array.isArray(points) || points.length === 0) {
        console.warn("Aucun point à dessiner pour l'itinéraire.");
        return;
    }

    if (routePolyline) {
        routePolyline.setMap(null);
    }

    routePolyline = new google.maps.Polyline({
        path: points,
        geodesic: true,
        strokeColor: "#0f4c81",
        strokeOpacity: 1.0,
        strokeWeight: 5,
    });

    routePolyline.setMap(evacMap);
}

async function fetchCurrentAlert() {
    try {
        const res = await fetch("/alertes/current/");
        if (!res.ok) {
            console.warn("Impossible de récupérer l'alerte actuelle.");
            return;
        }

        const data = await res.json();

        if (data.has_alert) {
            setAlert(`ALERTE ACTIVE - Séisme ${data.magnitude} à ${data.epicentre}`);
        } else {
            hideAlert();
        }
    } catch (e) {
        console.error("Erreur fetchCurrentAlert :", e);
    }
}

function placeUserMarker(userPos) {
    if (!evacMap) {
        alert("La carte n'est pas encore prête. Réessayez dans une seconde.");
        return;
    }

    if (userMarker) {
        userMarker.setMap(null);
    }

    userMarker = new google.maps.Marker({
        position: userPos,
        map: evacMap,
        title: "Votre position",
    });

    evacMap.setCenter(userPos);
    evacMap.setZoom(15);
}

function placeRefugeMarker(refugePos, refugeName = "Refuge") {
    if (!evacMap) return;

    if (refugeMarker) {
        refugeMarker.setMap(null);
    }

    refugeMarker = new google.maps.Marker({
        position: refugePos,
        map: evacMap,
        title: refugeName,
    });
}

document.addEventListener("DOMContentLoaded", function () {
    fetchCurrentAlert();

    const btnGeoloc = document.getElementById("btn-geoloc");
    const btnCalculate = document.getElementById("btn-calculate");

    if (btnGeoloc) {
        btnGeoloc.addEventListener("click", function () {
            if (!navigator.geolocation) {
                alert("La géolocalisation n'est pas supportée par ce navigateur.");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    document.getElementById("latitude").value = lat;
                    document.getElementById("longitude").value = lng;

                    const userPos = { lat: lat, lng: lng };
                    placeUserMarker(userPos);

                    console.log("Position récupérée :", userPos);
                },
                function (error) {
                    console.error("Erreur de géolocalisation :", error);

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            alert("Vous avez refusé la géolocalisation.");
                            break;
                        case error.POSITION_UNAVAILABLE:
                            alert("Position indisponible.");
                            break;
                        case error.TIMEOUT:
                            alert("La demande de géolocalisation a expiré.");
                            break;
                        default:
                            alert("Une erreur inconnue s'est produite.");
                            break;
                    }
                },
                {
                    enableHighAccuracy: false,
                    timeout: 20000 ,// or even 30000 
                    maximumAge: 60000,
                }
            );
        });
    }

    if (btnCalculate) {
        btnCalculate.addEventListener("click", async function () {
            try {
                const latitude = parseFloat(document.getElementById("latitude").value);
                const longitude = parseFloat(document.getElementById("longitude").value);
                const telephone = document.getElementById("telephone").value.trim();

                if (isNaN(latitude) || isNaN(longitude)) {
                    alert("Veuillez saisir une position valide.");
                    return;
                }

                if (!evacMap) {
                    alert("La carte n'est pas encore prête.");
                    return;
                }

                const response = await fetch("/evacuation/calculate/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCookie("csrftoken"),
                    },
                    body: JSON.stringify({
                        latitude: latitude,
                        longitude: longitude,
                        telephone: telephone,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || "Erreur lors du calcul de l’itinéraire.");
                    return;
                }

                const userPos = {
                    lat: latitude,
                    lng: longitude,
                };

                const refugePos = {
                    lat: data.refuge.latitude,
                    lng: data.refuge.longitude,
                };

                placeUserMarker(userPos);
                placeRefugeMarker(refugePos, data.refuge.nom);

                if (Array.isArray(data.waypoints) && data.waypoints.length > 0) {
                    drawRoute(data.waypoints);

                    const bounds = new google.maps.LatLngBounds();
                    data.waypoints.forEach(function (p) {
                        bounds.extend(p);
                    });
                    evacMap.fitBounds(bounds);
                } else {
                    console.warn("Aucun waypoint reçu depuis le backend.");
                }

                document.getElementById("result").innerHTML = `
                    <p><strong>Refuge :</strong> ${data.refuge.nom}</p>
                    <p><strong>Altitude :</strong> ${data.refuge.altitude} m</p>
                    <p><strong>Capacité :</strong> ${data.refuge.capacite_max}</p>
                    <p><strong>Distance :</strong> ${(data.distance_m / 1000).toFixed(2)} km</p>
                    <p><strong>Temps estimé :</strong> ${Math.ceil(data.duration_s / 60)} min</p>
                    <p>
                        <a class="btn btn-primary" href="${data.gpx_download_url}">
                            Télécharger GPX
                        </a>
                    </p>
                    <p>
                        <a class="btn btn-light" href="${data.google_maps_url}" target="_blank" rel="noopener noreferrer">
                            Ouvrir dans Google Maps
                        </a>
                    </p>
                `;
            } catch (error) {
                console.error("Erreur lors du calcul :", error);
                alert("Une erreur s'est produite lors du calcul de l’itinéraire.");
            }
        });
    }
});

function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();

            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
}