let mag = [], size = [], rows = [], postMixProducts = [];
let cinemaName = "TSC Beinasco";
let warehouses = ["Bar Principale", "Deposito Centrale", "Stand Popcorn"]; 
let currentTab = 0; 
let countsData = {}; 

const MAX_FIELDS = 10;

const DEFAULT_CINEMAS = [
  "TSC Beinasco", "TSC Belpasso", "TSC Bologna", "TSC Casamassima", "TSC Catanzaro",
  "TSC Cerro Maggiore", "TSC Corciano", "TSC Firenze", "TSC Genova", "TSC Grosseto",
  "TSC Guidonia", "Sede Piazza Augusto Imperatore", "TSC Lamezia Terme", "TSC Limena",
  "TSC Livorno", "TSC Lugagnano", "TSC Montebello", "TSC Montesilvano", "TSC Napoli",
  "TSC Nola", "TSC Parma Barilla", "TSC Parma Campus", "TSC Pradamano", "TSC Quartucciu",
  "TSC Roma Moderno", "TSC Roma Parco de' Medici", "TSC Rozzano", "TSC Salerno",
  "TSC Sestu", "TSC Silea", "TSC Surbo", "TSC Terni", "TSC Torino",
  "TSC Torri di Quartesolo", "TSC Trieste", "TSC Vimercate"
];

/* --- CONFIGURAZIONE DINAMICA BLOCCHI CARAMELLE --- */
let candyGridConfigs = JSON.parse(localStorage.getItem("candy_grid_configs")) || {};

function getActiveCinemaCandyConfig() {
  if (!candyGridConfigs[cinemaName]) {
    candyGridConfigs[cinemaName] = {
      blocksCount: 2,
      orientation: "vertical",
      tares: [0.37, 0.72, 0.50, 1.00],
      blocks: [
        { id: "block_0", name: "🍬 Espositore Principale", columns: 22, rows: 2, gridValues: {} },
        { id: "block_1", name: "📦 Scorte / Magazzino", columns: 10, rows: 2, gridValues: {} }
      ],
      buste: Array(10).fill({kg: 0, sleeve: 0})
    };
  }
  let cfg = candyGridConfigs[cinemaName];
  if (cfg.blocksCount === undefined) cfg.blocksCount = cfg.blocks ? cfg.blocks.length : 2;
  if (!cfg.orientation) cfg.orientation = "vertical";
  if (!cfg.tares || !Array.isArray(cfg.tares)) cfg.tares = [0.37, 0.72, 0.50, 1.00];
  if (!cfg.blocks || !Array.isArray(cfg.blocks)) {
    cfg.blocks = [
      { id: "block_0", name: "🍬 Espositore Principale", columns: 22, rows: 2, gridValues: {} },
      { id: "block_1", name: "📦 Scorte / Magazzino", columns: 10, rows: 2, gridValues: {} }
    ];
  }
  if (!cfg.buste || !Array.isArray(cfg.buste)) cfg.buste = Array(10).fill({kg: 0, sleeve: 0});
  return cfg;
}

function saveCandyConfig() {
  localStorage.setItem("candy_grid_configs", JSON.stringify(candyGridConfigs));
}

function getCandyTotalKg() {
  const cfg = getActiveCinemaCandyConfig();
  let total = 0;
  if (cfg.blocks && Array.isArray(cfg.blocks)) {
    cfg.blocks.forEach(block => {
      let rowsCount = parseInt(block.rows) || 0;
      let colsCount = parseInt(block.columns) || 0;
      for(let r=0; r<rowsCount; r++) {
        for(let c=0; c<colsCount; c++) {
          let cellData = block.gridValues?.[r]?.[c];
          if (cellData) {
            let weight = n(cellData.weight || 0);
            let taraIdx = parseInt(cellData.taraIdx) || 0;
            let taraVal = n(cfg.tares[taraIdx] || 0);
            total += Math.max(0, weight - taraVal);
          }
        }
      }
    });
  }
  if (Array.isArray(cfg.buste)) {
    cfg.buste.forEach(b => { total += n(b.kg) + (n(b.sleeve) * 0.1); });
  }
  return total;
}

/* --- CONFIGURAZIONE DINAMICA POST MIX --- */
let postMixGridConfigs = JSON.parse(localStorage.getItem("postmix_grid_configs")) || {};

function getActiveCinemaPostMixConfig() {
  if (!postMixGridConfigs[cinemaName]) {
    postMixGridConfigs[cinemaName] = {
      blocksCount: 1,
      orientation: "vertical",
      blocks: [
        { id: "pm_block_0", name: "🥤 Post Mix Principale", columns: 6, rows: 4, gridValues: {} }
      ]
    };
  }
  let cfg = postMixGridConfigs[cinemaName];
  if (cfg.blocksCount === undefined) cfg.blocksCount = cfg.blocks ? cfg.blocks.length : 1;
  if (!cfg.orientation) cfg.orientation = "vertical";
  if (!cfg.blocks || !Array.isArray(cfg.blocks)) {
    cfg.blocks = [{ id: "pm_block_0", name: "🥤 Post Mix Principale", columns: 6, rows: 4, gridValues: {} }];
  }
  return cfg;
}

function savePostMixConfig() {
  localStorage.setItem("postmix_grid_configs", JSON.stringify(postMixGridConfigs));
}

