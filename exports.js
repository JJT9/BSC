import { state, indicePerspectiva, semaforoGeneral } from "./state.js";
import { saveAs } from "./file-saver-shim.js";
import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgen";

export function exportJSON() {
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  download(blob, "bsc.json");
}

export function exportCSV() {
  const rows = [[ "kpi_id", "fecha", "valor" ], ...state.datos.map(d=>[d.kpi_id,d.fecha,d.valor])];
  const csv = rows.map(r => r.map(x => `"${(x?? "").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  download(blob, "datos.csv");
}

export function exportPDF() {
  const doc = new jsPDF({ unit:"pt", format:"a4" });
  doc.setFontSize(16); doc.text("Balanced Scorecard — Resumen", 40, 50);
  doc.setFontSize(12);
  const y0 = 80;
  const ids = ["FIN","CLI","PRO","APC"];
  ids.forEach((id, i)=>{
    const y = y0 + i*24;
    doc.text(`${id}: ${indicePerspectiva(id).toFixed(1)}%`, 40, y);
  });
  doc.text(`Semáforo General: ${semaforoGeneral().toFixed(1)}%`, 40, y0 + 5*24);
  doc.save("BSC.pdf");
}

export function exportPPT() {
  const pptx = new PptxGenJS();
  const slide = pptx.addSlide();
  slide.addText("Balanced Scorecard — Resumen Ejecutivo", { x:0.5, y:0.4, w:9, fontSize:24 });
  const ids = ["FIN","CLI","PRO","APC"];
  ids.forEach((id, i)=>{
    slide.addText(`${id}: ${indicePerspectiva(id).toFixed(1)}%`, { x:0.8, y:1.2 + i*0.4, fontSize:18 });
  });
  slide.addText(`General: ${semaforoGeneral().toFixed(1)}%`, { x:0.8, y:3.2, fontSize:18, color:"00C389" });
  pptx.writeFile({ fileName: "BSC.pptx" });
}

function download(blob, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

// Minimal shim to satisfy import without extra CDN
export const saveAsShim = null;