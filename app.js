/* --- SCRIPT COMPLETO APP.JS CON AGGIUNTA STAMPA FOGLIO CONTEGGIO MANUALE --- */

let prezzo = n(r.prezzoVendita);
let diff = (stockIni + sumIns) - contaFin;
if (diff > 0 && prezzo > 0) {
  totalIncassoDist += diff * prezzo;
}

function renderDistributorsView() {
  const cfg = getActiveCinemaDistributorConfig();
  let totalIncassoDist = 0;

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">`;
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); margin-bottom: 25px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">Configurazione Distributori Automatici (${esc(cinemaName)})</h3>
        <p style="font-size: 0.9rem; color: #666; margin-top: 4px;">Gestisci le righe, i contatti e i prezzi dei distributori di snack e bevande.</p>
      </div>
      <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.8rem; font-weight: bold; display: block; color: #555;">N. Distributori</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updateDistributorsCount(this.value)">
            ${[1, 2, 3, 4, 5, 6].map(num => `<option value="${num}" ${cfg.distributorsCount === num ? 'selected' : ''}>${num} Distributori</option>`).join('')}
          </select>
        </div>
        <button onclick="printManualCountingSheet()" style="background: #343a40; color: white; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.85rem;">🖨️ Stampa Foglio Conteggio Manuale</button>
      </div>
    </div>
  `;

  let activeDistCount = parseInt(cfg.distributorsCount) || cfg.distributors.length;
  for (let dIdx = 0; dIdx < activeDistCount; dIdx++) {
    if (!cfg.distributors[dIdx]) {
      cfg.distributors[dIdx] = {
        id: `dist_${dIdx}`,
        name: `Distributore ${dIdx + 1}`,
        date: "13/08/2026",
        fondoResti: 35,
        rows: Array(20).fill().map(() => ({ product: "", stockIniziale: "", ins: ["", "", "", "", ""], contaFinale: "", prezzoVendita: "" }))
      };
    }
    let dist = cfg.distributors[dIdx];
    let totalIncassoDist = 0;

    dist.rows.forEach(r => {
      let stockIni = n(r.stockIniziale);
      let sumIns = r.ins.reduce((acc, val) => acc + n(val), 0);
      let contaFin = n(r.contaFinale);
      let venduto = (stockIni + sumIns) - contaFin;
      let prezzo = n(r.prezzoVendita);
      if (venduto > 0 && prezzo > 0) {
        totalIncassoDist += venduto * prezzo;
      }
    });

    html += `
      <div style="background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 25px; border-top: 5px solid #1a237e;">
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 12px 15px; border-radius: 6px;">
          <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555; display: block;">Nome Distributore:</label>
              <input type="text" value="${esc(dist.name)}" oninput="updateDistProperty(${dIdx}, 'name', this.value)" style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-weight: bold;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555; display: block;">Data:</label>
              <input type="text" value="${esc(dist.date)}" oninput="updateDistProperty(${dIdx}, 'date', this.value)" style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; width: 110px;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555; display: block;">Fondo Resti (€):</label>
              <input type="number" step="0.5" value="${dist.fondoResti}" oninput="updateDistProperty(${dIdx}, 'fondoResti', this.value)" style="padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; width: 80px;">
            </div>
          </div>
          <div style="background: #e8eaf6; padding: 8px 15px; border-radius: 6px; border: 1px solid #c5cae9;">
            <span style="font-size: 0.85rem; font-weight: bold; color: #1a237e;">Incasso Calcolato:</span>
            <span style="font-size: 1.1rem; font-weight: bold; color: #2e7d32; margin-left: 8px;">€ ${fmtMoney(totalIncassoDist)}</span>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: #343a40; color: white;">
                <th style="padding: 8px; width: 22%;">Prodotto</th>
                <th style="padding: 8px; width: 8%; text-align: center;">Stock Iniziale</th>
                <th colspan="5" style="padding: 8px; text-align: center; background: #495057;">Inserimenti / Ricariche (1 - 5)</th>
                <th style="padding: 8px; width: 8%; text-align: center;">Conta Finale</th>
                <th style="padding: 8px; width: 8%; text-align: center;">Venduto</th>
                <th style="padding: 8px; width: 8%; text-align: center;">Prezzo (€)</th>
                <th style="padding: 8px; width: 10%; text-align: right;">Incasso (€)</th>
              </tr>
            </thead>
            <tbody>
    `;

    dist.rows.forEach((r, rIdx) => {
      let stockIni = n(r.stockIniziale);
      let sumIns = r.ins.reduce((acc, val) => acc + n(val), 0);
      let contaFin = n(r.contaFinale);
      let venduto = (stockIni + sumIns) - contaFin;
      let prezzo = n(r.prezzoVendita);
      let incassoRiga = (venduto > 0 && prezzo > 0) ? venduto * prezzo : 0;

      html += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 6px;">
            <input type="text" value="${esc(r.product)}" placeholder="Nome prodotto..." oninput="updateDistRow(${dIdx}, ${rIdx}, 'product', this.value)" style="width: 100%; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;">
          </td>
          <td style="padding: 6px; text-align: center;">
            <input type="number" value="${r.stockIniziale}" oninput="updateDistRow(${dIdx}, ${rIdx}, 'stockIniziale', this.value)" style="width: 55px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
          </td>
      `;

      for (let i = 0; i < 5; i++) {
        html += `
          <td style="padding: 6px; text-align: center;">
            <input type="number" value="${r.ins[i]}" oninput="updateDistIns(${dIdx}, ${rIdx}, ${i}, this.value)" style="width: 42px; padding: 4px; text-align: center; border: 1px solid #ddd; border-radius: 4px; background: #fdfdfd;">
          </td>
        `;
      }

      html += `
          <td style="padding: 6px; text-align: center;">
            <input type="number" value="${r.contaFinale}" oninput="updateDistRow(${dIdx}, ${rIdx}, 'contaFinale', this.value)" style="width: 55px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; background: #e8eaf6;">
          </td>
          <td style="padding: 6px; text-align: center; font-weight: bold; color: ${venduto < 0 ? 'red' : '#333'};">
            ${venduto}
          </td>
          <td style="padding: 6px; text-align: center;">
            <input type="number" step="0.05" value="${r.prezzoVendita}" oninput="updateDistRow(${dIdx}, ${rIdx}, 'prezzoVendita', this.value)" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
          </td>
          <td style="padding: 6px; text-align: right; font-weight: bold; color: #2e7d32;">
            € ${fmtMoney(incassoRiga)}
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  html += `</td></tr>`;
  $("tbody").innerHTML = html;
  recalcKPIs();
}

function updateDistributorsCount(count) {
  const cfg = getActiveCinemaDistributorConfig();
  cfg.distributorsCount = parseInt(count);
  while (cfg.distributors.length < cfg.distributorsCount) {
    let idx = cfg.distributors.length;
    cfg.distributors.push({
      id: `dist_${idx}`,
      name: `MARS ${idx * 9 + 1}-${(idx + 1) * 9}`,
      date: "13/08/2026",
      fondoResti: 35,
      rows: Array(20).fill().map(() => ({ product: "", stockIniziale: "", ins: ["", "", "", "", ""], contaFinale: "", prezzoVendita: "" }))
    });
  }
  saveDistributorConfig();
  renderDistributorsView();
}

function updateDistProperty(dIdx, prop, val) {
  const cfg = getActiveCinemaDistributorConfig();
  cfg.distributors[dIdx][prop] = val;
  saveDistributorConfig();
}

function updateDistRow(dIdx, rIdx, prop, val) {
  const cfg = getActiveCinemaDistributorConfig();
  cfg.distributors[dIdx].rows[rIdx][prop] = val;
  saveDistributorConfig();
  if (prop === 'contaFinale' || prop === 'prezzoVendita' || prop === 'stockIniziale') {
    renderDistributorsView();
  }
}

function updateDistIns(dIdx, rIdx, insIdx, val) {
  const cfg = getActiveCinemaDistributorConfig();
  cfg.distributors[dIdx].rows[rIdx].ins[insIdx] = val;
  saveDistributorConfig();
  renderDistributorsView();
}

/* --- NUOVA FUNZIONE AGGIUNTA: STAMPA FOGLIO CONTEGGIO MANUALE --- */
function printManualCountingSheet() {
  const cfg = getActiveCinemaDistributorConfig();
  let printWindow = window.open('', '_blank');
  
  let htmlContent = `
    <html>
    <head>
      <title>Foglio Conteggio Manuale - ${esc(cinemaName)}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 5px; }
        h2 { font-size: 14px; text-align: center; color: #555; margin-top: 0; margin-bottom: 20px; }
        .dist-section { page-break-after: always; margin-bottom: 30px; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #999; padding: 6px; text-align: center; }
        th { background: #eee; font-size: 11px; }
        td:first-child { text-align: left; }
        .empty-cell { height: 18px; }
      </style>
    </head>
    <body>
  `;

  cfg.distributors.forEach((dist, idx) => {
    htmlContent += `
      <div class="dist-section">
        <h1>INVENTARIO DISTRIBUTORI AUTOMATICI</h1>
        <h2>Cinema: ${esc(cinemaName)} — ${esc(dist.name)} (Data: ${esc(dist.date)})</h2>
        <div class="header-info">
          <span>Fondo Resti: € ${dist.fondoResti}</span>
          <span>Operatore: _______________________</span>
          <span>Firma: _______________________</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Prodotto</th>
              <th style="width: 12%;">Stock Iniziale</th>
              <th style="width: 12%;">Ricarica 1</th>
              <th style="width: 12%;">Ricarica 2</th>
              <th style="width: 12%;">Ricarica 3</th>
              <th style="width: 12%;">Conta Finale</th>
              <th style="width: 12%;">Prezzo</th>
            </tr>
          </thead>
          <tbody>
    `;

    dist.rows.forEach(r => {
      htmlContent += `
        <tr>
          <td>${esc(r.product || '')}</td>
          <td class="empty-cell">${r.stockIniziale || ''}</td>
          <td class="empty-cell"></td>
          <td class="empty-cell"></td>
          <td class="empty-cell"></td>
          <td class="empty-cell"></td>
          <td class="empty-cell">${r.prezzoVendita ? '€ ' + r.prezzoVendita : ''}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </div>
    `;
  });

  htmlContent += `
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/* --- RENDER SCHERMATA CARAMELLE --- */
function renderCandyView() {
  const cfg = getActiveCinemaCandyConfig();
  $("count").textContent = `Gestione Caramelle (${cinemaName}) - Totale: ${fmt(getCandyTotalKg())} Kg`;
  $("thead").innerHTML = `<tr><th style="background: #212529; color: white; padding: 12px;">🍬 Gestione Espositori e Scorte Caramelle — ${esc(cinemaName)}</th></tr>`;

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">`;
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); margin-bottom: 25px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">Configurazione Blocchi Caramelle</h3>
        <p style="font-size: 0.9rem; color: #666; margin-top: 4px;">Personalizza le tarature dei contenitori e gestisci i blocchi espositivi.</p>
      </div>
      <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.8rem; font-weight: bold; display: block; color: #555;">N. Blocchi</label>
          <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;" onchange="updateCandyBlocksCount(this.value)">
            ${[1, 2, 3, 4, 5].map(num => `<option value="${num}" ${cfg.blocksCount === num ? 'selected' : ''}>${num} Blocchi</option>`).join('')}
          </select>
        </div>
        <div style="background: #e8eaf6; padding: 10px 15px; border-radius: 6px; border: 1px solid #c5cae9; text-align: right;">
          <span style="font-size: 0.85rem; font-weight: bold; color: #1a237e; display: block;">PESO TOTALE CARAMELLE:</span>
          <span style="font-size: 1.2rem; font-weight: bold; color: #2e7d32;">${fmt(getCandyTotalKg())} Kg</span>
        </div>
      </div>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); margin-bottom: 25px;">
      <h4 style="margin-bottom: 12px; font-size: 1rem; color: #333;">⚖️ Tarature Vaschette / Contenitori (Kg)</h4>
      <div style="display: flex; gap: 15px; flex-wrap: wrap;">
        ${cfg.tares.map((t, idx) => `
          <div>
            <label style="font-size: 0.75rem; font-weight: bold; color: #666; display: block;">Tara ${idx + 1}</label>
            <input type="number" step="0.01" value="${t}" oninput="updateCandyTara(${idx}, this.value)" style="width: 80px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; text-align: center; font-weight: bold;">
          </div>
        `).join('')}
      </div>
    </div>
  `;

  let activeBlocksCount = parseInt(cfg.blocksCount) || cfg.blocks.length;
  for (let bIdx = 0; bIdx < activeBlocksCount; bIdx++) {
    if (!cfg.blocks[bIdx]) {
      cfg.blocks[bIdx] = { id: `block_${bIdx}`, name: `Espositore ${bIdx + 1}`, columns: 10, rows: 2, gridValues: {} };
    }
    let block = cfg.blocks[bIdx];
    let rowsCount = parseInt(block.rows) || 2;
    let colsCount = parseInt(block.columns) || 10;

    html += `
      <div style="background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 25px; border-top: 5px solid #1a237e;">
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px;">
          <input type="text" value="${esc(block.name)}" oninput="updateCandyBlockProp(${bIdx}, 'name', this.value)" style="font-weight: bold; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; width: 280px;">
          <div style="display: flex; gap: 15px; align-items: center;">
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555;">Colonne:</label>
              <input type="number" min="1" max="40" value="${colsCount}" onchange="updateCandyBlockDim(${bIdx}, 'columns', this.value)" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555;">Righe:</label>
              <input type="number" min="1" max="10" value="${rowsCount}" onchange="updateCandyBlockDim(${bIdx}, 'rows', this.value)" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
            </div>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
    `;

    for (let r = 0; r < rowsCount; r++) {
      html += `<tr>`;
      for (let c = 0; c < colsCount; c++) {
        let cellData = block.gridValues?.[r]?.[c] || { weight: "", taraIdx: 0 };
        let weight = cellData.weight !== undefined ? cellData.weight : "";
        let taraIdx = cellData.taraIdx !== undefined ? cellData.taraIdx : 0;
        let net = 0;
        if (weight !== "") {
          let taraVal = n(cfg.tares[taraIdx] || 0);
          net = Math.max(0, n(weight) - taraVal);
        }

        html += `
          <td style="border: 1px solid #e0e0e0; padding: 6px; text-align: center; background: ${weight !== '' ? '#e8f5e9' : '#fff'}; min-width: 85px;">
            <div style="font-size: 0.7rem; font-weight: bold; color: #555; margin-bottom: 2px;">R${r+1} C${c+1}</div>
            <input type="number" step="0.01" value="${weight}" placeholder="Peso" oninput="updateCandyCell(${bIdx}, ${r}, ${c}, 'weight', this.value)" style="width: 75px; padding: 3px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.85rem; font-weight: bold; margin-bottom: 3px;">
            <select onchange="updateCandyCell(${bIdx}, ${r}, ${c}, 'taraIdx', this.value)" style="width: 75px; padding: 2px; font-size: 0.7rem; border: 1px solid #ccc; border-radius: 3px; background: #f8f9fa;">
              ${cfg.tares.map((t, tIdx) => `<option value="${tIdx}" ${taraIdx === tIdx ? 'selected' : ''}>T${tIdx+1} (${t}kg)</option>`).join('')}
            </select>
            ${weight !== '' ? `<div style="font-size: 0.7rem; font-weight: bold; color: #2e7d32; margin-top: 2px;">Net: ${net.toFixed(2)}kg</div>` : ''}
          </td>
        `;
      }
      html += `</tr>`;
    }

    html += `
          </table>
        </div>
      </div>
    `;
  }

  html += `</td></tr>`;
  $("tbody").innerHTML = html;
  recalcKPIs();
}

function updateCandyBlocksCount(count) {
  const cfg = getActiveCinemaCandyConfig();
  cfg.blocksCount = parseInt(count);
  while (cfg.blocks.length < cfg.blocksCount) {
    let idx = cfg.blocks.length;
    cfg.blocks.push({ id: `block_${idx}`, name: `Espositore Aggiuntivo ${idx + 1}`, columns: 10, rows: 2, gridValues: {} });
  }
  saveCandyConfig();
  renderCandyView();
}

function updateCandyBlockProp(bIdx, prop, val) {
  const cfg = getActiveCinemaCandyConfig();
  cfg.blocks[bIdx][prop] = val;
  saveCandyConfig();
}

function updateCandyBlockDim(bIdx, prop, val) {
  const cfg = getActiveCinemaCandyConfig();
  cfg.blocks[bIdx][prop] = parseInt(val) || 1;
  saveCandyConfig();
  renderCandyView();
}

function updateCandyTara(tIdx, val) {
  const cfg = getActiveCinemaCandyConfig();
  cfg.tares[tIdx] = parseFloat(val) || 0;
  saveCandyConfig();
  renderCandyView();
}

function updateCandyCell(bIdx, r, c, prop, val) {
  const cfg = getActiveCinemaCandyConfig();
  if (!cfg.blocks[bIdx].gridValues) cfg.blocks[bIdx].gridValues = {};
  if (!cfg.blocks[bIdx].gridValues[r]) cfg.blocks[bIdx].gridValues[r] = {};
  if (!cfg.blocks[bIdx].gridValues[r][c]) cfg.blocks[bIdx].gridValues[r][c] = { weight: "", taraIdx: 0 };
  
  if (prop === 'weight') {
    cfg.blocks[bIdx].gridValues[r][c].weight = val;
  } else if (prop === 'taraIdx') {
    cfg.blocks[bIdx].gridValues[r][c].taraIdx = parseInt(val) || 0;
  }
  saveCandyConfig();
  renderCandyView();
}

/* --- RENDER SCHERMATA POST MIX --- */
function renderPostMixView() {
  const cfg = getActiveCinemaPostMixConfig();
  const pmTotals = getPostMixProductTotals();
  let totalPostMixKg = Object.values(pmTotals).reduce((a, b) => a + b, 0);

  $("count").textContent = `Gestione Post Mix (${cinemaName}) - Totale: ${fmt(totalPostMixKg)} Kg`;
  $("thead").innerHTML = `<tr><th style="background: #212529; color: white; padding: 12px;">🥤 Gestione Post Mix — ${esc(cinemaName)}</th></tr>`;

  let html = `<tr><td style="padding: 20px; background: #f8f9fa;">`;
  html += `
    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); margin-bottom: 25px; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">Configurazione Scorte Post Mix</h3>
        <p style="font-size: 0.9rem; color: #666; margin-top: 4px;">Associa i prodotti Post Mix alle celle e inserisci i pesi lordi rilevati.</p>
      </div>
      <div style="background: #e8eaf6; padding: 10px 15px; border-radius: 6px; border: 1px solid #c5cae9; text-align: right;">
        <span style="font-size: 0.85rem; font-weight: bold; color: #1a237e; display: block;">PESO NETTO TOTALE POST MIX:</span>
        <span style="font-size: 1.2rem; font-weight: bold; color: #2e7d32;">${fmt(totalPostMixKg)} Kg</span>
      </div>
    </div>
  `;

  let activeBlocksCount = parseInt(cfg.blocksCount) || cfg.blocks.length;
  for (let bIdx = 0; bIdx < activeBlocksCount; bIdx++) {
    if (!cfg.blocks[bIdx]) {
      cfg.blocks[bIdx] = { id: `pm_block_${bIdx}`, name: `Post Mix Principale`, columns: 6, rows: 4, gridValues: {} };
    }
    let block = cfg.blocks[bIdx];
    let rowsCount = parseInt(block.rows) || 4;
    let colsCount = parseInt(block.columns) || 6;

    html += `
      <div style="background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 25px; border-top: 5px solid #1a237e;">
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px;">
          <input type="text" value="${esc(block.name)}" oninput="updatePostMixBlockProp(${bIdx}, 'name', this.value)" style="font-weight: bold; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; padding: 6px 10px; width: 280px;">
          <div style="display: flex; gap: 15px; align-items: center;">
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555;">Colonne:</label>
              <input type="number" min="1" max="20" value="${colsCount}" onchange="updatePostMixBlockDim(${bIdx}, 'columns', this.value)" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div>
              <label style="font-size: 0.75rem; font-weight: bold; color: #555;">Righe:</label>
              <input type="number" min="1" max="10" value="${rowsCount}" onchange="updatePostMixBlockDim(${bIdx}, 'rows', this.value)" style="width: 60px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px;">
            </div>
          </div>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
    `;

    for (let r = 0; r < rowsCount; r++) {
      html += `<tr>`;
      for (let c = 0; c < colsCount; c++) {
        let cellData = block.gridValues?.[r]?.[c] || { prodName: "", weight: "" };
        let prodName = cellData.prodName || "";
        let weight = cellData.weight !== undefined ? cellData.weight : "";
        let net = 0;
        if (weight !== "" && prodName) {
          let pmItem = postMixProducts.find(p => p.name === prodName);
          let taraVal = pmItem ? n(pmItem.tara) : 0;
          net = Math.max(0, n(weight) - taraVal);
        }

        html += `
          <td style="border: 1px solid #e0e0e0; padding: 6px; text-align: center; background: ${prodName !== '' ? '#e8f5e9' : '#fff'}; min-width: 130px;">
            <div style="font-size: 0.7rem; font-weight: bold; color: #555; margin-bottom: 2px;">R${r+1} C${c+1}</div>
            <select onchange="updatePostMixCell(${bIdx}, ${r}, ${c}, 'prodName', this.value)" style="width: 120px; padding: 3px; font-size: 0.75rem; border: 1px solid #ccc; border-radius: 3px; margin-bottom: 4px; background: #fff;">
              <option value="">-- Seleziona Prodotto --</option>
              ${postMixProducts.map(p => `<option value="${esc(p.name)}" ${prodName === p.name ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
            </select>
            <input type="number" step="0.01" value="${weight}" placeholder="Peso Lordo" oninput="updatePostMixCell(${bIdx}, ${r}, ${c}, 'weight', this.value)" style="width: 120px; padding: 3px; text-align: center; border: 1px solid #ccc; border-radius: 3px; font-size: 0.85rem; font-weight: bold; margin-bottom: 2px;">
            ${weight !== '' && prodName !== '' ? `<div style="font-size: 0.7rem; font-weight: bold; color: #2e7d32;">Net: ${net.toFixed(2)}kg</div>` : ''}
          </td>
        `;
      }
      html += `</tr>`;
    }

    html += `
          </table>
        </div>
      </div>
    `;
  }

  html += `</td></tr>`;
  $("tbody").innerHTML = html;
  recalcKPIs();
}

