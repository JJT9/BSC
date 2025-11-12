import { state, saveState, getDatosByKpi, pctCumplimiento, ragFromPct, indicePerspectiva, semaforoGeneral, addDato, upsertObjective } from "./state.js";
import { renderMap } from "./graph.js";
import { suggestKPIsForObjective, acceptSuggestedKPIs } from "./ai.js";
import * as Papa from "papaparse";
import { exportJSON, exportCSV, exportPDF, exportPPT } from "./exports.js";

const views = ["mapa","tableros","maestro","detalle","export"];
const segs = document.querySelectorAll(".seg");
segs.forEach(b => b.addEventListener("click", ()=> switchView(b.dataset.view)));

function switchView(id){
  segs.forEach(b=>b.classList.toggle("active", b.dataset.view===id));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${id}`).classList.add("active");
  if (id==="mapa") renderMap(currentPersp());
  if (id==="tableros") renderBoards(currentPersp());
  if (id==="maestro") renderMaestro();
  if (id==="detalle") initDetalle();
}

function currentPersp(){ return document.getElementById("perspFilter").value || ""; }

function initCommon() {
  // Perspectiva filter
  const sel = document.getElementById("perspFilter");
  sel.innerHTML = `<option value="">Todas</option>` + state.perspectivas.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join("");
  sel.onchange = ()=> { renderMap(currentPersp()); renderBoards(currentPersp()); };

  // Mapa toolbar
  document.getElementById("btn-auto").onclick = ()=> renderMap(currentPersp());
  document.getElementById("btn-png").onclick = exportMapPNG;

  // Tabs perspectivas for boards
  const tabs = document.getElementById("tabs-persp");
  tabs.innerHTML = state.perspectivas.map(p=>`<button class="seg" data-p="${p.id}">${p.nombre}</button>`).join("");
  tabs.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=> {
      document.getElementById("perspFilter").value = b.dataset.p;
      renderBoards(b.dataset.p);
    });
  });

  // KPI detalle controls
  const ksel = document.getElementById("kpi-select");
  ksel.innerHTML = state.kpis.map(k=>`<option value="${k.id}">${k.nombre}</option>`).join("");
  ksel.onchange = ()=> renderKPI(ksel.value);
  document.getElementById("btn-add-data").onclick = openAddData;
  document.getElementById("btn-import-csv").onclick = importCSVData;

  // Export actions
  document.getElementById("export-json").onclick = exportJSON;
  document.getElementById("export-csv").onclick = exportCSV;
  document.getElementById("export-pdf").onclick = exportPDF;
  document.getElementById("export-ppt").onclick = exportPPT;

  // Setup sheet
  document.getElementById("btn-setup").onclick = openSetup;
  document.getElementById("btn-help").onclick = openWizard;

  renderMap(currentPersp());
  renderBoards(currentPersp());
  renderMaestro();
  initDetalle();
}
window.addEventListener("resize", ()=> renderMap(currentPersp()));

function renderBoards(perspId){
  const cards = document.getElementById("cards");
  const kpis = state.kpis.filter(k => {
    const o = state.objetivos.find(o=>o.id===k.objetivo_id);
    return o && (!perspId || o.perspectiva===perspId);
  });
  cards.innerHTML = "";
  for (const k of kpis) {
    const datos = getDatosByKpi(k.id);
    const v = datos.at(-1)?.valor ?? null;
    const pct = pctCumplimiento(k, v);
    const rag = ragFromPct(k, pct);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:6px"><span class="badge rag ${rag}"></span><b>${k.nombre}</b></div>
        <div class="small">${k.formula}</div>
        <div class="small">Resp: ${k.responsable||"—"}</div>
      </div>
      <div style="text-align:right">
        <div><b>${v??"—"} </b> <span class="small">${k.unidad||""}</span></div>
        <div class="small">${pct.toFixed(0)}% de meta</div>
        <div class="spark" data-k="${k.id}"></div>
      </div>
    `;
    card.onclick = ()=> {
      document.querySelector('[data-view="detalle"]').click();
      document.getElementById("kpi-select").value = k.id;
      renderKPI(k.id);
    };
    cards.appendChild(card);
  }
  drawSparklines();
}