function getPostMixProductTotals() {
  const cfg = getActiveCinemaPostMixConfig();
  let totals = {}; 
  
  if (cfg.blocks && Array.isArray(cfg.blocks)) {
    cfg.blocks.forEach(block => {
      let rowsCount = parseInt(block.rows) || 0;
      let colsCount = parseInt(block.columns) || 0;
      for(let r=0; r<rowsCount; r++) {
        for(let c=0; c<colsCount; c++) {
          let cellData = block.gridValues?.[r]?.[c];
          if (cellData && cellData.prodName) {
            let weight = n(cellData.weight || 0);
            let prodName = cellData.prodName;
            
            let pmItem = postMixProducts.find(p => p.name === prodName);
            let taraVal = pmItem ? n(pmItem.tara) : 0;
            
            let netKg = Math.max(0, weight - taraVal);
            totals[prodName] = (totals[prodName] || 0) + netKg;
          }
        }
      }
    });
  }
  return totals;
}

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  loadSetupFromStorage();
  loadCountsFromStorage();
  updateHeaderTitle();

  $("magFile").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    $("magStatus").textContent = "Lettura del report in corso...";
    readMatrix(f).then(m => {
      mag = parseMag(m);
      $("magStatus").textContent = `✓ ${f.name} (${mag.length} articoli)`;
      build();
    }).catch(err => {
      $("magStatus").textContent = "❌ Errore file Magazzino";
      showError("Errore file Magazzino: " + err.message);
    });
  });

  $("sizeFile").addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    $("sizeStatus").textContent = "Lettura anagrafica in corso...";
    readMatrix(f).then(m => {
      let parsedSizeResult = parseSize(m);
      size = parsedSizeResult.size;
      postMixProducts = parsedSizeResult.postMix;
      $("sizeStatus").textContent = `✓ ${f.name} (${size.length} articoli, ${postMixProducts.length} post-mix)`;
      build();
    }).catch(err => {
      $("sizeStatus").textContent = "❌ Errore file SIZE";
      showError("Errore file SIZE: " + err.message);
    });
  });

  $("search").addEventListener("input", render);
});

function toggleFilesSection() {
  const sec = $("filesSection");
  sec.style.display = (sec.style.display === "none") ? "grid" : "none";
}

function updateHeaderTitle() {
  $("appTitle").textContent = `📊 Gestione Inventario — ${cinemaName}`;
}

function showError(msg) { alert(msg); }

/* ---------------- SETUP & STORAGE ---------------- */
function loadSetupFromStorage() {
  const savedCinema = localStorage.getItem("cinema_info_name");
  if (savedCinema) cinemaName = savedCinema;
  const savedWh = localStorage.getItem("cinema_warehouses");
  if (savedWh) { try { warehouses = JSON.parse(savedWh); } catch(e){} }
}

function loadCountsFromStorage() {
  const savedCounts = localStorage.getItem("inventory_counts");
  if (savedCounts) { try { countsData = JSON.parse(savedCounts); } catch(e){} }
}

function saveCountsToStorage() {
  localStorage.setItem("inventory_counts", JSON.stringify(countsData));
}

function resetCounts() {
  if (confirm("Sei sicuro di voler azzerare tutti i conteggi inseriti per tutti i magazzini?")) {
    countsData = {};
    saveCountsToStorage();
    render();
  }
}

function handleCinemaSelectChange() {
  const sel = $("cinemaSelect").value;
  $("customCinemaDiv").style.display = (sel === "__CUSTOM__") ? "block" : "none";
}

function saveWarehousesSetup() {
  const sel = $("cinemaSelect").value;
  if (sel === "__CUSTOM__") {
    const customVal = $("customCinemaInput").value.trim();
    if (!customVal) { alert("Inserisci il nome della nuova sede!"); return; }
    cinemaName = customVal;
  } else {
    cinemaName = sel;
  }
  localStorage.setItem("cinema_info_name", cinemaName);

  const inputs = document.querySelectorAll(".wh-input-item");
  const newWh = [];
  inputs.forEach(inp => {
    const val = inp.value.trim();
    if (val) newWh.push(val);
  });
  if (newWh.length === 0) { alert("Inserisci almeno un magazzino!"); return; }
  
  warehouses = newWh;
  localStorage.setItem("cinema_warehouses", JSON.stringify(warehouses));
  
  updateHeaderTitle();
  currentTab = 0;
  switchTab();
}

function renderSetupView() {
  $("tabContent").style.display = "none";
  $("setupView").style.display = "block";
  
  const select = $("cinemaSelect");
  select.innerHTML = "";
  let matched = false;
  DEFAULT_CINEMAS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (c === cinemaName) { opt.selected = true; matched = true; }
    select.appendChild(opt);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "__CUSTOM__";
  customOpt.textContent = "➕ Altro / Aggiungi nuovo cinema...";
  if (!matched && cinemaName) {
    customOpt.selected = true;
    $("customCinemaDiv").style.display = "block";
    $("customCinemaInput").value = cinemaName;
  } else {
    $("customCinemaDiv").style.display = "none";
  }
  select.appendChild(customOpt);
  
  const container = $("whList");
  container.innerHTML = "";
  warehouses.forEach((w) => {
    const div = document.createElement("div");
    div.className = "wh-item";
    div.style.cssText = "display: flex; gap: 10px; margin-bottom: 8px;";
    div.innerHTML = `
      <input class="wh-input-item" value="${esc(w)}" placeholder="Nome Magazzino" style="flex:1; padding: 6px 10px;">
      <button class="btn btn-danger" onclick="this.parentElement.remove()" style="background:#d32f2f; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Elimina</button>
    `;
    container.appendChild(div);
  });
}

function addWarehouseInput() {
  const container = $("whList");
  const div = document.createElement("div");
  div.className = "wh-item";
  div.style.cssText = "display: flex; gap: 10px; margin-bottom: 8px;";
  div.innerHTML = `
    <input class="wh-input-item" value="Magazzino ${container.children.length + 1}" placeholder="Nome Magazzino" style="flex:1; padding: 6px 10px;">
    <button class="btn btn-danger" onclick="this.parentElement.remove()" style="background:#d32f2f; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Elimina</button>
  `;
  container.appendChild(div);
}