function updatePostMixBlockProp(bIdx, prop, val) {
  const cfg = getActiveCinemaPostMixConfig();
  cfg.blocks[bIdx][prop] = val;
  savePostMixConfig();
}

function updatePostMixBlockDim(bIdx, prop, val) {
  const cfg = getActiveCinemaPostMixConfig();
  cfg.blocks[bIdx][prop] = parseInt(val) || 1;
  savePostMixConfig();
  renderPostMixView();
}

function updatePostMixCell(bIdx, r, c, prop, val) {
  const cfg = getActiveCinemaPostMixConfig();
  if (!cfg.blocks[bIdx].gridValues) cfg.blocks[bIdx].gridValues = {};
  if (!cfg.blocks[bIdx].gridValues[r]) cfg.blocks[bIdx].gridValues[r] = {};
  if (!cfg.blocks[bIdx].gridValues[r][c]) cfg.blocks[bIdx].gridValues[r][c] = { prodName: "", weight: "" };
  
  if (prop === 'prodName') {
    cfg.blocks[bIdx].gridValues[r][c].prodName = val;
  } else if (prop === 'weight') {
    cfg.blocks[bIdx].gridValues[r][c].weight = val;
  }
  savePostMixConfig();
  renderPostMixView();
}

/* --- MULTI INPUT RENDER FOR WAREHOUSES --- */
function renderMultiInput(whIdx, code, fieldType, unitSize) {
  const c = getCount(whIdx, code);
  const arr = c[fieldType];
  
  let html = `<div class="input-scroll-cell">`;
  arr.forEach((val, idx) => {
    html += `<input type="number" class="qty-input" value="${val}" oninput="handleMultiInput(${whIdx}, '${code}', '${fieldType}', ${idx}, this.value)">`;
  });
  if (arr.length < MAX_FIELDS) {
    html += `<button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.8rem;" onclick="addMultiField(${whIdx}, '${code}', '${fieldType}')">＋</button>`;
  }
  html += `</div>`;
  return html;
}