function renderMaestro(){
  const v = semaforoGeneral();
  document.getElementById("gauge-val").textContent = `${v.toFixed(0)}%`;
  const light = document.getElementById("gauge-light");
  light.classList.remove("green","amber","red");
  light.classList.add(v>=100? "green" : v>=80? "amber" : "red");

  const bars = document.getElementById("persp-bars");
  bars.innerHTML = "";
  for (const p of state.perspectivas) {
    const i = indicePerspectiva(p.id);
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "86px 1fr 40px";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.innerHTML = `
      <div class="small">${p.nombre}</div>
      <div style="height:10px;background:#0d0f14;border:1px solid var(--border);border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100,i).toFixed(0)}%;background:${i>=100?"#00c389":i>=80?"#f5a524":"#ff5a67"}"></div>
      </div>
      <div class="small" style="text-align:right">${i.toFixed(0)}%</div>
    `;
    bars.appendChild(row);
  }
}

function initDetalle(){
  const first = state.kpis[0]?.id;
  if (first) renderKPI(first);
}

function renderKPI(kid){
  const k = state.kpis.find(x=>x.id===kid);
  if (!k) return;
  const metaDiv = document.getElementById("kpi-meta");
  metaDiv.textContent = `${k.definicion} • Freq: ${k.frecuencia} • Fuente: ${k.fuente_datos}`;
  drawSeries(k);
  const props = document.getElementById("kpi-props");
  props.innerHTML = `
    <div class="row">
      <div><label>Benchmark</label><div class="small">${k.benchmark?.tipo||"—"}: ${k.benchmark?.valor??"—"} </div></div>
      <div><label>Meta</label><div class="small">${k.meta??"—"} ${k.unidad||""}</div></div>
    </div>
    <div class="small">Fórmula: ${k.formula}</div>
    <div class="small">Justificación: ${k.justificacion_ia||"—"}</div>
  `;
}

function drawSeries(k){
  const c = document.getElementById("kpi-chart");
  const ctx = c.getContext("2d");
  const data = getDatosByKpi(k.id);
  const w = c.width, h = c.height;
  ctx.clearRect(0,0,w,h);
  // bg
  ctx.fillStyle = "#0d0f14"; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = "#232734"; ctx.strokeRect(0.5,0.5,w-1,h-1);
  if (data.length<2) return;
  const xs = data.map((_,i)=> i/(data.length-1));
  const vs = data.map(d=>d.valor);
  const min = Math.min(...vs), max = Math.max(...vs);
  // grid
  ctx.strokeStyle="#1b1f2a"; ctx.lineWidth=1;
  for (let i=0;i<5;i++){ const y = 10 + i*((h-20)/4); ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(w-10,y); ctx.stroke(); }
  // meta line
  if (k.meta!=null){ const y = mapVal(k.meta,min,max, h-16, 16); ctx.strokeStyle="#444"; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(w-10,y); ctx.stroke(); ctx.setLineDash([]); }
  // spark
  ctx.strokeStyle="#60a5fa"; ctx.lineWidth=2;
  ctx.beginPath();
  for (let i=0;i<xs.length;i++){
    const x = 10 + xs[i]*(w-20);
    const y = mapVal(vs[i],min,max, h-16, 16);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

function mapVal(v, min, max, a, b){
  if (max===min) return (a+b)/2;
  const t = (v-min)/(max-min);
  return a*(1-t)+b*t;
}

function drawSparklines(){
  document.querySelectorAll(".spark").forEach(el=>{
    const kid = el.dataset.k;
    const data = getDatosByKpi(kid);
    const w = 72, h = 24;
    const c = document.createElement("canvas"); c.width=w; c.height=h; el.innerHTML=""; el.appendChild(c);
    const ctx = c.getContext("2d");
    ctx.fillStyle="#0d0f14"; ctx.fillRect(0,0,w,h);
    const vs = data.map(d=>d.valor);
    const min = Math.min(...vs), max = Math.max(...vs);
    ctx.strokeStyle="#2dd4bf"; ctx.lineWidth=1.5;
    data.forEach((d,i)=>{
      const x = 2 + i/(Math.max(1,data.length-1)) * (w-4);
      const y = mapVal(d.valor, min, max, h-2, 2);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });
}

// Sheets and CSV
function importCSVData(){
  const input = document.createElement("input");
  input.type="file"; input.accept=".csv,text/csv";
  input.onchange = ()=>{
    const file = input.files[0]; if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: (res)=>{
        for (const r of res.data) {
          if (!r.kpi_id || !r.fecha || !r.valor) continue;
          addDato({ kpi_id: r.kpi_id, fecha: r.fecha, valor: +r.valor });
        }
        initDetalle();
        renderBoards(currentPersp());
      }
    });
  };
  input.click();
}

// Map PNG export
function exportMapPNG(){
  const svg = document.getElementById("mapa-svg");
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  const box = svg.viewBox.baseVal;
  img.onload = ()=> {
    const c = document.createElement("canvas");
    c.width = box.width; c.height = box.height;
    const ctx = c.getContext("2d");
    ctx.fillStyle="#0d0f14"; ctx.fillRect(0,0,c.width,c.height);
    ctx.drawImage(img,0,0);
    c.toBlob(b=>downloadBlob(b,"mapa.png"));
  };
  img.src = svg64;
}

function downloadBlob(b,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),0); }

