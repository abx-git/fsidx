function diagramId(): string {
  return `d-${Math.random().toString(36).slice(2, 11)}`
}

/** Leeres draw.io-Diagramm (eine Seite). */
export function newDrawioFileXml(): string {
  const id = diagramId()
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="fsidx" version="24.7.0" type="device">
  <diagram name="Seite-1" id="${id}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`
}