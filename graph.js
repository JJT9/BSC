import * as d3 from "d3";
import dagre from "dagre";
import { state } from "./state.js";

const P_COLORS = { FIN:"#36d399", CLI:"#60a5fa", PRO:"#f59e0b", APC:"#a78bfa" };

export function renderMap(perspFilter) {
  const svg = d3.select("#mapa-svg");
  const wrap = document.getElementById("mapa-wrap");
  const w = wrap.clientWidth, h = wrap.clientHeight || 360;
  svg.attr("viewBox", `0 0 ${w} ${h}`).selectAll("*").remove();

  // Build DAG
  const g = new dagre.graphlib.Graph().setGraph({ rankdir: "TB", nodesep: 30, ranksep: 60 }).setDefaultEdgeLabel(()=>({}));
  const objs = state.objetivos.filter(o => !perspFilter || o.perspectiva===perspFilter);
  for (const o of objs) {
    const label = `${o.nombre}`;
    const width = Math.min(220, Math.max(120, 10 + label.length*7));
    const height = 44;
    g.setNode(o.id, { label, width, height, perspectiva:o.perspectiva });
  }
  for (const o of objs) {
    for (const d of (o.depende_de||[])) {
      if (g.node(d) && g.node(o.id)) g.setEdge(d, o.id);
    }
  }
  dagre.layout(g);

  // Edges
  const edges = g.edges().map(e => {
    const points = g.edge(e).points;
    return { from:e.v, to:e.w, points };
  });
  svg.append("g").attr("stroke","#394055").attr("fill","none").attr("stroke-width",1.5)
    .selectAll("path").data(edges).enter().append("path")
    .attr("d", d => d3.line().curve(d3.curveBasis)(d.points.map(p=>[p.x, p.y])))
    .attr("marker-end","url(#arrow)");

  // Marker
  svg.append("defs").append("marker")
    .attr("id","arrow").attr("viewBox","0 0 10 10").attr("refX","10").attr("refY","5")
    .attr("markerWidth","6").attr("markerHeight","6").attr("orient","auto-start-reverse")
    .append("path").attr("d","M 0 0 L 10 5 L 0 10 z").attr("fill","#394055");

  // Nodes
  const nodes = g.nodes().map(id => ({ id, ...g.node(id)}));
  const nodeG = svg.append("g").selectAll("g.node").data(nodes).enter().append("g").attr("transform", d=>`translate(${d.x - d.width/2},${d.y - d.height/2})`);
  nodeG.append("rect")
    .attr("rx",10).attr("ry",10)
    .attr("width", d=>d.width).attr("height", d=>d.height)
    .attr("fill", d=>shade(P_COLORS[d.perspectiva]||"#64748b",0.14))
    .attr("stroke", d=>P_COLORS[d.perspectiva]||"#64748b").attr("stroke-width",1.5);
  nodeG.append("text")
    .attr("x", d=>d.width/2).attr("y", d=>d.height/2+4)
    .attr("text-anchor","middle").attr("fill","#e5e7eb").style("font-size","12px")
    .text(d=>d.label);

  // Drag
  const drag = d3.drag().on("start", function(e,d){ d3.select(this).raise(); })
    .on("drag", function(e,d){
      d.x += e.dx; d.y += e.dy;
      d3.select(this).attr("transform", `translate(${d.x - d.width/2},${d.y - d.height/2})`);
      redrawEdges();
    });
  nodeG.call(drag);

  function redrawEdges(){
    svg.selectAll("path").attr("d", ed => {
      const points = g.edge(ed.from, ed.to).points;
      // move near to new bbox if endpoints dragged
      const from = nodes.find(n=>n.id===ed.from);
      const to = nodes.find(n=>n.id===ed.to);
      if (from && to) {
        points[0] = { x: from.x, y: from.y + from.height/2 };
        points[points.length-1] = { x: to.x, y: to.y - to.height/2 };
      }
      return d3.line().curve(d3.curveBasis)(points.map(p=>[p.x, p.y]));
    });
  }
}

function shade(hex, a=0.15){
  const c = hex.replace("#",""); const r=parseInt(c.substring(0,2),16), g=parseInt(c.substring(2,4),16), b=parseInt(c.substring(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}