function handleMultiInput(whIdx, code, fieldType, fieldIdx, val) {
  const c = getCount(whIdx, code);
  c[fieldType][fieldIdx] = n(val);
  saveCountsToStorage();

  const r = rows.find(x => x.code === code);
  if (r) {
    const effEl = $(`eff-${code}`);
    const diffEl = $(`diff-${code}`);
    const valEl = $(`val-${code}`);

    if (effEl) effEl.textContent = fmt(getGlobalRilevato(code, r));
    if (diffEl) {
      let d = getGlobalRilevato(code, r) - r.atteso;
      diffEl.textContent = fmt(d);
      diffEl.className = `num cell-diff ${d === 0 ? 'ok' : 'bad'}`;
    }
    if (valEl) {
      let d = getGlobalRilevato(code, r) - r.atteso;
      let valDiff = d * (r.standardCost || 0);
      valEl.textContent = `€ ${fmtMoney(valDiff)}`;
      valEl.className = `num grp-valore cell-val ${valDiff >= 0 ? 'ok' : 'bad'}`;
    }
  }
  recalcKPIs();
}

function addMultiField(whIdx, code, fieldType) {
  const c = getCount(whIdx, code);
  if (c[fieldType].length < MAX_FIELDS) {
    c[fieldType].push(0);
    saveCountsToStorage();
    render();
  }
}