// Bottom sheet
const sheet = document.getElementById("sheet");
const sheetContent = document.getElementById("sheet-content");
function openSheet(html){ sheetContent.innerHTML = html; sheet.classList.add("visible"); }
function closeSheet(){ sheet.classList.remove("visible"); }

// Setup modal (sector, plantilla, importar objetivos)
function openSetup(){
  const html = `
    <div class="row">
      <div>
        <label>Sector</label>
        <select id="sector">
          <option ${state.config.sector==="Privado"?"selected":""}>Privado</option>
          <option ${state.config.sector==="Publico"?"selected":""}>Publico</option>
        </select>
      </div>
      <div>
        <label>Periodicidad</label>
        <select id="period"><option>Mensual</option><option>Trimestral</option></select>
      </div>
    </div>
    <label>Importar objetivos (CSV) columnas: perspectiva,id,nombre,descripcion,prioridad,dueno,horizonte,depende_de(;) </label>
    <button id="btn-imp-obj">Importar CSV</button>
    <div class="sheet-actions">
      <button id="btn-add-obj">Agregar objetivo</button>
      <button id="btn-close">Cerrar</button>
    </div>
  `;
  openSheet(html);
  document.getElementById("btn-close").onclick = closeSheet;
  document.getElementById("btn-imp-obj").onclick = importObjetivosCSV;
  document.getElementById("btn-add-obj").onclick = addObjetivoModal;
}

function importObjetivosCSV(){
  const input = document.createElement("input");
  input.type="file"; input.accept=".csv,text/csv";
  input.onchange = ()=>{
    const f = input.files[0]; if (!f) return;
    Papa.parse(f, { header:true, complete:(res)=>{
      for (const r of res.data) {
        if (!r.id || !r.perspectiva || !r.nombre) continue;
        const obj = {
          id: r.id, perspectiva: r.perspectiva, nombre: r.nombre, descripcion: r.descripcion||"",
          prioridad: r.prioridad||"Media", dueno: r.dueno||"—", horizonte: r.horizonte||"",
          depende_de: (r.depende_de||"").split(";").filter(Boolean), impacta_a:[]
        };
        upsertObjective(obj);
      }
      renderMap(currentPersp());
      closeSheet();
      // Prompt KPI suggestions
      openWizard();
    }});
  };
  input.click();
}

function addObjetivoModal(){
  openSheet(`
    <label>Perspectiva</label>
    <select id="p">
      ${state.perspectivas.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join("")}
    </select>
    <label>Nombre</label><input id="n" placeholder="Ej. Incrementar rentabilidad" />
    <label>Descripción</label><input id="d" />
    <label>Dueño</label><input id="du" />
    <div class="sheet-actions">
      <button id="ok">Guardar</button>
      <button id="cancel">Cancelar</button>
    </div>
  `);
  document.getElementById("cancel").onclick = closeSheet;
  document.getElementById("ok").onclick = ()=>{
    const id = "OBJ-" + Math.random().toString(36).slice(2,6).toUpperCase();
    const obj = { id, perspectiva: document.getElementById("p").value, nombre: document.getElementById("n").value, descripcion: document.getElementById("d").value, prioridad:"Media", dueno: document.getElementById("du").value, horizonte:"", depende_de:[], impacta_a:[] };
    upsertObjective(obj);
    renderMap(currentPersp());
    // Suggest KPIs
    const ks = suggestKPIsForObjective(obj);
    openKpiSuggest(ks);
  };
}

