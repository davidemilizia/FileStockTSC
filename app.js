// ==========================================
// CONFIGURAZIONE E STATO GLOBALE
// ==========================================
let cinemaName = "Cinema Esempio"; // Sostituire o dinamicizzare con il nome reale del cinema attivo
let candyGridConfigs = JSON.parse(localStorage.getItem("candyGridConfigs")) || {};

// ==========================================
// UTILITY FUNZIONI (Helper per i calcoli e stringhe)
// ==========================================
function n(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

function fmt(val) {
  return n(val).toFixed(2);
}

function esc(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function $(id) {
  return document.getElementById(id);
}

// ==========================================
// GESTIONE CONFIGURAZIONE E LOCAL STORAGE
// ==========================================
function getActiveCinemaCandyConfig() {
  if (!candyGridConfigs[cinemaName]) {
    candyGridConfigs[cinemaName] = {
      columns: 22, 
      rows: 4, 
      tareCaselle: [0.37, 0.72, 0.50, 0.00], 
      gridValues: {}, 
      gridTares: {},  
      buste: Array(10).fill({kg: 0, sleeve: 0})
    };
  }
  
  if (!candyGridConfigs[cinemaName].tareCaselle) {
    candyGridConfigs[cinemaName].tareCaselle = [0.37, 0.72, 0.50, 0.00];
  }
  if (!candyGridConfigs[cinemaName].gridTares) {
    candyGridConfigs[cinemaName].gridTares = {};
  }
  return candyGridConfigs[cinemaName];
}

function saveCandyConfig() {
  localStorage.setItem("candyGridConfigs", JSON.stringify(candyGridConfigs));
}

// ==========================================
// LOGICA DI CALCOLO DEL PESO NETTO
// ==========================================
function getCandyTotalKg() {
  const cfg = getActiveCinemaCandyConfig();
  let total = 0;
  
  for(let r=0; r<cfg.rows; r++) {
    for(let c=0; c<cfg.columns; c++) {
      let val = n(cfg.gridValues[r]?.[c] || 0);
      
      let taraIndex = cfg.gridTares[r]?.[c] ?? 0;
      let tara = n(cfg.tareCaselle[taraIndex] || 0);
      
      total += Math.max(0, val - tara);
    }
  }
  
  if (Array.isArray(cfg.buste)) {
    cfg.buste.forEach(b => {
      total += n(b.kg) + (n(b.sleeve) * 0.1);
    });
  }
  return total;
}

// ==========================================
// FUNZIONI DI AGGIORNAMENTO DATI DI INPUT
// ==========================================
function updateCasellaTara(index, val) {
  const cfg = getActiveCinemaCandyConfig();
  cfg.tareCaselle[index] = n(val);
  saveCandyConfig();
  renderCandyView(); 
}

function updateCellTaraSelection(r, c, taraIndex) {
  const cfg = getActiveCinemaCandyConfig();
  if (!cfg.gridTares[r]) cfg.gridTares[r] = {};
  cfg.gridTares[r][c] = parseInt(taraIndex);
  saveCandyConfig();
  $("candyTotalDisplay").textContent = fmt(getCandyTotalKg());
}

function updateCandyCell(r, c, val) {
  const cfg = getActiveCinemaCandyConfig();
  if(!cfg.gridValues[r]) cfg.gridValues[r] = {};
  cfg.gridValues[r][c] = n(val);
  saveCandyConfig();
  $("candyTotalDisplay").textContent = fmt(getCandyTotalKg());
}

function updateCandyBuste(idx, field, val) {
  const cfg = getActiveCinemaCandyConfig();
  if(!cfg.buste) cfg.buste = Array(10).fill({kg: 0, sleeve: 0});
  if(!cfg.buste[idx]) cfg.buste[idx] = {kg: 0, sleeve: 0};
  cfg.buste[idx][field] = n(val);
  saveCandyConfig();
  $("candyTotalDisplay").textContent = fmt(getCandyTotalKg());
}

function updateCandyDim() {
  const cfg = getActiveCinemaCandyConfig();
  const newCols = parseInt($("candyCols").value);
  const newRows = parseInt($("candyRows").value);
  
  if (newCols > 0 && newRows > 0) {
    cfg.columns = newCols;
    cfg.rows = newRows;
    saveCandyConfig();
    renderCandyView();
  }
}

// ==========================================
// INTERFACCIA UTENTE (RENDERING)
// ==========================================
function renderCandyView() {
  const cfg = getActiveCinemaCandyConfig();
  
  if ($("count")) {
    $("count").textContent = `Gestione Caramelle (${cinemaName})`;
  }
  
  if ($("thead")) {
    $("thead").innerHTML = `
      <tr>
        <th style="background: #212529; color: white; padding: 12px;">Magazzino Caramelle Dedicato — ${esc(cinemaName)}</th>
      </tr>
    `;
  }

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">
    <!-- PARAMETRI GRIGLIA E TARE IN ALTO -->
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 30px; align-items: center;">
      <div>
        <h4 style="color: #1a237e; margin-bottom: 8px;">Dimensioni Griglia</h4>
        <div style="display: flex; gap: 15px;">
          <label>Colonne: <input type="number" id="candyCols" value="${cfg.columns}" style="width: 60px; padding: 4px;" onchange="updateCandyDim()"></label>
          <label>Righe: <input type="number" id="candyRows" value="${cfg.rows}" style="width: 60px; padding: 4px;" onchange="updateCandyDim()"></label>
        </div>
      </div>
      
      <div style="flex: 1; min-width: 300px;">
        <h4 style="color: #1a237e; margin-bottom: 8px;">Caselle Tare Predefinite (Kg)</h4>
        <div style="display: flex; gap: 10px;">
          ${[0, 1, 2, 3].map(i => `
            <div style="text-align: center;">
              <span style="font-size: 0.75rem; font-weight: bold; color: #666; display: block;">Tara ${i + 1}</span>
              <input type="number" step="any" value="${cfg.tareCaselle[i] ?? 0}" style="width: 75px; padding: 5px; text-align: center; font-weight: bold; border: 1px solid #ccc; border-radius: 4px;" onchange="updateCasellaTara(${i}, this.value)">
            </div>
          `).join('')}
        </div>
      </div>

      <div style="font-size: 1.4rem; font-weight: bold; color: #0d47a1; text-align: right;">
        Totale Caramelle: <span id="candyTotalDisplay">${fmt(getCandyTotalKg())}</span> Kg
      </div>
    </div>

    <!-- GRIGLIA DI CONTEGGIO -->
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow-x: auto;">
      <h4 style="margin-bottom: 10px;">Inserimento Pesi Lordi & Selezione Tara</h4>
      <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #343a40; color: white;">
            <th style="padding: 8px; width: 80px;">Riga</th>`;
  for(let c=0; c<cfg.columns; c++) {
    html += `<th style="padding: 8px; text-align:center;">Col ${c+1}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for(let r=0; r<cfg.rows; r++) {
    html += `<tr>
      <td style="background: #e9ecef; font-weight: bold; padding: 8px; text-align: center;">Riga ${r+1}</td>`;
    for(let c=0; c<cfg.columns; c++) {
      let val = cfg.gridValues[r]?.[c] || "";
      let selectedTaraIdx = cfg.gridTares[r]?.[c] ?? 0;
      
      html += `<td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; min-width: 75px;">
        <!-- Input Peso Lordo -->
        <input type="number" step="any" class="qty-input" value="${val}" style="width: 65px; font-size: 0.9rem; margin-bottom: 4px;" placeholder="Lordo" oninput="updateCandyCell(${r}, ${c}, this.value)">
        <!-- Menu a tendina selezione Tara -->
        <select style="width: 65px; font-size: 0.75rem; padding: 2px; border-radius: 3px; border: 1px solid #bbb;" onchange="updateCellTaraSelection(${r}, ${c}, this.value)">
          ${[0, 1, 2, 3].map(i => `
            <option value="${i}" ${selectedTaraIdx == i ? 'selected' : ''}>T${i+1} (${cfg.tareCaselle[i]})</option>
          `).join('')}
        </select>
      </td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div>

    <!-- SEZIONE BUSTE SCIOLTE -->
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-top: 20px;">
      <h4 style="margin-bottom: 10px;">Buste / Sacchetti Sciolti</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">`;
  
  for(let i=0; i<10; i++) {
    let b = cfg.buste[i] || {kg: 0, sleeve: 0};
    html += `<div style="background: #f1f3f5; padding: 10px; border-radius: 6px;">
      <strong>Elemento ${i+1}</strong><br>
      Kg: <input type="number" step="any" value="${b.kg || ''}" style="width:70px;" oninput="updateCandyBuste(${i}, 'kg', this.value)"><br>
      Sleeve: <input type="number" step="any" value="${b.sleeve || ''}" style="width:70px; margin-top:4px;" oninput="updateCandyBuste(${i}, 'sleeve', this.value)">
    </div>`;
  }
  html += `</div></div></td></tr>`;

  if ($("tbody")) {
    $("tbody").innerHTML = html;
  }
}

// ==========================================
// INIZIALIZZAZIONE DELLA PAGINA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  renderCandyView();
});