/* ---------------- TABS RENDER ---------------- */
function renderTabs() {
  const bar = $("tabsBar");
  bar.innerHTML = "";

  warehouses.forEach((w, idx) => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${currentTab === idx ? 'active' : ''}`;
    btn.textContent = `📍 ${w}`;
    btn.onclick = () => { currentTab = idx; switchTab(); };
    bar.appendChild(btn);
  });

  const btnCandy = document.createElement("button");
  btnCandy.className = `tab-btn ${currentTab === 'candy' ? 'active' : ''}`;
  btnCandy.textContent = `🍬 Caramelle`;
  btnCandy.onclick = () => { currentTab = 'candy'; switchTab(); };
  bar.appendChild(btnCandy);

  const btnPostMix = document.createElement("button");
  btnPostMix.className = `tab-btn ${currentTab === 'postmix' ? 'active' : ''}`;
  btnPostMix.textContent = `🥤 Post Mix`;
  btnPostMix.onclick = () => { currentTab = 'postmix'; switchTab(); };
  bar.appendChild(btnPostMix);

  const totBtn = document.createElement("button");
  totBtn.className = `tab-btn ${currentTab === 'tot' ? 'active' : ''}`;
  totBtn.textContent = `📊 RIEPILOGO TOTALE`;
  totBtn.onclick = () => { currentTab = 'tot'; switchTab(); };
  bar.appendChild(totBtn);
}

function switchTab() {
  renderTabs();
  if (currentTab === 'setup') {
    renderSetupView();
  } else {
    $("setupView").style.display = "none";
    $("tabContent").style.display = "block";
    render();
  }
}

/* ---------------- EXCEL PARSING (MULTI-FOGLIO) ---------------- */
function readMatrix(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        if (typeof XLSX === "undefined") throw new Error("Libreria XLSX non presente.");
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: false });
        if (!wb.SheetNames || !wb.SheetNames.length) throw new Error("Nessun foglio trovato.");
        
        let combinedMatrix = [];
        // Legge tutti i fogli presenti nel workbook Excel e li unisce in un'unica matrice
        wb.SheetNames.forEach(sheetName => {
          const sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "", raw: true });
          if (sheetData && sheetData.length > 0) {
            combinedMatrix = combinedMatrix.concat(sheetData);
          }
        });

        resolve(combinedMatrix);
      } catch (x) { reject(x); }
    };
    r.onerror = () => reject(new Error("Errore nella lettura fisica del file."));
    r.readAsArrayBuffer(file);
  });
}

function text(v) { return String(v ?? "").trim(); }
function cleanCode(val) {
  if (val === null || val === undefined) return "";
  let s = text(val);
  if (/^\d+$/.test(s)) s = String(parseInt(s, 10));
  return s;
}

function n(v) {
  if (typeof v === "number") return v;
  let s = text(v).replace(/\s/g, "").replace(/€/g, "");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const x = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
}

function norm(v) { return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toUpperCase(); }
function esc(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmt(val) { return Number(val || 0).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtMoney(val) { return Number(val || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* PARSER MAGAZZINO */
function parseMag(m) {
  const out = [];
  for (let i = 0; i < m.length; i++) {
    const r = m[i];
    if (!r || !r.length) continue;
    const uom = text(r[2]).trim().toUpperCase();
    if (!uom || (uom !== "PZ" && uom !== "KG" && uom !== "LT" && uom !== "CL" && uom !== "GR")) continue;

    let name = "";
    if (i + 1 < m.length && m[i + 1]) name = text(m[i + 1][1] || m[i + 1][0]).trim();
    if (!name) name = text(r[1]).trim();

    const rawCode = text(r[1]).trim();
    const code = cleanCode(rawCode);

    const iniziale = n(r[5]);
    const danni = n(r[14]);
    const venduto = n(r[18]);
    let atteso = n(r[23]);
    if (atteso === 0 && (iniziale > 0 || venduto > 0)) atteso = iniziale - danni - venduto;

    const standardCost = Math.abs(n(r[29] || r[32] || 0));

    out.push({ rawCode, code, name, uom, iniziale, danni, venduto, atteso, standardCost });
  }
  if (out.length === 0) throw new Error("Nessun prodotto trovato nel report Magazzino.");
  return out;
}

/* PARSER SIZE, KIT & POSTMIX */
function parseSize(m) {
  const sizeOut = [];
  const postMixOut = [];
  let section = "SIZE"; 

  for (let i = 0; i < m.length; i++) {
    const r = m[i];
    if (!r || !r.length) continue;

    const firstVal = text(r[0]);
    const normFirst = norm(firstVal);

    if (normFirst === "KIT" || norm(r[1]) === "TIPO" || (normFirst === "" && norm(r[1]) === "TIPO")) {
      section = "KIT";
      continue;
    }
    if (normFirst === "POSTMIX" || normFirst === "POST MIX" || norm(r[1]) === "TARA" || norm(r[2]) === "TARA") {
      section = "POSTMIX";
      continue;
    }

    if (section === "KIT") {
      const kitName = firstVal;
      const kitType = text(r[1]); 
      if (!kitName || normFirst === "PRODOTTO" || normFirst === "KIT") continue;

      const ingredients = [];
      let currentIngName = "";
      for (let c = 2; c < r.length; c++) {
        const val = r[c];
        if (val === null || val === undefined || String(val).trim() === "") continue;
        const numericVal = Number(val);
        if (!isNaN(numericVal) && typeof val !== "string" && !isNaN(parseFloat(val))) {
          if (currentIngName && numericVal > 0) {
            ingredients.push({ name: currentIngName, qty: numericVal });
            currentIngName = ""; 
          }
        } else {
          const textVal = text(val);
          if (norm(textVal) !== "PRODOTTO" && norm(textVal) !== "Q.TA") currentIngName = textVal;
        }
      }
      sizeOut.push({
        code: "KIT_" + cleanCode(kitName),
        name: kitName,
        boxSize: 1,
        sleeveSize: 0,
        isKit: true,
        kitType,
        ingredients
      });
    } else if (section === "POSTMIX") {
      const prodName = firstVal;
      // Nel foglio POSTMIX la tara si trova nella terza colonna (indice 2)
      const taraVal = n(r[2] !== undefined && r[2] !== "" ? r[2] : r[1]);
      if (!prodName || normFirst === "PRODOTTO" || normFirst === "TARA") continue;
      postMixOut.push({ name: prodName, tara: taraVal });
    } else {
      const name = firstVal;
      const normName = norm(name);
      if (!name || name === "#N/D" || normName.includes("PRODOTTO") || normName.includes("DESCRIZIONE") || normName.includes("BOX")) continue;

      const boxSize = n(r[1]);
      const sleeveSize = n(r[2]);

      let primaryCode = "";
      for (let c = 4; c < r.length; c++) {
        const valStr = text(r[c]);
        if (valStr && !primaryCode) { primaryCode = cleanCode(valStr); break; }
      }
      if (!primaryCode) primaryCode = cleanCode(name);

      sizeOut.push({
        code: primaryCode,
        rawCode: primaryCode,
        name,
        boxSize,
        sleeveSize,
        isKit: false,
        ingredients: []
      });
    }
  }

  return { size: sizeOut, postMix: postMixOut };
}

/* BUILD E ORDINAMENTO KIT IN FONDO */
function build() {
  if (!mag.length || !size.length) {
    $("mainStatus").style.display = "block";
    $("mainStatus").innerHTML = `Magazzino: <b>${mag.length}</b> · SIZE: <b>${size.length}</b><br>Carica entrambi i file per continuare.`;
    return;
  }

  const sizeByCode = new Map();
  const sizeByName = new Map();

  size.forEach(s => {
    if (s.code) sizeByCode.set(s.code, s);
    if (s.name) sizeByName.set(norm(s.name), s);
  });

  rows = mag.map(x => {
    let s = sizeByCode.get(x.code) || sizeByName.get(norm(x.name)) || {};
    return { 
      ...x, 
      boxSize: s.boxSize || 0, 
      sleeveSize: s.sleeveSize || 0,
      isKit: !!s.isKit,
      ingredients: s.ingredients || []
    };
  });

  size.forEach(s => {
    if (s.isKit) {
      const exists = rows.some(r => norm(r.name) === norm(s.name));
      if (!exists) {
        rows.push({
          rawCode: s.code, code: s.code, name: s.name, uom: s.kitType || "BOX",
          iniziale: 0, danni: 0, venduto: 0, atteso: 0, standardCost: 0,
          boxSize: s.boxSize || 1, sleeveSize: s.sleeveSize || 0, isKit: true, ingredients: s.ingredients || []
        });
      }
    }
  });

  rows.sort((a, b) => {
    if (a.isKit && !b.isKit) return 1;
    if (!a.isKit && b.isKit) return -1;
    return a.name.localeCompare(b.name);
  });

  $("filesSection").style.display = "none";
  $("mainStatus").style.display = "none";
  $("setupView").style.display = "none";
  $("tabContent").style.display = "block";

  if (typeof currentTab === 'string' && currentTab !== 'tot' && currentTab !== 'candy' && currentTab !== 'postmix') currentTab = 0;

  renderTabs();
  render();
}

/* ---------------- DATA CALCULATIONS ---------------- */
function getCount(whIdx, code) {
  if (!countsData[whIdx]) countsData[whIdx] = {};
  if (!countsData[whIdx][code]) countsData[whIdx][code] = { box: [0], sleeve: [0], sfuso: [0] };
  const c = countsData[whIdx][code];
  if (!Array.isArray(c.box)) c.box = [n(c.box)];
  if (!Array.isArray(c.sleeve)) c.sleeve = [n(c.sleeve)];
  if (!Array.isArray(c.sfuso)) c.sfuso = [n(c.sfuso)];
  return c;
}

function sumArr(arr) { return arr.reduce((a, b) => a + n(b), 0); }

function getKitContributionDetail(productName, productCode) {
  let kitContribution = 0;
  const cleanStr = (str) => norm(str).replace(/[^A-Z0-9]/g, "");
  const normProdName = cleanStr(productName);
  const normProdCode = cleanCode(productCode);

  rows.forEach(rowItem => {
    if (rowItem.isKit && rowItem.ingredients && rowItem.ingredients.length > 0) {
      rowItem.ingredients.forEach(ing => {
        const normIngName = cleanStr(ing.name);
        const normIngCode = cleanCode(ing.code);
        const matchCode = (normProdCode && normIngCode && normProdCode === normIngCode);
        const matchName = (normProdName.includes(normIngName) || normIngName.includes(normProdName));

        if (matchCode || matchName) {
          warehouses.forEach((_, wIdx) => {
            const kitCounts = getCount(wIdx, rowItem.code);
            const kitBoxTot = sumArr(kitCounts.box);
            const kitSleeveTot = sumArr(kitCounts.sleeve);
            const kitSfusoTot = sumArr(kitCounts.sfuso);
            const kitTotalPezzi = (kitBoxTot * rowItem.boxSize) + (kitSleeveTot * rowItem.sleeveSize) + kitSfusoTot;
            kitContribution += kitTotalPezzi * ing.qty;
          });
        }
      });
    }
  });
  return kitContribution;
}

function getGlobalRilevato(code, r) {
  let totBox = 0, totSleeve = 0, totSfuso = 0;
  warehouses.forEach((_, idx) => {
    const c = getCount(idx, code);
    totBox += sumArr(c.box);
    totSleeve += sumArr(c.sleeve);
    totSfuso += sumArr(c.sfuso);
  });
  
  let basePezzi = (totBox * r.boxSize) + (totSleeve * r.sleeveSize) + totSfuso;
  
  if (norm(r.name).includes("CARAMELLE") && norm(r.name).includes("AERMONT")) {
    basePezzi += getCandyTotalKg();
  }

  const postMixTotals = getPostMixProductTotals();
  const cleanStr = str => norm(str).replace(/[^A-Z0-9]/g, "");
  const rNameClean = cleanStr(r.name);
  
  for (let [pmName, pmKg] of Object.entries(postMixTotals)) {
    const pmClean = cleanStr(pmName);
    if (rNameClean === pmClean || rNameClean.includes(pmClean) || pmClean.includes(rNameClean)) {
      basePezzi += pmKg;
    }
  }

  return basePezzi + getKitContributionDetail(r.name, r.code);
}

/* ---------------- TABLE RENDER & MAGAZZINI SPECIALI ---------------- */
function render() {
  if (currentTab === 'setup') return;
  if (currentTab === 'candy') { renderCandyView(); return; }
  if (currentTab === 'postmix') { renderPostMixView(); return; }

  const q = norm($("search").value);
  const data = rows.filter(x => norm(x.name).includes(q) || norm(x.code).includes(q));
  $("count").textContent = `${data.length} prodotti`;

  const isTotTab = (currentTab === 'tot');

  $("thead").innerHTML = `
    <tr style="position: sticky; top: 0; z-index: 20; background: #212529;">
      <th colspan="2" style="background: #212529; color: white;">PRODOTTO</th>
      <th colspan="3" style="background: #343a40; color: white;">REPORT MAGAZZINO</th>
      <th colspan="2" class="grp-box" style="background: #e3f2fd; color: #0d47a1;">BOX</th>
      <th colspan="2" class="grp-sleeve" style="background: #f3e5f5; color: #4a148c;">SLEEVE</th>
      <th class="grp-sfuso" style="background: #fff9c4; color: #f57f17;">SFUSO</th>
      <th colspan="5" style="background: #212529; color: white;">CONFRONTO GLOBALE (TUTTI I MAGAZZINI)</th>
      <th colspan="2" class="grp-valore" style="background: #ffebee; color: #b71c1c;">VALORIZZAZIONE</th>
    </tr>
    <tr style="position: sticky; top: 41px; z-index: 20; background: #343a40; color: white;">
      <th style="background: #343a40; color: white;">Prodotto</th>
      <th style="background: #343a40; color: white;">U.M.</th>
      <th class="num" style="background: #343a40; color: white;">Iniziale</th>
      <th class="num" style="background: #343a40; color: white;">Danni</th>
      <th class="num" style="background: #343a40; color: white;">Venduto</th>
      <th class="num grp-box" style="background: #bbdefb; color: #0d47a1;">Size</th>
      <th class="grp-box" style="background: #bbdefb; color: #0d47a1;">Q.tà Box</th>
      <th class="num grp-sleeve" style="background: #e1bee7; color: #4a148c;">Size</th>
      <th class="grp-sleeve" style="background: #e1bee7; color: #4a148c;">Q.tà Sleeve</th>
      <th class="grp-sfuso" style="background: #fff59d; color: #f57f17;">Q.tà Sfuso</th>
      <th class="num" style="background: #343a40; color: white;">Atteso</th>
      <th class="num" style="background: #343a40; color: white;">Rilevato Base</th>
      <th class="num" style="background: #e3f2fd; color: #0d47a1;">➕ Da Kit/Spec.</th>
      <th class="num" style="background: #343a40; color: white;">Effettivo Totale</th>
      <th class="num" style="background: #343a40; color: white;">Diff. Totale</th>
      <th class="num grp-valore" style="background: #ffcdd2; color: #b71c1c;">Costo Unit.</th>
      <th class="num grp-valore" style="background: #ffcdd2; color: #b71c1c;">Diff. Valore</th>
    </tr>
  `;

  $("tbody").innerHTML = "";

  data.forEach(r => {
    const tr = document.createElement("tr");
    if (r.isKit) {
      tr.style.backgroundColor = "#e3f2fd";
      tr.style.borderLeft = "4px solid #1976d2";
    }

    let totBoxLocal = 0, totSleeveLocal = 0, totSfusoLocal = 0;
    if (isTotTab) {
      warehouses.forEach((_, wIdx) => {
        const cWh = getCount(wIdx, r.code);
        totBoxLocal += sumArr(cWh.box);
        totSleeveLocal += sumArr(cWh.sleeve);
        totSfusoLocal += sumArr(cWh.sfuso);
      });
    } else {
      const c = getCount(currentTab, r.code);
      totBoxLocal = sumArr(c.box);
      totSleeveLocal = sumArr(c.sleeve);
      totSfusoLocal = sumArr(c.sfuso);
    }

    const baseRilevato = (totBoxLocal * r.boxSize) + (totSleeveLocal * r.sleeveSize) + totSfusoLocal;
    const kitPart = getKitContributionDetail(r.name, r.code);
    const effettivoTotaleComplesso = getGlobalRilevato(r.code, r);
    const diffTotale = effettivoTotaleComplesso - r.atteso;
    const diffValore = diffTotale * (r.standardCost || 0);

    tr.innerHTML = `
      <td style="${r.isKit ? 'font-weight:bold; color:#0d47a1;' : ''}">${r.isKit ? '📦 ' : ''}${esc(r.name)}</td>
      <td>${esc(r.uom)}</td>
      <td class="num">${fmt(r.iniziale)}</td>
      <td class="num">${fmt(r.danni)}</td>
      <td class="num">${fmt(r.venduto)}</td>
      <td class="num grp-box">${r.boxSize ? fmt(r.boxSize) : '-'}</td>
      <td class="grp-box">${isTotTab ? fmt(totBoxLocal) : renderMultiInput(currentTab, r.code, 'box', r.boxSize)}</td>
      <td class="num grp-sleeve">${r.sleeveSize ? fmt(r.sleeveSize) : '-'}</td>
      <td class="grp-sleeve">${isTotTab ? fmt(totSleeveLocal) : renderMultiInput(currentTab, r.code, 'sleeve', r.sleeveSize)}</td>
      <td class="num grp-sfuso">${isTotTab ? fmt(totSfusoLocal) : renderMultiInput(currentTab, r.code, 'sfuso', 1)}</td>
      <td class="num">${fmt(r.atteso)}</td>
      <td class="num">${fmt(baseRilevato)}</td>
      <td class="num" style="background:#f0f4f8; font-weight:bold; color:#1976d2;">${fmt(kitPart)}</td>
      <td class="num cell-eff" id="eff-${r.code}">${fmt(effettivoTotaleComplesso)}</td>
      <td class="num cell-diff ${diffTotale === 0 ? 'ok' : 'bad'}" id="diff-${r.code}">${fmt(diffTotale)}</td>
      <td class="num grp-valore">€ ${fmtMoney(r.standardCost || 0)}</td>
      <td class="num grp-valore cell-val ${diffValore >= 0 ? 'ok' : 'bad'}" id="val-${r.code}">€ ${fmtMoney(diffValore)}</td>
    `;
    $("tbody").appendChild(tr);
  });

  recalcKPIs();
}

/* --- RENDER MAGAZZINO CARAMELLE --- */
function renderCandyView() {
  const cfg = getActiveCinemaCandyConfig();
  $("count").textContent = `Magazzino Caramelle (${cinemaName})`;
  $("thead").innerHTML = `<tr><th style="background: #212529; color: white; padding: 12px;">🍬 Magazzino Caramelle a Blocchi — ${esc(cinemaName)}</th></tr>`;

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">`;
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">Totale Generale Caramelle</h3>
        <div style="font-size: 1.5rem; font-weight: bold; color: #0d47a1; margin-top: 5px;">${fmt(getCandyTotalKg())} Kg</div>
      </div>
      <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.85rem; font-weight: bold; display: block; color: #555;">N. Blocchi</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updateCandyBlocksCount(this.value)">
            ${[1, 2, 3, 4, 5, 6].map(num => `<option value="${num}" ${cfg.blocksCount === num ? 'selected' : ''}>${num} Blocchi</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size: 0.85rem; font-weight: bold; display: block; color: #555;">Disposizione</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updateCandyOrientation(this.value)">
            <option value="vertical" ${cfg.orientation === 'vertical' ? 'selected' : ''}>In Verticale</option>
            <option value="horizontal" ${cfg.orientation === 'horizontal' ? 'selected' : ''}>In Orizzontale</option>
          </select>
        </div>
      </div>
    </div>
    <div style="background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #333; font-size: 1rem;">⚖️ Configurazione delle 4 Tare (Kg)</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
        ${[0, 1, 2, 3].map(i => `
          <div style="background: #f1f3f5; padding: 8px 12px; border-radius: 6px;">
            <label style="font-size: 0.8rem; font-weight: bold; color: #495057;">Tara ${i+1}:</label>
            <input type="number" step="any" value="${cfg.tares[i] ?? 0}" style="width: 100%; padding: 4px; margin-top: 4px;" onchange="updateCandyTaraVal(${i}, this.value)">
          </div>
        `).join('')}
      </div>
    </div>
  `;

  let containerStyle = cfg.orientation === 'horizontal' 
    ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 20px;"
    : "display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;";

  html += `<div style="${containerStyle}">`;
  let activeBlocksCount = parseInt(cfg.blocksCount) || cfg.blocks.length;
  for (let bIndex = 0; bIndex < activeBlocksCount; bIndex++) {
    if (!cfg.blocks[bIndex]) {
      cfg.blocks[bIndex] = { id: `block_${bIndex}`, name: `🍬 Blocco ${bIndex+1}`, columns: 10, rows: 2, gridValues: {} };
    }
    let block = cfg.blocks[bIndex];
    let cols = parseInt(block.columns) || 1;
    let rowsCount = parseInt(block.rows) || 1;

    html += `
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f1f3f5; padding-bottom: 10px; flex-wrap: wrap;">
          <input type="text" value="${esc(block.name)}" style="font-weight: bold; color: #1976d2; font-size: 1.1rem; border: 1px solid transparent; background: transparent; flex: 1;" onchange="updateCandyBlockName(${bIndex}, this.value)">
          <div>Colonne: <input type="number" value="${cols}" style="width: 55px; padding: 4px;" onchange="updateCandyBlockDim(${bIndex}, 'columns', this.value)"></div>
          <div>Righe: <input type="number" value="${rowsCount}" style="width: 55px; padding: 4px;" onchange="updateCandyBlockDim(${bIndex}, 'rows', this.value)"></div>
        </div>
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #343a40; color: white;">
                <th style="padding: 6px; font-size: 0.85rem;">Riga</th>`;
    for(let c=0; c<cols; c++) html += `<th style="padding: 6px; text-align:center; font-size: 0.85rem;">Col ${c+1}</th>`;
    html += `</tr></thead><tbody>`;

    for(let r=0; r<rowsCount; r++) {
      html += `<tr><td style="background: #e9ecef; font-weight: bold; padding: 6px; font-size: 0.85rem;">Riga ${r+1}</td>`;
      for(let c=0; c<cols; c++) {
        let cellData = block.gridValues?.[r]?.[c] || { weight: "", taraIdx: 0 };
        let weightVal = cellData.weight ?? "";
        let taraIdx = cellData.taraIdx ?? 0;

        html += `<td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; background: #fafafa;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <input type="number" step="any" placeholder="Kg" value="${weightVal}" style="width: 60px; padding: 3px; text-align: center; margin: 0 auto;" onchange="updateCandyCell(${bIndex}, ${r}, ${c}, 'weight', this.value)">
            <select style="font-size: 0.7rem; padding: 2px; border-radius: 3px; border: 1px solid #ccc;" onchange="updateCandyCell(${bIndex}, ${r}, ${c}, 'taraIdx', this.value)">
              ${[0, 1, 2, 3].map(ti => `<option value="${ti}" ${taraIdx === ti ? 'selected' : ''}>T${ti+1} (${cfg.tares[ti]}kg)</option>`).join('')}
            </select>
          </div>
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div></div>`;
  }
  html += `</div>`;

  // Sezione Buste Caramelle
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 15px 0; color: #333;">📦 Conteggio Buste / Sleeve Caramelle</h3>
      <div style="overflow-x: auto;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #343a40; color: white;">
              <th style="padding: 8px;">Posizione / Busta</th>
              <th style="padding: 8px; text-align: center;">Chili Sfusi (Kg)</th>
              <th style="padding: 8px; text-align: center;">Sleeve Pene/Buste</th>
            </tr>
          </thead>
          <tbody>
            ${cfg.buste.map((b, idx) => `
              <tr>
                <td style="background: #e9ecef; font-weight: bold; padding: 6px; font-size: 0.85rem;">Busta ${idx+1}</td>
                <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">
                  <input type="number" step="any" value="${b.kg || 0}" style="width: 90px; padding: 4px; text-align: center;" onchange="updateCandyBusta(${idx}, 'kg', this.value)">
                </td>
                <td style="border: 1px solid #dee2e6; padding: 6px; text-align: center;">
                  <input type="number" step="any" value="${b.sleeve || 0}" style="width: 90px; padding: 4px; text-align: center;" onchange="updateCandyBusta(${idx}, 'sleeve', this.value)">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  html += `</td></tr>`;
  $("tbody").innerHTML = html;
}

/* --- RENDER SCHERMATA POST MIX --- */
function renderPostMixView() {
  const cfg = getActiveCinemaPostMixConfig();
  const totals = getPostMixProductTotals();
  $("count").textContent = `Magazzino Post Mix (${cinemaName})`;
  $("thead").innerHTML = `<tr><th style="background: #212529; color: white; padding: 12px;">🥤 Magazzino Post Mix a Blocchi — ${esc(cinemaName)}</th></tr>`;

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">`;
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">Totale Netti Post Mix per Prodotto</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
          ${postMixProducts.length === 0 ? '<span style="color:#d32f2f;">⚠️ Nessun prodotto Post Mix trovato. Assicurati di caricare il file SIZE con il foglio POSTMIX.</span>' : ''}
          ${postMixProducts.map(p => `
            <div style="background: #e3f2fd; padding: 6px 12px; border-radius: 6px; font-size: 0.9rem;">
              <strong>${esc(p.name)}:</strong> <span style="color: #0d47a1; font-weight: bold;">${fmt(totals[p.name] || 0)} Kg</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.85rem; font-weight: bold; display: block; color: #555;">N. Blocchi</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updatePostMixBlocksCount(this.value)">
            ${[1, 2, 3, 4, 5, 6].map(num => `<option value="${num}" ${cfg.blocksCount === num ? 'selected' : ''}>${num} Blocchi</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size: 0.85rem; font-weight: bold; display: block; color: #555;">Disposizione</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updatePostMixOrientation(this.value)">
            <option value="vertical" ${cfg.orientation === 'vertical' ? 'selected' : ''}>In Verticale</option>
            <option value="horizontal" ${cfg.orientation === 'horizontal' ? 'selected' : ''}>In Orizzontale</option>
          </select>
        </div>
      </div>
    </div>
  `;

  let containerStyle = cfg.orientation === 'horizontal' 
    ? "display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; margin-bottom: 20px;"
    : "display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px;";

  html += `<div style="${containerStyle}">`;
  let activeBlocksCount = parseInt(cfg.blocksCount) || cfg.blocks.length;
  for (let bIndex = 0; bIndex < activeBlocksCount; bIndex++) {
    if (!cfg.blocks[bIndex]) {
      cfg.blocks[bIndex] = { id: `pm_block_${bIndex}`, name: `🥤 Blocco Post Mix ${bIndex+1}`, columns: 6, rows: 4, gridValues: {} };
    }
    let block = cfg.blocks[bIndex];
    let cols = parseInt(block.columns) || 1;
    let rowsCount = parseInt(block.rows) || 1;

    html += `
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f1f3f5; padding-bottom: 10px; flex-wrap: wrap;">
          <input type="text" value="${esc(block.name)}" style="font-weight: bold; color: #d84315; font-size: 1.1rem; border: 1px solid transparent; background: transparent; flex: 1;" onchange="updatePostMixBlockName(${bIndex}, this.value)">
          <div>Colonne: <input type="number" value="${cols}" style="width: 55px; padding: 4px;" onchange="updatePostMixBlockDim(${bIndex}, 'columns', this.value)"></div>
          <div>Righe: <input type="number" value="${rowsCount}" style="width: 55px; padding: 4px;" onchange="updatePostMixBlockDim(${bIndex}, 'rows', this.value)"></div>
        </div>
        <div style="overflow-x: auto;">
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #343a40; color: white;">
                <th style="padding: 6px; font-size: 0.85rem;">Riga</th>`;
    for(let c=0; c<cols; c++) html += `<th style="padding: 6px; text-align:center; font-size: 0.85rem;">Col ${c+1}</th>`;
    html += `</tr></thead><tbody>`;

    for(let r=0; r<rowsCount; r++) {
      html += `<tr><td style="background: #e9ecef; font-weight: bold; padding: 6px; font-size: 0.85rem;">Riga ${r+1}</td>`;
      for(let c=0; c<cols; c++) {
        let cellData = block.gridValues?.[r]?.[c] || { weight: "", prodName: "" };
        let selProd = cellData.prodName || "";
        
        html += `<td style="border: 1px solid #dee2e6; padding: 6px; text-align: center; background: #fafafa;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <select style="font-size: 0.75rem; padding: 3px; border-radius: 3px; border: 1px solid #ccc; max-width: 140px;" onchange="updatePostMixCell(${bIndex}, ${r}, ${c}, 'prodName', this.value)">
              <option value="">-- Seleziona Prodotto --</option>
              ${postMixProducts.map(p => `<option value="${esc(p.name)}" ${selProd === p.name ? 'selected' : ''}>${esc(p.name)} (Tara: ${p.tara}kg)</option>`).join('')}
            </select>
            <input type="number" step="any" placeholder="Kg Lordi" value="${cellData.weight ?? ""}" style="width: 80px; padding: 3px; text-align: center; margin: 0 auto;" onchange="updatePostMixCell(${bIndex}, ${r}, ${c}, 'weight', this.value)">
          </div>
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div></div>`;
  }
  html += `</div></td></tr>`;
  $("tbody").innerHTML = html;
}

/* --- FUNZIONI DI SUPPORTO PER INPUT MULTI-CAMPO E AGGIORNAMENTO CARAMELLE/POSTMIX --- */
function renderMultiInput(whIdx, code, fieldType, unitSize) {
  const c = getCount(whIdx, code);
  const arr = c[fieldType] || [0];
  
  return arr.map((val, idx) => `
    <div style="display: inline-flex; align-items: center; gap: 4px; margin: 2px;">
      <input type="number" step="any" value="${val || ''}" style="width: 60px; padding: 3px; text-align: center;" 
             oninput="updateCountField(${whIdx}, '${code}', '${fieldType}', ${idx}, this.value)">
    </div>
  `).join('') + `
    <button onclick="addCountField(${whIdx}, '${code}', '${fieldType}')" style="padding: 2px 6px; font-size: 0.75rem; cursor:pointer;" title="Aggiungi campo">+</button>
  `;
}

function updateCountField(whIdx, code, fieldType, idx, val) {
  const c = getCount(whIdx, code);
  c[fieldType][idx] = n(val);
  saveCountsToStorage();
  
  const r = rows.find(x => x.code === code);
  if (r) {
    const eff = getGlobalRilevato(code, r);
    const diff = eff - r.atteso;
    const diffVal = diff * (r.standardCost || 0);
    
    const effEl = document.getElementById(`eff-${code}`);
    const diffEl = document.getElementById(`diff-${code}`);
    const valEl = document.getElementById(`val-${code}`);
    
    if (effEl) effEl.textContent = fmt(eff);
    if (diffEl) {
      diffEl.textContent = fmt(diff);
      diffEl.className = `num cell-diff ${diff === 0 ? 'ok' : 'bad'}`;
    }
    if (valEl) {
      valEl.textContent = `€ ${fmtMoney(diffVal)}`;
      valEl.className = `num grp-valore cell-val ${diffVal >= 0 ? 'ok' : 'bad'}`;
    }
  }
  recalcKPIs();
}

function addCountField(whIdx, code, fieldType) {
  const c = getCount(whIdx, code);
  c[fieldType].push(0);
  saveCountsToStorage();
  render();
}

function recalcKPIs() {
  let totAtteso = 0, totRilevato = 0, totDiffValore = 0;
  rows.forEach(r => {
    totAtteso += r.atteso;
    const eff = getGlobalRilevato(r.code, r);
    totRilevato += eff;
    totDiffValore += (eff - r.atteso) * (r.standardCost || 0);
  });
  if ($("kpiAtteso")) $("kpiAtteso").textContent = fmt(totAtteso);
  if ($("kpiRilevato")) $("kpiRilevato").textContent = fmt(totRilevato);
  if ($("kpiValore")) $("kpiValore").textContent = `€ ${fmtMoney(totDiffValore)}`;
}

// Handler specifici configurazioni Caramelle
function updateCandyBlocksCount(val) { getActiveCinemaCandyConfig().blocksCount = parseInt(val) || 2; saveCandyConfig(); renderCandyView(); }
function updateCandyOrientation(val) { getActiveCinemaCandyConfig().orientation = val; saveCandyConfig(); renderCandyView(); }
function updateCandyTaraVal(idx, val) { getActiveCinemaCandyConfig().tares[idx] = n(val); saveCandyConfig(); renderCandyView(); }
function updateCandyBlockName(bIndex, val) { getActiveCinemaCandyConfig().blocks[bIndex].name = val; saveCandyConfig(); }
function updateCandyBlockDim(bIndex, field, val) {
  getActiveCinemaPostMixConfig(); 
  getActiveCinemaCandyConfig().blocks[bIndex][field] = parseInt(val) || 1;
  saveCandyConfig();
  renderCandyView();
}
function updateCandyCell(bIndex, r, c, subField, val) {
  let cfg = getActiveCinemaCandyConfig();
  if(!cfg.blocks[bIndex].gridValues) cfg.blocks[bIndex].gridValues = {};
  if(!cfg.blocks[bIndex].gridValues[r]) cfg.blocks[bIndex].gridValues[r] = {};
  if(!cfg.blocks[bIndex].gridValues[r][c]) cfg.blocks[bIndex].gridValues[r][c] = { weight: "", taraIdx: 0 };
  if (subField === 'weight') cfg.blocks[bIndex].gridValues[r][c].weight = n(val);
  else if (subField === 'taraIdx') cfg.blocks[bIndex].gridValues[r][c].taraIdx = parseInt(val) || 0;
  saveCandyConfig();
  renderCandyView();
}
function updateCandyBusta(idx, field, val) {
  let cfg = getActiveCinemaCandyConfig();
  if(!cfg.buste[idx]) cfg.buste[idx] = {kg: 0, sleeve: 0};
  cfg.buste[idx][field] = n(val);
  saveCandyConfig();
  renderCandyView();
}

// Handler specifici configurazioni Post Mix
function updatePostMixBlocksCount(val) { getActiveCinemaPostMixConfig().blocksCount = parseInt(val) || 1; savePostMixConfig(); renderPostMixView(); }
function updatePostMixOrientation(val) { getActiveCinemaPostMixConfig().orientation = val; savePostMixConfig(); renderPostMixView(); }
function updatePostMixBlockName(bIndex, val) { getActiveCinemaPostMixConfig().blocks[bIndex].name = val; savePostMixConfig(); }
function updatePostMixBlockDim(bIndex, field, val) {
  getActiveCinemaPostMixConfig().blocks[bIndex][field] = parseInt(val) || 1;
  savePostMixConfig();
  renderPostMixView();
}
function updatePostMixCell(bIndex, r, c, subField, val) {
  let cfg = getActiveCinemaPostMixConfig();
  if(!cfg.blocks[bIndex].gridValues) cfg.blocks[bIndex].gridValues = {};
  if(!cfg.blocks[bIndex].gridValues[r]) cfg.blocks[bIndex].gridValues[r] = {};
  if(!cfg.blocks[bIndex].gridValues[r][c]) cfg.blocks[bIndex].gridValues[r][c] = { weight: "", prodName: "" };
  if (subField === 'weight') cfg.blocks[bIndex].gridValues[r][c].weight = n(val);
  else if (subField === 'prodName') cfg.blocks[bIndex].gridValues[r][c].prodName = val;
  savePostMixConfig();
  renderPostMixView();
}