// Wizard: Sugerencias de KPIs con Aceptar/Editar/Descartar
function openWizard(){
  const objs = state.objetivos;
  if (objs.length===0) { closeSheet(); return; }
  const ks = objs.flatMap(o => suggestKPIsForObjective(o));
  openKpiSuggest(ks);
}

function openKpiSuggest(kpis){
  openSheet(`
    <div><b>KPIs sugeridos por IA</b></div>
    <div id="kpi-sugs" style="display:grid;gap:8px"></div>
    <div class="sheet-actions">
      <button id="accept">Aceptar seleccionados</button>
      <button id="close">Cerrar</button>
    </div>
  `);
  const cont = document.getElementById("kpi-sugs");
  for (const k of kpis) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div>
        <div><input type="checkbox" checked /> <b>${k.nombre}</b> <span class="small">(${k.unidad})</span></div>
        <div class="small">${k.definicion}</div>
        <div class="small">Fórmula: ${k.formula}</div>
        <div class="small">Fuente: ${k.fuente_datos} • Meta: ${k.meta}</div>
      </div>
      <div style="display:grid;gap:6px">
        <button class="edit">Editar</button>
        <button class="drop">Descartar</button>
      </div>
    `;
    const cb = el.querySelector("input");
    el.querySelector(".drop").onclick = ()=> { el.remove(); };
    el.querySelector(".edit").onclick = ()=> editKpiInline(el, k);
    cont.appendChild(el);
  }
  document.getElementById("close").onclick = closeSheet;
  document.getElementById("accept").onclick = ()=> {
    const accepted = [];
    cont.querySelectorAll(".card").forEach(el=> {
      const checked = el.querySelector("input")?.checked;
      if (!checked) return;
      accepted.push(el._kpi);
    });
    // Build from DOM to preserve edits
    cont.querySelectorAll(".card").forEach(el=> {
      const checked = el.querySelector("input")?.checked;
      if (!checked) return;
      accepted.push(el._kpi);
    });
    acceptSuggestedKPIs(accepted);
    closeSheet();
    renderBoards(currentPersp());
    initDetalle();
  };
  // attach kpi objects to elements
  Array.from(cont.children).forEach((el,i)=> el._kpi = kpis[i]);
}

function editKpiInline(el, k){
  const form = document.createElement("div");
  form.innerHTML = `
    <div class="row">
      <div><label>Nombre</label><input value="${k.nombre}"/></div>
      <div><label>Unidad</label><input value="${k.unidad}"/></div>
    </div>
    <label>Fórmula</label><input value="${k.formula}"/>
    <label>Meta</label><input type="number" value="${k.meta}"/>
  `;
  el.querySelector("div").appendChild(form);
  const inputs = form.querySelectorAll("input");
  inputs.forEach(inp => inp.addEventListener("input", ()=> {
    const [nm, un] = [inputs[0].value, inputs[1].value];
    k.nombre = nm; k.unidad = un; k.formula = inputs[2].value; k.meta = +inputs[3].value;
    el._kpi = k;
  }));
}

// Add data inline
function openAddData(){
  const k = state.kpis.find(x=>x.id===document.getElementById("kpi-select").value);
  if (!k) return;
  openSheet(`
    <div><b>Agregar dato: ${k.nombre}</b></div>
    <div class="row">
      <div><label>Fecha</label><input type="date" id="fd"/></div>
      <div><label>Valor (${k.unidad||""})</label><input type="number" step="any" id="fv"/></div>
    </div>
    <div class="sheet-actions">
      <button id="ok">Guardar</button>
      <button id="cancel">Cancelar</button>
    </div>
  `);
  document.getElementById("cancel").onclick = closeSheet;
  document.getElementById("ok").onclick = ()=>{
    const fecha = document.getElementById("fd").value;
    const valor = +document.getElementById("fv").value;
    if (fecha && !isNaN(valor)) {
      addDato({ kpi_id:k.id, fecha, valor });
      renderKPI(k.id);
      renderBoards(currentPersp());
      closeSheet();
    }
  };
}

initCommon();