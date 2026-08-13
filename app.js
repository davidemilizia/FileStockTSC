// Riferimenti globali e stato dell'applicazione
let config = {
  token: localStorage.getItem("gh_token") || "",
  owner: localStorage.getItem("gh_owner") || "",
  repo: localStorage.getItem("gh_repo") || "",
  path: localStorage.getItem("gh_path") || "data/inventory.json"
};

let cinemaName = localStorage.getItem("cinema_name") || "Cinema Multisala";
let warehouses = ["Magazzino Principale", "Bar / Snack", "Cabina Proiezioni"];
let currentWarehouseIndex = 0;
let rows = []; // Lista prodotti [{code, name, uom}]
let inventoryData = {}; // Struttura: { "Magazzino 1": { "PROD01": 5, ... }, ... }
let fileSha = ""; // Necessario per l'update su GitHub REST API

// Utility di selezione rapida elementi DOM
function $(id) { return document.getElementById(id); }
function esc(str) { return str ? String(str).replace(/>/g, '&gt;').replace(/</g, '&lt;') : ''; }

// Inizializzazione all'avvio
document.addEventListener("DOMContentLoaded", () => {
  updateHeaderInfo();
  if (config.token && config.owner && config.repo) {
    loadDataFromGitHub();
  } else {
    loadDefaultData();
    openConfigModal();
  }
});

function updateHeaderInfo() {
  $("cinemaTitle").innerText = `Registro Manutenzione - ${cinemaName}`;
}

// Caricamento dati di fallback se non configurato GitHub
function loadDefaultData() {
  rows = [
    { code: "PROD-01", name: "Lampada Xenon Proiettore 4K", uom: "Pz" },
    { code: "PROD-02", name: "Olio lubrificante meccanica", uom: "Lt" },
    { code: "PROD-03", name: "Carta termica biglietteria", uom: "Rotoli" },
    { code: "PROD-04", name: "Bicchieri carta 0.4L", uom: "Pz" },
    { code: "PROD-05", name: "Popcorn mais (sacco)", uom: "Kg" }
  ];
  initWarehousesData();
  renderWarehouseSelect();
  renderTable();
}

function initWarehousesData() {
  inventoryData = {};
  warehouses.forEach(w => {
    inventoryData[w] = {};
    rows.forEach(r => {
      inventoryData[w][r.code] = 0;
    });
  });
}

