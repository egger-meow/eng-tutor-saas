export const printStyles = `
  @page { size: A4; margin: 14mm; @bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; color: #555; } }
  * { box-sizing: border-box; }
  body { margin: 0; color: #171717; font-family: Arial, "Noto Sans", sans-serif; font-size: 10.5pt; line-height: 1.45; }
  header { border-bottom: 2px solid #171717; margin-bottom: 6mm; padding-bottom: 3mm; }
  h1 { font-size: 22pt; line-height: 1.15; margin: 0 0 2mm; }
  h2 { border-bottom: 1px solid #888; font-size: 15pt; margin: 7mm 0 3mm; padding-bottom: 1mm; }
  h3 { font-size: 12pt; margin: 5mm 0 2mm; }
  p { margin: 0 0 2.5mm; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin-bottom: 1.5mm; }
  .meta { color: #444; display: flex; flex-wrap: wrap; gap: 2mm 6mm; font-size: 9.5pt; }
  .meta span { white-space: nowrap; }
  .card, .question, .answer { break-inside: avoid-page; page-break-inside: avoid; -webkit-column-break-inside: avoid; display: flow-root; border: 1px solid #aaa; margin: 0 0 3mm; padding: 3mm; }
  .vocab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; }
  .word { font-weight: 700; }
  .muted, .label { color: #555; }
  .label { font-size: 8.5pt; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  .passage { white-space: pre-line; }
  .writing-line { border-bottom: 1px solid #999; height: 8mm; }
  .option { margin-left: 4mm; }
  .answer { border-left: 4px solid #333; }
  .answer strong { display: inline-block; min-width: 24mm; }
  section { break-inside: auto; }
  h2, h3 { break-after: avoid; }
  .page-break { break-before: page; }
`
