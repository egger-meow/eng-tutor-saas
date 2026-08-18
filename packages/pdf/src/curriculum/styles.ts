export const curriculumStyles = `
  @page {
    size: A4;
    margin: 14mm 15mm 16mm;
    @bottom-center {
      content: "紙屬英文  ·  " counter(page);
      font-size: 8pt;
      color: #6c645c;
      font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif;
    }
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    color: #1f2421;
    background: #ffffff;
    font-family: "Noto Sans TC", "Microsoft JhengHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Structural Typography & Headings */
  h1, h2, h3, h4 {
    color: #172d29;
    break-after: avoid;
    page-break-after: avoid;
    margin-top: 0;
  }

  h1 {
    font-family: "Noto Serif TC", Georgia, serif;
    font-size: 22pt;
    line-height: 1.25;
    letter-spacing: 0.01em;
    margin-bottom: 2mm;
    font-weight: 700;
  }

  h2 {
    font-size: 13.5pt;
    font-weight: 700;
    color: #173e37;
    border-bottom: 1.5px solid #d8cdbd;
    padding-bottom: 1.5mm;
    margin: 6mm 0 2.5mm;
  }

  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #282420;
    margin: 4mm 0 2mm;
  }

  p {
    margin: 0 0 2.5mm;
  }

  ul, ol {
    margin: 0 0 3mm;
    padding-left: 5.5mm;
  }

  li {
    margin-bottom: 1.2mm;
  }

  .muted {
    color: #6c645c;
  }

  .small {
    font-size: 8.5pt;
    color: #6c645c;
  }

  /* Header & Banner */
  header {
    border-bottom: 1.5px solid #b7aa98;
    padding-bottom: 4mm;
    margin-bottom: 5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .brand-bar {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1.5mm;
  }

  .brand-title {
    color: #765d42;
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.15em;
  }

  .brand-edition {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    padding: 0.5mm 2.5mm;
    border-radius: 2px;
    letter-spacing: 0.05em;
  }

  .brand-edition.student {
    background: #eaf1ec;
    color: #173e37;
    border: 1px solid #c2d5c7;
  }

  .brand-edition.parent {
    background: #fbf0e4;
    color: #8b4f26;
    border: 1px solid #e7ceb7;
  }

  .header-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm 6mm;
    color: #5c564e;
    font-size: 9pt;
    margin-top: 1.5mm;
  }

  .header-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 1.5mm;
  }

  .header-meta-badge {
    background: #f4ede2;
    color: #765d42;
    padding: 0.5mm 2mm;
    border-radius: 2px;
    font-weight: 600;
    font-size: 8.5pt;
  }

  /* Orientation Callout & Goal Panel */
  .orientation-card {
    border: 1px solid #d8cdbd;
    background: #faf7f2;
    border-left: 4.5px solid #8b4f26;
    padding: 3.5mm 4.5mm;
    margin: 3.5mm 0 5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .kicker {
    color: #8b4f26;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1.5mm;
  }

  .goals-list {
    margin: 1.5mm 0 2.5mm;
    padding-left: 4.5mm;
    color: #24201c;
  }

  .goals-list li {
    margin-bottom: 1mm;
    font-weight: 500;
  }

  .guide-tip {
    border-top: 1px dashed #d5cbbe;
    padding-top: 2mm;
    margin-top: 2.5mm;
    font-size: 8.5pt;
    color: #5c564e;
    display: flex;
    flex-wrap: wrap;
    gap: 1.5mm 4mm;
  }

  .guide-step {
    display: inline-flex;
    align-items: center;
    gap: 1mm;
  }

  .guide-step-num {
    background: #e5ddd0;
    color: #4a423a;
    width: 4mm;
    height: 4mm;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 7.5pt;
    font-weight: 700;
  }

  /* Warm-Up Section */
  .warmup-box {
    border: 1px solid #d8cdbd;
    background: #ffffff;
    padding: 3.5mm 4.5mm;
    margin: 3mm 0 5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .warmup-prompt {
    font-weight: 600;
    color: #173e37;
    margin-bottom: 2mm;
  }

  /* Reading Section & Genres */
  .reading-container {
    margin: 4mm 0 6mm;
  }

  .reading-header {
    margin-bottom: 3mm;
  }

  .reading-meta-bar {
    background: #f6f2ea;
    border-left: 3px solid #765d42;
    padding: 2mm 3.5mm;
    margin: 2mm 0 3.5mm;
    font-size: 9pt;
    color: #4a433c;
  }

  .reading-tips {
    color: #6b6256;
    font-size: 8.5pt;
    margin-top: 1mm;
  }

  .reading-content {
    font-family: "Noto Serif TC", Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.8;
    color: #1a1e1b;
  }

  .reading-paragraph {
    margin-bottom: 3.5mm;
    text-align: left;
  }

  .target-vocab {
    font-weight: 600;
    color: #173e37;
    border-bottom: 1px dotted #8c7355;
  }

  .target-grammar {
    font-weight: 600;
    color: #765d42;
    background: rgba(118, 93, 66, 0.08);
    padding: 0 1.5px;
    border-radius: 2px;
  }

  /* Dialogue Genre */
  .dialogue-container {
    margin: 3mm 0 4mm;
    padding: 1mm 0;
  }

  .dialogue-turn {
    display: flex;
    margin-bottom: 2.5mm;
    gap: 3mm;
    break-inside: avoid;
    page-break-inside: avoid;
    font-family: "Noto Serif TC", Georgia, serif;
    font-size: 10.5pt;
    line-height: 1.65;
  }

  .dialogue-speaker {
    flex-shrink: 0;
    width: 22mm;
    font-family: "Noto Sans TC", sans-serif;
    font-weight: 700;
    color: #173e37;
    text-align: right;
    font-size: 9.5pt;
    padding-top: 0.2mm;
  }

  .dialogue-text {
    flex-grow: 1;
    border-left: 2px solid #e2d9cd;
    padding-left: 3mm;
    color: #22201d;
  }

  /* Notice / Bulletin Genre */
  .notice-card {
    border: 1.5px solid #765d42;
    background: #fdfbf7;
    padding: 4.5mm 5.5mm;
    margin: 3.5mm 0 4.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .notice-heading {
    text-align: center;
    font-family: "Noto Sans TC", sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #765d42;
    letter-spacing: 0.08em;
    border-bottom: 1px solid #d8cdbd;
    padding-bottom: 2mm;
    margin-bottom: 3mm;
  }

  .notice-body {
    font-family: "Noto Sans TC", sans-serif;
    font-size: 10pt;
    line-height: 1.65;
    color: #25231f;
  }

  /* Schedule / Table Genre */
  .schedule-table-wrap {
    margin: 3.5mm 0 4.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    font-family: "Noto Sans TC", sans-serif;
    font-size: 9.5pt;
    border: 1px solid #cfc3b1;
  }

  .schedule-table th {
    background: #ece5d9;
    color: #3d3730;
    font-weight: 700;
    text-align: left;
    padding: 2mm 3mm;
    border: 1px solid #cfc3b1;
    font-size: 9pt;
  }

  .schedule-table td {
    padding: 2mm 3mm;
    border: 1px solid #cfc3b1;
    vertical-align: top;
    line-height: 1.5;
  }

  .schedule-table tr:nth-child(even) {
    background: #faf7f2;
  }

  .schedule-time {
    font-weight: 700;
    color: #173e37;
    white-space: nowrap;
    width: 25%;
  }

  .schedule-event {
    font-weight: 600;
    color: #24201c;
  }

  .schedule-detail {
    color: #5c564e;
    font-size: 8.5pt;
    margin-top: 0.5mm;
  }

  /* Vocabulary Reference Panel */
  .vocab-section {
    margin: 5mm 0 6mm;
  }

  .vocab-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3mm 3.5mm;
    margin-top: 2.5mm;
  }

  .vocab-entry {
    border: 1px solid #dcd3c6;
    background: #fdfbf7;
    padding: 2.5mm 3.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
    border-radius: 2px;
  }

  .vocab-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1mm;
  }

  .vocab-word-group {
    display: inline-flex;
    align-items: baseline;
    gap: 2mm;
  }

  .vocab-word {
    font-size: 11.5pt;
    font-weight: 800;
    color: #173e37;
    letter-spacing: 0.01em;
  }

  .vocab-pos {
    font-size: 8.5pt;
    color: #765d42;
    font-style: italic;
  }

  .vocab-meaning {
    font-size: 9.5pt;
    font-weight: 600;
    color: #282420;
  }

  .vocab-example-en {
    font-size: 9pt;
    color: #3a342e;
    margin-top: 1mm;
    line-height: 1.45;
  }

  .vocab-example-zh {
    font-size: 8.5pt;
    color: #6c645c;
    margin-top: 0.5mm;
  }

  /* Instruction & Concept Architecture */
  .instruction-section {
    border-top: 2.5px solid #173e37;
    padding-top: 3.5mm;
    margin-top: 5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .concept-explanation {
    font-size: 10pt;
    color: #24201c;
    margin-bottom: 3mm;
  }

  .pattern-box {
    background: #edf3ee;
    border: 1px solid #c2d5c7;
    border-left: 4px solid #173e37;
    padding: 2.5mm 3.5mm;
    margin: 2.5mm 0 3.5mm;
    font-family: "Noto Serif TC", Georgia, serif;
    font-size: 10pt;
    color: #13332c;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pattern-label {
    font-family: "Noto Sans TC", sans-serif;
    font-weight: 700;
    font-size: 8pt;
    color: #173e37;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 1mm;
  }

  .pattern-formula {
    font-weight: 700;
    font-size: 10.5pt;
  }

  /* Worked Examples */
  .worked-examples-group {
    margin: 3mm 0;
  }

  .worked-card {
    border: 1px solid #d8cdbd;
    background: #fefefe;
    padding: 3mm 4mm;
    margin-bottom: 2.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .worked-target {
    font-family: "Noto Serif TC", Georgia, serif;
    font-weight: 700;
    font-size: 10.5pt;
    color: #173e37;
    margin-bottom: 1.5mm;
  }

  .worked-walkthrough {
    font-size: 9.5pt;
    color: #4a433c;
    border-top: 1px dashed #e2d9cd;
    padding-top: 1.5mm;
    margin-top: 1.5mm;
  }

  /* Common Mistakes / Traps (Grayscale-Safe) */
  .mistakes-group {
    margin: 3mm 0;
  }

  .mistake-card {
    border: 1px solid #d8cdbd;
    background: #faf8f5;
    padding: 3mm 4mm;
    margin-bottom: 2.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .mistake-comparison {
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
    margin-bottom: 2mm;
  }

  .mistake-wrong-row {
    display: flex;
    align-items: baseline;
    gap: 2mm;
    color: #8b342a;
    font-size: 9.5pt;
  }

  .mistake-tag-wrong {
    display: inline-block;
    border: 1px solid #8b342a;
    background: #fdf2f0;
    color: #8b342a;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 0.2mm 1.5mm;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .mistake-wrong-text {
    text-decoration: line-through;
    font-family: "Noto Serif TC", Georgia, serif;
  }

  .mistake-correct-row {
    display: flex;
    align-items: baseline;
    gap: 2mm;
    color: #174d41;
    font-size: 9.5pt;
    font-weight: 600;
  }

  .mistake-tag-correct {
    display: inline-block;
    border: 1px solid #174d41;
    background: #eaf3ed;
    color: #174d41;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 0.2mm 1.5mm;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .mistake-correct-text {
    font-family: "Noto Serif TC", Georgia, serif;
  }

  .mistake-why {
    font-size: 9pt;
    color: #4a433c;
    border-top: 1px dashed #e2d9cd;
    padding-top: 1.5mm;
    margin-top: 1.5mm;
  }

  /* Practice Progression & Stages */
  .stage-container {
    margin-top: 6mm;
  }

  .stage-header {
    display: flex;
    align-items: baseline;
    gap: 2.5mm;
    margin-bottom: 2mm;
    break-after: avoid;
    page-break-after: avoid;
  }

  .stage-badge {
    display: inline-block;
    padding: 0.8mm 2.5mm;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    border-radius: 2px;
    text-transform: uppercase;
  }

  .stage-badge.guided { background: #eaf1ec; color: #173e37; border: 1px solid #c2d5c7; }
  .stage-badge.independent { background: #eef1f6; color: #233b5c; border: 1px solid #ccd6e6; }
  .stage-badge.cap-transfer { background: #fdf2e9; color: #8b4f26; border: 1px solid #e9d0bd; }
  .stage-badge.production { background: #f3eff9; color: #522d7a; border: 1px solid #d7c9eb; }
  .stage-badge.retrieval { background: #f9f3ea; color: #765d42; border: 1px solid #dcd0bf; }

  .stage-title {
    font-size: 12pt;
    font-weight: 700;
    color: #173e37;
    margin: 0;
  }

  .stage-instructions {
    font-size: 9.5pt;
    color: #5c564e;
    margin-bottom: 2.5mm;
  }

  .stage-hint-box {
    border-left: 3.5px solid #765d42;
    background: #faf7f2;
    padding: 2.5mm 3.5mm;
    margin: 2mm 0 3.5mm;
    font-size: 9pt;
    color: #4a433c;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Question Component */
  .question-card {
    border: 1px solid #dcd3c6;
    background: #ffffff;
    padding: 3mm 4mm;
    margin: 2.5mm 0 3.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
    border-radius: 2px;
  }

  .question-header {
    display: flex;
    align-items: baseline;
    gap: 2.5mm;
    margin-bottom: 1.5mm;
  }

  .question-qid {
    font-family: "Noto Sans TC", sans-serif;
    font-weight: 800;
    font-size: 9pt;
    color: #765d42;
    letter-spacing: 0.05em;
  }

  .question-prompt {
    font-size: 10pt;
    color: #1f2421;
    line-height: 1.55;
    margin: 0 0 2mm;
  }

  /* Options Layout */
  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5mm 4mm;
    margin: 2mm 0 1mm 2mm;
    font-size: 9.5pt;
  }

  .options-stack {
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
    margin: 2mm 0 1mm 2mm;
    font-size: 9.5pt;
  }

  .option-item {
    display: flex;
    align-items: baseline;
    gap: 1.5mm;
    color: #2d2926;
  }

  .option-marker {
    font-weight: 700;
    color: #173e37;
    flex-shrink: 0;
  }

  /* Writing Lines */
  .writing-lines-container {
    margin-top: 2.5mm;
  }

  .writing-line {
    border-bottom: 1px solid #b8aea1;
    height: 8.5mm;
  }

  /* Self-Check Checklist */
  .selfcheck-section {
    margin: 6mm 0 5mm;
    border: 1px solid #dcd3c6;
    background: #fdfbf7;
    padding: 3.5mm 4.5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .selfcheck-list {
    list-style: none;
    padding: 0;
    margin: 2mm 0 3mm;
  }

  .selfcheck-item {
    display: flex;
    align-items: baseline;
    gap: 2.5mm;
    margin-bottom: 1.5mm;
    font-size: 9.5pt;
    color: #24201c;
  }

  .selfcheck-box {
    display: inline-block;
    width: 3.8mm;
    height: 3.8mm;
    border: 1.5px solid #765d42;
    border-radius: 1px;
    flex-shrink: 0;
    margin-top: 0.5mm;
  }

  /* Homework Section */
  .homework-section {
    margin-top: 6mm;
  }

  .homework-banner {
    background: #f6f1e8;
    border-left: 4px solid #765d42;
    padding: 2.5mm 3.5mm;
    margin-bottom: 3.5mm;
    font-size: 9pt;
    color: #4a4239;
  }

  /* Parent Answer Projection */
  .parent-guidance-card {
    border: 1px solid #e7ceb7;
    background: #fdfaf6;
    border-left: 4.5px solid #8b4f26;
    padding: 3.5mm 4.5mm;
    margin: 3.5mm 0 5mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .parent-guidance-title {
    color: #8b4f26;
    font-weight: 700;
    font-size: 9pt;
    letter-spacing: 0.08em;
    margin-bottom: 1.5mm;
  }

  .answer-card {
    border: 1px solid #d8cdbd;
    border-left: 4px solid #173e37;
    background: #ffffff;
    padding: 2.5mm 3.5mm;
    margin: 2.5mm 0 3mm;
    break-inside: avoid;
    page-break-inside: avoid;
    border-radius: 2px;
  }

  .answer-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1mm;
  }

  .answer-qid {
    font-weight: 800;
    color: #765d42;
    font-size: 9pt;
  }

  .answer-key {
    font-size: 10.5pt;
    font-weight: 700;
    color: #173e37;
    margin-bottom: 1mm;
  }

  .answer-alternatives {
    font-size: 8.5pt;
    color: #5c564e;
    margin-bottom: 1mm;
  }

  .answer-reason {
    font-size: 9pt;
    color: #2d2926;
    line-height: 1.45;
    margin-top: 1mm;
  }

  .answer-misconception {
    font-size: 8.5pt;
    color: #8b342a;
    background: #fdf5f4;
    border-left: 2px solid #8b342a;
    padding: 1mm 2mm;
    margin-top: 1.5mm;
    line-height: 1.4;
  }

  /* Utility Break Classes */
  .page-break {
    break-before: page;
    page-break-before: always;
  }

  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`
