/* --- FUNZIONE BASE PER SELEZIONE ELEMENTI --- */
function $(id) { return document.getElementById(id); }
function showError(msg) { alert(msg); }

/* --- PARSER FILE SIZE E POSTMIX --- */
function readMatrixAsync(file, sheetName) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array", cellDates: false });
        // Cerca il foglio in modo flessibile (anche case-insensitive o con spazi)
        const matchedSheet = wb.SheetNames.find(s => norm(s) === norm(sheetName) || norm(s).includes(norm(sheetName)));
        if (!matchedSheet) {
          resolve([]);
          return;
        }
        const data = XLSX.utils.sheet_to_json(wb.Sheets[matchedSheet], { header: 1, defval: "", raw: true });
        resolve(data);
      } catch (x) { resolve([]); }
    };
    r.readAsArrayBuffer(file);
  });
}

// Listener del caricamento file SIZE
$("sizeFile").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  $("sizeStatus").textContent = "Lettura anagrafica in corso...";
  
  try {
    let matrixSize = await readMatrixAsync(f, "SIZE");
    if (matrixSize.length === 0 && typeof readMatrix === "function") {
      matrixSize = await readMatrix(f); 
    }
    let parsedSizeResult = parseSize(matrixSize);
    size = parsedSizeResult.size;

    // Legge il foglio POSTMIX separato
    let matrixPostMix = await readMatrixAsync(f, "POSTMIX");
    postMixProducts = parsePostMixSheet(matrixPostMix);

    $("sizeStatus").textContent = `✓ ${f.name} (${size.length} articoli, ${postMixProducts.length} post-mix)`;
    build();
  } catch(err) {
    $("sizeStatus").textContent = "❌ Errore file SIZE/POSTMIX";
    showError("Errore lettura file: " + err.message);
  }
});

function parsePostMixSheet(m) {
  const postMixOut = [];
  for (let i = 0; i < m.length; i++) {
    const r = m[i];
    if (!r || !r.length) continue;
    const prodName = text(r[0]);
    const taraVal = n(r[1]);
    
    // Salta l'intestazione o righe vuote
    if (!prodName || norm(prodName) === "PRODOTTO") continue;
    postMixOut.push({ name: prodName, tara: taraVal });
  }
  return postMixOut;
}

/* --- CONFIGURAZIONE DINAMICA POST MIX (CON SALVATAGGIO PER CINEMA) --- */
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