// Interazione con GitHub API
async function loadDataFromGitHub() {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `token ${config.token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!response.ok) throw new Error("Errore nel recupero file da GitHub (verifica i permessi o il percorso).");
    
    const fileData = await response.json();
    fileSha = fileData.sha;
    
    const decodedContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
    
    cinemaName = decodedContent.cinemaName || "Cinema Multisala";
    warehouses = decodedContent.warehouses || ["Magazzino Principale"];
    rows = decodedContent.rows || [];
    inventoryData = decodedContent.inventoryData || {};

    localStorage.setItem("cinema_name", cinemaName);
    updateHeaderInfo();
    renderWarehouseSelect();
    renderTable();
    
    $("lastSync").innerText = `Ultimo aggiornamento: ${new Date().toLocaleTimeString()} (Sincronizzato)`;
  } catch (error) {
    console.error(error);
    alert("Impossibile caricare da GitHub: " + error.message + "\nCaricamento dati predefiniti.");
    loadDefaultData();
  }
}

async function saveData() {
  if (!config.token || !config.owner || !config.repo) {
    alert("Configura prima i parametri di GitHub!");
    openConfigModal();
    return;
  }

  const saveBtn = $("saveBtn");
  saveBtn.innerText = "Salvataggio in corso...";
  saveBtn.disabled = true;

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;
  
  const payloadData = {
    cinemaName,
    warehouses,
    rows,
    inventoryData
  };

  const jsonString = JSON.stringify(payloadData, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

  try {
    const bodyObj = {
      message: `Aggiornamento inventario/registro da ${cinemaName} - ${new Date().toLocaleString()}`,
      content: base64Content
    };
    if (fileSha) bodyObj.sha = fileSha;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${config.token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(bodyObj)
    });

    if (!response.ok) {
      const errJson = await response.json();
      throw new Error(errJson.message || "Errore durante il salvataggio.");
    }

    const resJson = await response.json();
    fileSha = resJson.content.sha;

    $("lastSync").innerText = `Ultimo aggiornamento: ${new Date().toLocaleTimeString()} (Salvato)`;
    alert("Dati salvati con successo su GitHub! ✅");
  } catch (error) {
    console.error(error);
    alert("Errore durante il salvataggio su GitHub: " + error.message);
  } finally {
    saveBtn.innerText = "💾 Salva su GitHub";
    saveBtn.disabled = false;
  }
}

// Renderizzazione componenti UI
function renderWarehouseSelect() {
  const select = $("warehouseSelect");
  select.innerHTML = "";
  warehouses.forEach((w, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.innerText = w;
    if (idx === currentWarehouseIndex) opt.selected = true;
    select.appendChild(opt);
  });
}

function changeWarehouse() {
  const select = $("warehouseSelect");
  currentWarehouseIndex = parseInt(select.value);
  renderTable();
}

function renderTable() {
  const tbody = $("inventoryBody");
  tbody.innerHTML = "";

  const activeWh = warehouses[currentWarehouseIndex];
  if (!inventoryData[activeWh]) inventoryData[activeWh] = {};

  rows.forEach(r => {
    const currentQty = inventoryData[activeWh][r.code] !== undefined ? inventoryData[activeWh][r.code] : 0;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${esc(r.code)}</code></td>
      <td><strong>${esc(r.name)}</strong></td>
      <td>${esc(r.uom)}</td>
      <td style="text-align: right;">
        <input type="number" min="0" step="any" value="${currentQty}" 
          class="qty-input" 
          onchange="updateQuantity('${r.code}', this.value)"
          style="width: 90px; text-align: right; padding: 6px; font-size: 1rem;">
      </td>
      <td style="text-align: center;">
        <button class="btn-icon" onclick="clearRow('${r.code}')" title="Azzera riga">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateQuantity(code, value) {
  const activeWh = warehouses[currentWarehouseIndex];
  const val = parseFloat(value);
  inventoryData[activeWh][code] = isNaN(val) ? 0 : val;
}

function clearRow(code) {
  const activeWh = warehouses[currentWarehouseIndex];
  inventoryData[activeWh][code] = 0;
  renderTable();
}

function resetCounts() {
  const activeWh = warehouses[currentWarehouseIndex];
  if (confirm(`Vuoi azzerare tutte le quantità per il magazzino "${activeWh}"?`)) {
    rows.forEach(r => {
      inventoryData[activeWh][r.code] = 0;
    });
    renderTable();
  }
}

// Esportazione Excel (CSV)
function exportToExcel() {
  let csvContent = "data:text/csv;charset=utf-8,Magazzino;Codice Prodotto;Nome Prodotto;Unita di Misura;Quantita\n";

  warehouses.forEach(wh => {
    rows.forEach(r => {
      const qty = inventoryData[wh] && inventoryData[wh][r.code] !== undefined ? inventoryData[wh][r.code] : 0;
      csvContent += `"${wh}","${r.code}","${r.name}","${r.uom}",${qty}\n`;
    });
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Inventario_${cinemaName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Gestione Modale Configurazione
function openConfigModal() {
  $("cfgCinemaName").value = cinemaName;
  $("cfgToken").value = config.token;
  $("cfgOwner").value = config.owner;
  $("cfgRepo").value = config.repo;
  $("cfgPath").value = config.path;
  $("configModal").style.display = "flex";
}

function closeConfigModal() {
  $("configModal").style.display = "none";
}

function saveConfig() {
  cinemaName = $("cfgCinemaName").value.trim() || "Cinema Multisala";
  config.token = $("cfgToken").value.trim();
  config.owner = $("cfgOwner").value.trim();
  config.repo = $("cfgRepo").value.trim();
  config.path = $("cfgPath").value.trim() || "data/inventory.json";

  localStorage.setItem("cinema_name", cinemaName);
  localStorage.setItem("gh_token", config.token);
  localStorage.setItem("gh_owner", config.owner);
  localStorage.setItem("gh_repo", config.repo);
  localStorage.setItem("gh_path", config.path);

  updateHeaderInfo();
  closeConfigModal();

  if (config.token && config.owner && config.repo) {
    loadDataFromGitHub();
  } else {
    alert("Configurazione salvata in locale (GitHub non configurato completamente).");
  }
}

/* --- GESTIONE STAMPA MAGAZZINI CARTACEI --- */
function openPrintModal() {
  const container = $("printWarehouseCheckboxes");
  if (!container) return;
  container.innerHTML = "";

  warehouses.forEach((w, idx) => {
    const label = document.createElement("label");
    label.style.cssText = "display: flex; align-items: center; gap: 10px; font-size: 1rem; cursor: pointer;";
    label.innerHTML = `
      <input type="checkbox" value="${idx}" checked style="width: 18px; height: 18px;">
      <span>📍 ${esc(w)}</span>
    `;
    container.appendChild(label);
  });

  $("printModal").style.display = "flex";
}

function closePrintModal() {
  $("printModal").style.display = "none";
}

function executePrint() {
  const checkboxes = document.querySelectorAll("#printWarehouseCheckboxes input[type='checkbox']:checked");
  const selectedWhIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (selectedWhIndices.length === 0) {
    alert("Seleziona almeno un magazzino da stampare!");
    return;
  }

  closePrintModal();

  let printWindow = window.open('', '_blank');
  
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Stampa Inventario - ${esc(cinemaName)}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 10px; }
        h1 { font-size: 16pt; margin-bottom: 5px; text-transform: uppercase; }
        h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 4px; }
        .meta { font-size: 10pt; margin-bottom: 15px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: middle; }
        th { background-color: #f0f0f0; font-size: 10pt; }
        .num { text-align: right; }
        .center { text-align: center; }
        @media print {
          body { padding: 0; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>📊 Inventario Magazzino — ${esc(cinemaName)}</h1>
      <div class="meta">Data stampa: ${new Date().toLocaleDateString('it-IT')}</div>
  `;

  selectedWhIndices.forEach(wIdx => {
    const whName = warehouses[wIdx];
    htmlContent += `
      <h2>📍 Postazione / Magazzino: ${esc(whName)}</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 45%;">Prodotto</th>
            <th style="width: 10%;" class="center">U.M.</th>
            <th style="width: 45%;" class="center">Conteggio Manuale (8 celle vuote per Box / Sleeve / Sfuso)</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach(r => {
      let emptyCellsHtml = '';
      for (let i = 0; i < 8; i++) {
        emptyCellsHtml += `<span style="display:inline-block; width:28px; height:24px; border:1px solid #777; margin-right:4px; text-align:center; vertical-align:middle;"></span>`;
      }

      htmlContent += `
        <tr>
          <td><strong>${esc(r.code)}</strong> - ${esc(r.name)}</td>
          <td class="center">${esc(r.uom)}</td>
          <td class="center" style="white-space: nowrap;">${emptyCellsHtml}</td>
        </tr>
      `;
    });

    htmlContent += `
        </tbody>
      </table>
    `;
  });

  htmlContent += `
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