/* --- KPI CALCULATION --- */
function recalcKPIs() {
  let totAtteso = 0;
  let totRilevato = 0;
  let totDiffValore = 0;

  rows.forEach(r => {
    totAtteso += r.atteso;
    let ril = getGlobalRilevato(r.code, r);
    totRilevato += ril;
    let diff = ril - r.atteso;
    totDiffValore += diff * (r.standardCost || 0);
  });

  $("kpiAtteso").textContent = fmt(totAtteso);
  $("kpiRilevato").textContent = fmt(totRilevato);
  
  let diffPezzi = totRilevato - totAtteso;
  $("kpiDiffPezzi").textContent = fmt(diffPezzi);
  $("kpiDiffBox").className = `kpi-card ${diffPezzi === 0 ? 'success' : 'warning'}`;

  $("kpiDiffValore").textContent = `€ ${fmtMoney(totDiffValore)}`;
  $("kpiValoreBox").className = `kpi-card ${totDiffValore >= 0 ? 'success' : 'warning'}`;
}

/* --- EXPORT EXCEL --- */
function exportToExcel() {
  if (!rows.length) { alert("Nessun dato da esportare!"); return; }
  
  const exportData = rows.map(r => {
    let ril = getGlobalRilevato(r.code, r);
    let diff = ril - r.atteso;
    let diffVal = diff * (r.standardCost || 0);
    return {
      "Codice": r.code,
      "Prodotto": r.name,
      "U.M.": r.uom,
      "Iniziale": r.iniziale,
      "Danni": r.danni,
      "Venduto": r.venduto,
      "Atteso": r.atteso,
      "Rilevato Globale": ril,
      "Differenza Pezzi": diff,
      "Costo Unitario": r.standardCost || 0,
      "Differenza Valore (€)": diffVal
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario Globale");
  XLSX.writeFile(wb, `Inventario_${cinemaName.replace(/\s+/g, '_')}.xlsx`);
}
