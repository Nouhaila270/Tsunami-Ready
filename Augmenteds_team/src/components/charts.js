/**
 * charts.js — Graphiques Chart.js
 */
const Charts = (() => {
  let cFlux=null, cMag=null;
  const base = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#0b1521', borderColor:'#1e3048', borderWidth:1, titleColor:'#d0e8f5', bodyColor:'#7a9bb5' } },
    scales:{
      x:{ grid:{color:'rgba(30,48,72,0.6)'}, ticks:{color:'#3d5a72',font:{family:'DM Mono',size:10}} },
      y:{ grid:{color:'rgba(30,48,72,0.6)'}, ticks:{color:'#3d5a72',font:{family:'DM Mono',size:10}} }
    }
  };

  function init() {
    const cf = document.getElementById('chart-flux');
    if (cf) cFlux = new Chart(cf, {
      type:'line',
      data:{ labels:Array(14).fill('—'), datasets:[{
        data:Array(14).fill(0), borderColor:'#00b4d8', backgroundColor:'rgba(0,180,216,0.07)',
        borderWidth:2, fill:true, tension:0.4, pointRadius:2, pointBackgroundColor:'#00b4d8'
      }] },
      options:{...base, animation:{duration:400}}
    });

    const cm = document.getElementById('chart-seismes');
    if (cm) cMag = new Chart(cm, {
      type:'bar',
      data:{ labels:[], datasets:[{
        data:[], borderWidth:0, borderRadius:4,
        backgroundColor: ctx => {
          const v = ctx.raw;
          return v>=6.5?'rgba(255,23,68,0.75)':v>=4?'rgba(255,171,0,0.7)':'rgba(0,230,118,0.5)';
        }
      }] },
      options:{...base, scales:{...base.scales, y:{...base.scales.y, min:0, max:9}}}
    });
  }

  function updateFlux(history) {
    if (!cFlux) return;
    cFlux.data.labels = history.map((_,i)=>`-${(history.length-i-1)*5}s`);
    cFlux.data.datasets[0].data = history;
    cFlux.update('none');
  }

  function updateMag(events) {
    if (!cMag) return;
    const r = events.slice(0,8);
    cMag.data.labels = r.map(e=>e.location?e.location.substring(0,8):'?');
    cMag.data.datasets[0].data = r.map(e=>e.magnitude);
    cMag.update();
  }

  return { init, updateFlux, updateMag };
})();
