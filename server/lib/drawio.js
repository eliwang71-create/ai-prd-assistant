function escapeXml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function buildDrawioXml(diagram) {
    const nodes = diagram.nodes || [];
    const edges = diagram.edges || [];

    const nodeCells = nodes
        .map((node, index) => {
            const x = 60 + index * 220;
            const y = 180;
            return `
        <mxCell id="${escapeXml(node.id)}" value="${escapeXml(node.label)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=18;strokeColor=#1F2937;fillColor=#F3F4F6;fontSize=14;fontColor=#111827;spacing=14;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="180" height="88" as="geometry" />
        </mxCell>`;
        })
        .join("");

    const edgeCells = edges
        .map(
            (edge, index) => `
        <mxCell id="e${index + 1}" value="${escapeXml(edge.label || "")}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#6B7280;strokeWidth=2;endArrow=block;endFill=1;" edge="1" parent="1" source="${escapeXml(edge.from)}" target="${escapeXml(edge.to)}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`
        )
        .join("");

    return `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="PRD Copilot" version="24.7.17">
  <diagram id="diagram-1" name="PRD Copilot Diagram">
    <mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" value="${escapeXml(diagram.title || "PRD Copilot 流程图")}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=24;fontStyle=1;fontColor=#111827;" vertex="1" parent="1">
          <mxGeometry x="60" y="40" width="560" height="40" as="geometry" />
        </mxCell>${nodeCells}${edgeCells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}
