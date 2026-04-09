function getCSRF() {
    return document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
           document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "";
}

function openPopup() {
    const refuges = JSON.parse(document.getElementById("refuges-data").textContent);
    const list = document.getElementById("refugeList");
    list.innerHTML = "";

    refuges.forEach((r, index) => {
        const div = document.createElement("div");
        div.className = "refuge-card";
        div.innerHTML = `
            <h4>${r.nom}</h4>
            <p>📍 ${r.latitude}, ${r.longitude}</p>
            <p>⛰️ Altitude: ${r.altitude} m</p>
            <div class="card-buttons">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;

        div.querySelector(".delete-btn").addEventListener("click", async () => {
            await fetch(`/dashboard/delete-refuge/${r.id}/`, {
                method: "POST",
                headers: { "X-CSRFToken": getCSRF() }
            });
            refuges.splice(index, 1);
            document.getElementById("refuges-data").textContent = JSON.stringify(refuges);
            document.querySelectorAll(".card p")[1].textContent = refuges.length;
            openPopup();
        });

        div.querySelector(".edit-btn").addEventListener("click", async () => {
            const newName = prompt("Edit refuge name:", r.nom);
            const newLat = prompt("Edit latitude:", r.latitude);
            const newLon = prompt("Edit longitude:", r.longitude);
            const newAlt = prompt("Edit altitude:", r.altitude);
            const newCap = prompt("Edit capacité maximale:", r.capacite_max);

            if (newName && newLat && newLon) {
                await fetch(`/dashboard/edit-refuge/${r.id}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRF()
                    },
                    body: JSON.stringify({
                        nom: newName,
                        latitude: parseFloat(newLat),
                        longitude: parseFloat(newLon),
                        altitude: newAlt ? parseFloat(newAlt) : null,
                        capacite_max: newCap ? parseInt(newCap) : null,
                    })
                });

                r.nom = newName;
                r.latitude = parseFloat(newLat);
                r.longitude = parseFloat(newLon);
                r.altitude = newAlt ? parseFloat(newAlt) : null;
                r.capacite_max = newCap ? parseInt(newCap) : null;

                document.getElementById("refuges-data").textContent = JSON.stringify(refuges);
                openPopup();
            }
        });

        list.appendChild(div);
    });

    document.getElementById("popup").style.display = "flex";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

function openPopup1() {
    const sirenes = JSON.parse(document.getElementById("sirenes-data").textContent);
    const list = document.getElementById("sireneList");
    list.innerHTML = "";

    sirenes.forEach((s) => {
        const li = document.createElement("li");
        li.className = "sirene-card";
        li.innerHTML = `
            <strong>${s.emplacement}</strong><br>
            📍 ${s.latitude}, ${s.longitude}<br>
            ⏺ Statut: ${s.statut}
            <div class="card-buttons">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;

        li.querySelector(".delete-btn").addEventListener("click", async () => {
            await fetch(`/dashboard/delete-sirene/${s.id}/`, {
                method: "POST",
                headers: { "X-CSRFToken": getCSRF() }
            });
            const indexToRemove = sirenes.findIndex(ref => ref.id === s.id);
            if (indexToRemove > -1) {
                sirenes.splice(indexToRemove, 1);
                document.getElementById("sirenes-data").textContent = JSON.stringify(sirenes);
                document.querySelectorAll(".card p")[2].textContent = sirenes.length;
                openPopup1();
            }
        });

        li.querySelector(".edit-btn").addEventListener("click", async () => {
            const newEmplacement = prompt("Edit emplacement:", s.emplacement);
            const newLat = prompt("Edit latitude:", s.latitude);
            const newLon = prompt("Edit longitude:", s.longitude);
            const newStatut = prompt("Edit statut (actif/inactif):", s.statut);

            if (newEmplacement && newLat && newLon && newStatut) {
                await fetch(`/dashboard/edit-sirene/${s.id}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRF()
                    },
                    body: JSON.stringify({
                        emplacement: newEmplacement,
                        latitude: parseFloat(newLat),
                        longitude: parseFloat(newLon),
                        statut: newStatut,
                    })
                });

                s.emplacement = newEmplacement;
                s.latitude = parseFloat(newLat);
                s.longitude = parseFloat(newLon);
                s.statut = newStatut;

                document.getElementById("sirenes-data").textContent = JSON.stringify(sirenes);
                openPopup1();
            }
        });

        list.appendChild(li);
    });

    document.getElementById("popup1").style.display = "flex";
}

function closePopup1() {
    document.getElementById("popup1").style.display = "none";
}

function openModal() {
    document.getElementById("modal").style.display = "flex";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    const typeSelect = document.getElementById("typeSelect");
    const refugeInputs = document.getElementById("refugeInputs");
    const sireneInputs = document.getElementById("sireneInputs");

    typeSelect.addEventListener("change", () => {
        if (typeSelect.value === "refuge") {
            refugeInputs.style.display = "block";
            sireneInputs.style.display = "none";
        } else {
            refugeInputs.style.display = "none";
            sireneInputs.style.display = "block";
        }
    });

    document.getElementById("submitModal").addEventListener("click", async () => {
        const type = typeSelect.value;
        const addRefugeUrl = document.getElementById("add-refuge-url").value;
        const addSireneUrl = document.getElementById("add-sirene-url").value;

        let url, body;

        if (type === "refuge") {
            const nom = document.getElementById("refugeName").value.trim();
            const lat = parseFloat(document.getElementById("refugeLat").value);
            const lon = parseFloat(document.getElementById("refugeLon").value);
            const alt = parseFloat(document.getElementById("refugeAlt").value);
            const cap = parseInt(document.getElementById("refugeCap").value);

            if (!nom || isNaN(lat) || isNaN(lon)) {
                alert("Veuillez remplir les champs obligatoires (nom, latitude, longitude).");
                return;
            }
            url = addRefugeUrl;
            body = { nom, latitude: lat, longitude: lon, altitude: alt || null, capacite_max: cap || null };

        } else {
            const emplacement = document.getElementById("sireneEmplacement").value.trim();
            const lat = parseFloat(document.getElementById("sireneLat").value);
            const lon = parseFloat(document.getElementById("sireneLon").value);

            if (!emplacement || isNaN(lat) || isNaN(lon)) {
                alert("Veuillez remplir les champs obligatoires (emplacement, latitude, longitude).");
                return;
            }
            url = addSireneUrl;
            body = { emplacement, latitude: lat, longitude: lon };
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRF(),
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error("Erreur serveur");

            const newItem = await response.json();

            if (type === "refuge") {
                const refuges = JSON.parse(document.getElementById("refuges-data").textContent);
                refuges.push(newItem);
                document.getElementById("refuges-data").textContent = JSON.stringify(refuges);
                document.querySelectorAll(".card p")[1].textContent = refuges.length;
            } else {
                const sirenes = JSON.parse(document.getElementById("sirenes-data").textContent);
                sirenes.push(newItem);
                document.getElementById("sirenes-data").textContent = JSON.stringify(sirenes);
                document.querySelectorAll(".card p")[2].textContent = sirenes.length;
            }

            alert(`${type === "refuge" ? "Refuge" : "Sirène"} ajouté(e) avec succès !`);
            closeModal();

        } catch (err) {
            alert("Une erreur est survenue : " + err.message);
        }
    });
});