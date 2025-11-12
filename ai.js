import { state, upsertKpi } from "./state.js";

const LIB = {
  FIN: [
    { nombre: "ROA", def: "Utilidad neta / Activos totales", formula: "utilidad_neta / activos_totales * 100", unidad: "%", fuente: "ERP/Contabilidad" },
    { nombre: "Margen bruto %", def: "(Ventas - Costo) / Ventas", formula: "(ventas - costo_ventas) / ventas * 100", unidad: "%", fuente: "ERP" },
    { nombre: "Rotación de inventario", def: "Costo ventas / Inventario prom.", formula: "costo_ventas / inventario_promedio", unidad: "veces", fuente: "ERP" },
    { nombre: "Costo logístico / venta %", def: "Costos logísticos / Ventas", formula: "costos_logisticos / ventas * 100", unidad: "%", fuente: "ERP/TMS" }
  ],
  CLI: [
    { nombre: "NPS", def: "%Promotores - %Detractores", formula: "promotores - detractores", unidad: "pts", fuente: "Encuesta" },
    { nombre: "Tasa de recompra 90d", def: "Clientes que recompran / Totales", formula: "clientes_recompra_90 / clientes_totales * 100", unidad: "%", fuente: "CRM" },
    { nombre: "Tiempo medio de atención", def: "Duración promedio atención", formula: "tiempo_total_atencion / atenciones", unidad: "min", fuente: "CRM/Contact" }
  ],
  PRO: [
    { nombre: "Fill rate %", def: "Pedido surtido / total", formula: "pedido_surtido / pedido_total * 100", unidad: "%", fuente: "WMS/ERP" },
    { nombre: "OTIF %", def: "Entregas a tiempo y completas / total", formula: "entregas_a_tiempo_y_completas / entregas_total * 100", unidad: "%", fuente: "TMS" },
    { nombre: "DOH", def: "Días de inventario", formula: "inventario / costo_ventas_diario", unidad: "días", fuente: "ERP" }
  ],
  APC: [
    { nombre: "Horas capacitación/empleado/mes", def: "Horas totales / empleados", formula: "horas_totales_capacitacion / empleados", unidad: "horas", fuente: "RRHH" },
    { nombre: "Adopción de sistemas %", def: "Usuarios activos / totales", formula: "usuarios_activos / usuarios_totales * 100", unidad: "%", fuente: "TI" },
    { nombre: "% Personal certificado", def: "Certificados / total", formula: "personal_certificado / personal_total * 100", unidad: "%", fuente: "RRHH" }
  ]
};

export function suggestKPIsForObjective(obj) {
  const set = LIB[obj.perspectiva] ?? [];
  const picks = set.slice(0, 3 + Math.floor(Math.random() * Math.min(2, Math.max(0, set.length - 3))));
  const out = picks.map((x, i) => {
    const meta = defaultMeta(obj.perspectiva, x.nombre);
    return {
      id: `KPI-${obj.id.split("-").pop()}-${i + 1}-${slug(x.nombre)}`.slice(0, 20),
      objetivo_id: obj.id,
      nombre: x.nombre,
      definicion: x.def,
      formula: x.formula,
      unidad: x.unidad,
      frecuencia: state.config.periodicidad || "Mensual",
      fuente_datos: x.fuente,
      benchmark: benchGuess(obj.perspectiva, x.nombre),
      meta,
      umbrales: {
        verde: `>=${meta}`,
        ambar: `>=${(meta * 0.8).toFixed(2)} y <${meta}`,
        rojo: `<${(meta * 0.8).toFixed(2)}`
      },
      responsable: obj.dueno || "—",
      justificacion_ia: justify(obj, x)
    };
  });
  return out;
}

function defaultMeta(p, n) {
  if (n.includes("%")) return 90;
  if (p === "FIN" && /ROA|margen/i.test(n)) return 10;
  if (p === "CLI" && /NPS/i.test(n)) return 60;
  if (p === "APC" && /Adopción/i.test(n)) return 85;
  return 90;
}

function benchGuess(p, n) {
  return { tipo: "industria", valor: p === "FIN" ? 8 : (p === "CLI" && /NPS/i.test(n) ? 50 : (p === "APC" ? 75 : 90)), nota: "Estimado" };
}

function justify(obj, x) {
  return `Vincula "${x.nombre}" con "${obj.nombre}" en ${obj.perspectiva}, medible y trazable al mapa.`;
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

export function acceptSuggestedKPIs(kpis) {
  for (const k of kpis) upsertKpi(k);
}