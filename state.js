export const DEFAULT_STATE = {
  config: {
    sector: "Privado",
    moneda: "PEN",
    periodicidad: "Mensual",
    umbral_default: { verde: ">=100", ambar: ">=80 y <100", rojo: "<80" },
    idioma: "es-PE"
  },
  perspectivas: [
    { id: "FIN", nombre: "Financiera" },
    { id: "CLI", nombre: "Cliente/Ciudadano" },
    { id: "PRO", nombre: "Procesos Internos" },
    { id: "APC", nombre: "Aprendizaje & Crecimiento" }
  ],
  objetivos: [],
  kpis: [],
  iniciativas: [],
  datos: [],
  pesos: {
    perspectivas: { FIN: 0.3, CLI: 0.25, PRO: 0.25, APC: 0.2 },
    kpis: {}
  }
};

const LS_KEY = "bsc_ia_state_v1";

export function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  const seeded = seedSample(JSON.parse(JSON.stringify(DEFAULT_STATE)));
  saveState(seeded);
  return seeded;
}

export function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function seedSample(state) {
  // Minimal semillas: 1–2 objetivos por perspectiva y 2–3 KPIs
  const O = [
    { id:"OBJ-F1", perspectiva:"FIN", nombre:"Incrementar rentabilidad", descripcion:"Subir margen y ROA", prioridad:"Alta", dueno:"Finanzas", horizonte:"2025-12-31", depende_de:[ "OBJ-P1" ], impacta_a:[ "OBJ-C1" ] },
    { id:"OBJ-C1", perspectiva:"CLI", nombre:"Aumentar NPS", descripcion:"Mejorar satisfacción", prioridad:"Alta", dueno:"CX", horizonte:"2025-12-31", depende_de:[ "OBJ-P1" ], impacta_a:[] },
    { id:"OBJ-P1", perspectiva:"PRO", nombre:"Mejorar fill rate", descripcion:"Cumplir pedidos", prioridad:"Alta", dueno:"Operaciones", horizonte:"2025-09-30", depende_de:[ "OBJ-A1" ], impacta_a:[ "OBJ-F1","OBJ-C1" ] },
    { id:"OBJ-A1", perspectiva:"APC", nombre:"Capacitar equipo", descripcion:"Ventas consultivas", prioridad:"Media", dueno:"RRHH", horizonte:"2025-06-30", depende_de:[], impacta_a:[ "OBJ-P1" ] }
  ];
  state.objetivos = O;

  const K = [
    kpi("KPI-ROA","OBJ-F1","ROA","utilidad_neta / activos_totales * 100","%","Mensual","ERP",10,{tipo:"industria",valor:8,nota:"Retail autopartes"}),
    kpi("KPI-Margen","OBJ-F1","Margen bruto %","(ventas - costo_ventas) / ventas * 100","%","Mensual","ERP",35,{tipo:"interno",valor:32}),

    kpi("KPI-NPS","OBJ-C1","NPS","%promotores - %detractores","pts","Mensual","Encuesta",55,{tipo:"industria",valor:50}),
    kpi("KPI-Recompra","OBJ-C1","Tasa de recompra 90d","clientes_recompra_90 / clientes_totales * 100","%","Mensual","CRM",30,{tipo:"interno",valor:25}),

    kpi("KPI-Fill","OBJ-P1","Fill rate %","pedido_surtido / pedido_total * 100","%","Mensual","WMS/ERP",95,{tipo:"industria",valor:93}),
    kpi("KPI-OTIF","OBJ-P1","OTIF %","entregas_a_tiempo_y_completas / entregas_total * 100","%","Mensual","TMS",92,{tipo:"industria",valor:90}),

    kpi("KPI-HorasCap","OBJ-A1","Horas capacitación/empleado/mes","horas_totales_capacitacion / empleados","horas","Mensual","RRHH",4,{tipo:"gubernamental",valor:2}),
    kpi("KPI-Adop","OBJ-A1","Adopción de sistemas %","usuarios_activos / usuarios_totales * 100","%","Mensual","TI",85,{tipo:"interno",valor:80})
  ];
  state.kpis = K;

  // 12 periodos sintéticos
  const months = Array.from({length:12}, (_,i)=> {
    const d = new Date(); d.setMonth(d.getMonth()- (11-i)); d.setDate(28);
    return d.toISOString().slice(0,10);
  });
  state.datos = [];
  for (const k of K) {
    let base = typeof k.meta === "number" ? k.meta * (0.85 + Math.random()*0.2) : 50;
    for (const m of months) {
      const jitter = (Math.random()-0.5) * (Math.abs(base)*0.1);
      state.datos.push({ kpi_id: k.id, fecha: m, valor: +(base + jitter).toFixed(2) });
    }
  }

  // pesos kpi = iguales
  state.pesos.kpis = Object.fromEntries(K.map(k => [k.id, 1]));
  return state;
}

function kpi(id,objId,nombre,formula,unidad,frecuencia,fuente,meta,benchmark) {
  return {
    id, objetivo_id: objId, nombre,
    definicion: nombre,
    formula, unidad, frecuencia,
    fuente_datos: fuente,
    benchmark,
    meta,
    umbrales: { verde: `>=${meta}`, ambar: `>=${(meta*0.8).toFixed(2)} y <${meta}`, rojo: `<${(meta*0.8).toFixed(2)}` },
    responsable: "—",
    justificacion_ia: "Inicial semilla."
  };
}

export const state = loadState();

export function upsertObjective(obj) {
  const i = state.objetivos.findIndex(o => o.id===obj.id);
  if (i>=0) state.objetivos[i]=obj; else state.objetivos.push(obj);
  saveState(state);
}

export function upsertKpi(k) {
  const i = state.kpis.findIndex(x=>x.id===k.id);
  if (i>=0) state.kpis[i]=k; else state.kpis.push(k);
  if (!state.pesos.kpis[k.id]) state.pesos.kpis[k.id]=1;
  saveState(state);
}

export function addDato(rec) {
  state.datos.push(rec);
  saveState(state);
}

export function getDatosByKpi(kpiId) {
  return state.datos.filter(d=>d.kpi_id===kpiId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
}

export function pctCumplimiento(kpi, valor) {
  if (valor == null || isNaN(valor)) return 0;
  const meta = kpi.meta ?? 0;
  if (meta === 0) return 0;
  // TODO: sentido "menor es mejor" si se marca; por ahora mayor es mejor
  return (valor/meta)*100;
}

export function ragFromPct(kpi, pct) {
  const v = pct;
  // parse umbrales simples
  if (v >= 100) return "green";
  if (v >= 80) return "amber";
  return "red";
}

export function indicePerspectiva(perspId) {
  const kpis = state.kpis.filter(k => state.objetivos.find(o=>o.id===k.objetivo_id)?.perspectiva===perspId);
  if (kpis.length===0) return 0;
  let num=0, den=0;
  for (const k of kpis) {
    const datos = getDatosByKpi(k.id);
    const v = datos.at(-1)?.valor ?? 0;
    const pct = pctCumplimiento(k, v);
    const w = state.pesos.kpis[k.id] ?? 1;
    num += pct * w; den += w;
  }
  return den? num/den : 0;
}

export function semaforoGeneral() {
  const p = state.pesos.perspectivas;
  const ids = [ "FIN","CLI","PRO","APC" ];
  let s=0,t=0;
  for (const id of ids) {
    const w = p[id] ?? 1;
    s += indicePerspectiva(id)*w; t += w;
  }
  return t? s/t : 0;
}