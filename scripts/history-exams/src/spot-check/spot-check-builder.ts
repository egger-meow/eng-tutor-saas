import fs from 'node:fs';
import path from 'node:path';
import { ExtractedExam } from '../schemas/extracted.ts';
import { AnalyzedExam } from '../schemas/analyzed.ts';

export interface SpotCheckOptions {
  extractedDir: string;
  analyzedDir: string;
  outputPath: string;
}

export function generateSpotCheckReport(options: SpotCheckOptions): string {
  const { extractedDir, analyzedDir, outputPath } = options;

  const extractedFiles = fs.readdirSync(extractedDir).filter((f) => f.endsWith('.json')).sort();
  let md = `# Historical CAP English Exam Human Spot-Check Report (111–115)

> **Purpose**: Gold reviewer inspection list targeting high-risk assessment structures:
> - Visual Single Questions (Picture Evidence)
> - Comics & Dialogue Narrative Sequences
> - Maps & Spatial Navigation
> - Infographics, Charts & Process Steps
> - Multi-Document Comparisons
> - Cloze Discourse Fill-Ins
> - Geometry Blank Reconstruction Integrity

---

`;

  for (const file of extractedFiles) {
    const examId = path.basename(file, '.json');
    const extContent: ExtractedExam = JSON.parse(
      fs.readFileSync(path.join(extractedDir, file), 'utf-8')
    );
    const analyzedFile = path.join(analyzedDir, file);
    let anaContent: AnalyzedExam | null = null;
    if (fs.existsSync(analyzedFile)) {
      anaContent = JSON.parse(fs.readFileSync(analyzedFile, 'utf-8'));
    }

    md += `## Exam CAP ${examId} (Total: 43 Questions)\n\n`;

    // Select ~8-10 high-risk spot check candidates:
    // 1. Q1 (Visual single item)
    // 2. Q2 or Q3 (Geometry blank single item)
    // 3. First passage set (often infographic/notice)
    // 4. Comic / Map / Special passage
    // 5. Deep reading passage (e.g. Q30-35)
    // 6. Multi-doc / Dual reading (if present)
    // 7. Cloze passage set
    const candidates = new Set<number>();
    candidates.add(1);
    candidates.add(2);

    for (const p of extContent.passages) {
      if (p.genre === 'comic_strip' || p.genre === 'brochure_flyer' || p.genre === 'infographic_chart_table' || p.genre === 'multi_document_comparison') {
        p.questionNumbers.forEach((n) => candidates.add(n));
      }
    }

    // Add cloze items
    const clozePassage = extContent.passages.find((p) => p.genre === 'cloze_passage');
    if (clozePassage) {
      clozePassage.questionNumbers.forEach((n) => candidates.add(n));
    }

    const sortedQNums = Array.from(candidates).sort((a, b) => a - b).slice(0, 12);

    for (const qNum of sortedQNums) {
      const q = extContent.questions.find((item) => item.questionNumber === qNum);
      if (!q) continue;

      const anaQ = anaContent?.questions.find((item) => item.questionNumber === qNum);
      const passage = q.passageId ? extContent.passages.find((p) => p.id === q.passageId) : null;

      md += `### Q${q.questionNumber} [Section: ${q.section} | EvidenceMode: \`${q.evidenceMode}\` | Official Answer: \`${q.answer || 'N/A'}\`]\n\n`;
      md += `- **Page**: ${q.page}\n`;
      md += `- **Visual Evidence Required**: ${q.visualEvidenceRequired ? '✅ Yes' : '❌ No'}\n`;
      if (q.requiredAssets.length > 0) {
        md += `- **Required Assets**: ${q.requiredAssets.map((a) => `\`${a.imagePath}\` (${a.role})`).join(', ')}\n`;
      }
      if (passage) {
        md += `- **Passage Set**: \`${passage.id}\` (Genre: \`${passage.genre}\`)\n`;
        md += `  > *Passage Preview*: ${passage.text.slice(0, 160).replace(/\n/g, ' ')}...\n`;
      }
      md += `- **Question Stem**: ${q.stem}\n`;
      md += `- **Options**:\n`;
      md += `  - (A) ${q.options.A}\n`;
      md += `  - (B) ${q.options.B}\n`;
      md += `  - (C) ${q.options.C}\n`;
      md += `  - (D) ${q.options.D}\n`;

      if (anaQ) {
        md += `- **AI Reverse-Engineered Assessment**:\n`;
        md += `  - Primary Skill: \`${anaQ.analysis.primarySkill}\`\n`;
        md += `  - Cognitive Depth: \`${anaQ.analysis.cognitiveDepth}\` | Language: \`${anaQ.analysis.languageDifficulty}\`\n`;
        md += `  - Context Necessity: \`${anaQ.analysis.contextNecessity}\`\n`;
        md += `  - Mechanism: *${anaQ.analysis.questionMechanism}*\n`;
        md += `  - Function: *${anaQ.analysis.whyTheQuestionWorks}*\n`;
      }

      md += `\n---\n\n`;
    }
  }

  fs.writeFileSync(outputPath, md, 'utf-8');
  return outputPath;
}
