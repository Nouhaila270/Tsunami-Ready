/**
 * sirens.js — Gestion du réseau de sirènes virtuelles
 * ✅ Activation visuelle sirènes si secousse marine >= 6.5
 * ✅ Envoi WhatsApp au user connecté si magnitude >= 6
 */

const SirenComp = (() => {

  // 📲 Envoi WhatsApp à TOUS les citoyens (broadcast)
  async function triggerWhatsAppBroadcast(mag, location = 'Agadir') {
    if (mag < 6) return;

    const token = localStorage.getItem('tsunami_token');
    if (!token) {
      console.warn('⚠️ Aucun token utilisateur pour WhatsApp broadcast');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/alerts/whatsapp-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ magnitude: mag, location })
      });

      const data = await res.json();
      console.log(`📲 Broadcast WhatsApp: ${data.sent || 0} envoyés, ${data.failed || 0} échoués`);

      if (!res.ok) {
        console.warn('⚠️ Broadcast WhatsApp refusé:', data.message || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('❌ Erreur broadcast WhatsApp:', err);
    }
  }

  function render(sirens) {
    const grid = document.getElementById('siren-grid');
    if (!grid) return;

    grid.innerHTML = sirens.map(s => `
      <div class="siren-card ${s.active ? 'active' : ''}" id="sc-${s.id}" onclick="SirenComp.toggle('${s.id}')">
        <div class="si-icon">${s.active ? '🔴' : '📢'}</div>
        <div class="si-name">${s.name}</div>
        <div class="si-zone">${s.zone}</div>
        <div class="si-status">${s.active ? '⚠ ACTIVE — ALERTE' : 'En veille'}</div>
        <div class="si-elev">Altitude: ${s.altitude_m}m</div>
      </div>
    `).join('');
  }

  function updateCard(id, active) {
    const card = document.getElementById(`sc-${id}`);
    if (!card) return;

    card.className = `siren-card ${active ? 'active' : ''}`;

    const iconEl = card.querySelector('.si-icon');
    const statusEl = card.querySelector('.si-status');

    if (iconEl) iconEl.textContent = active ? '🔴' : '📢';
    if (statusEl) statusEl.textContent = active ? '⚠ ACTIVE — ALERTE' : 'En veille';
  }

  /**
   * 🚨 Activation automatique
   */
  async function autoActivate(mag) {

    // ✅ 1. WhatsApp broadcast à TOUS les citoyens (>= 6)
    if (mag >= 6) {
      await triggerWhatsAppBroadcast(mag);
    }

    // ✅ 2. Sirènes visuelles (>= 6.5)
    if (mag < 6.5) return;

    const sirens = Store.get().sirens;

    sirens.forEach(s => {
      Store.activateSiren(s.id);
      updateCard(s.id, true);
    });

    // 🔴 Afficher bandeau alerte
    const banner = document.getElementById('tsunami-banner');
    const magEl = document.getElementById('banner-mag');

    if (banner) banner.classList.remove('hidden');
    if (magEl) magEl.textContent = `M${mag.toFixed(1)}`;

    // KPI
    const kEl = document.getElementById('kpi-sirens');
    if (kEl) kEl.textContent = sirens.length;
  }

  function toggle(id) {
    const s = Store.get().sirens.find(x => x.id === id);
    if (!s) return;

    const next = !s.active;

    if (next) {
      Store.activateSiren(id);
    } else {
      const updated = Store.get().sirens.map(x =>
        x.id === id ? { ...x, active: false } : x
      );
      Store.updateSirens(updated);
    }

    updateCard(id, next);

    const kEl = document.getElementById('kpi-sirens');
    if (kEl) kEl.textContent = Store.get().activeSirens;
  }

  async function testAll() {
    Store.get().sirens.forEach(s => {
      Store.activateSiren(s.id);
      updateCard(s.id, true);
    });

    const kEl = document.getElementById('kpi-sirens');
    if (kEl) kEl.textContent = Store.get().sirens.length;

    // ✅ Mettre à jour le dashboard KPIs
    if (typeof updateAll === 'function') updateAll();

    // ✅ Afficher bandeau alerte
    const banner = document.getElementById('tsunami-banner');
    const magEl = document.getElementById('banner-mag');
    if (banner) banner.classList.remove('hidden');
    if (magEl) magEl.textContent = 'TEST';

    // ✅ Envoi WhatsApp broadcast à tous les citoyens
    await triggerWhatsAppBroadcast(7.0, 'Test sirènes — Agadir');
  }

  function resetAll() {
    const reset = Store.get().sirens.map(s => ({ ...s, active: false }));
    Store.updateSirens(reset);

    reset.forEach(s => updateCard(s.id, false));

    const banner = document.getElementById('tsunami-banner');
    if (banner) banner.classList.add('hidden');

    const kEl = document.getElementById('kpi-sirens');
    if (kEl) kEl.textContent = 0;
  }

  return { render, updateCard, autoActivate, toggle, testAll, resetAll };

})();