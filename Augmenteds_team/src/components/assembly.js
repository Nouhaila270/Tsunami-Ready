/**
 * assembly.js — Points de rassemblement en hauteur
 */
const AssemblyComp = (() => {

  function renderCards(occupancyMap) {
    const grid = document.getElementById('assembly-cards');
    if (!grid) return;
    grid.innerHTML = EvacAlgo.ASSEMBLY_POINTS.map(ap => {
      const occ = occupancyMap[ap.id] || 0;
      const pct = Math.min(100, Math.round((occ / ap.capacity) * 100));
      const color = pct > 80 ? '#ff1744' : pct > 50 ? '#ffab00' : '#aa00ff';
      return `
        <div class="asm-card">
          <div class="asm-icon">▲</div>
          <div class="asm-name">${ap.name}</div>
          <div class="asm-elev">Altitude : ${ap.altitude_m} m</div>
          <div class="asm-row"><span>District</span><span>${ap.district}</span></div>
          <div class="asm-row"><span>Capacité max</span><span>${ap.capacity.toLocaleString()} pers.</span></div>
          <div class="asm-row"><span>Occupation actuelle</span><span>${occ} pers.</span></div>
          <div class="asm-row"><span>Équipements</span><span>${ap.facilities.join(', ')}</span></div>
          <div class="asm-cap-bar">
            <div class="cap-pct">Remplissage : ${pct}%</div>
            <div class="cap-track"><div class="cap-fill" style="width:${pct}%;background:${color};"></div></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderSummaryBars(occupancyMap) {
    const container = document.getElementById('assembly-summary');
    if (!container) return;
    container.innerHTML = EvacAlgo.ASSEMBLY_POINTS.map(ap => {
      const occ = occupancyMap[ap.id] || 0;
      const pct = Math.min(100, Math.round((occ / ap.capacity) * 100));
      const color = pct > 80 ? '#ff1744' : pct > 50 ? '#ffab00' : '#00e676';
      return `
        <div class="assembly-bar-item">
          <div class="ab-header">
            <span>▲ ${ap.name}</span>
            <span class="ab-cap">${occ} / ${ap.capacity.toLocaleString()} · ${ap.altitude_m}m</span>
          </div>
          <div class="ab-track"><div class="ab-fill" style="width:${pct}%;background:${color};"></div></div>
        </div>
      `;
    }).join('');
  }

  return { renderCards, renderSummaryBars };
})();
