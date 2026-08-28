import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runExtractionPipeline } from '../../scripts/history-exams/src/extractor/index.ts';
import { ExtractedExamSchema } from '../../scripts/history-exams/src/schemas/extracted.ts';

const ROOT = path.resolve(__dirname, '../..');
const RAW_DIR = path.join(ROOT, 'history_exams/raw');
const ASSETS_DIR = path.join(ROOT, 'history_exams/assets');
let tmpDir: string;
let outputDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-extractor-test-'));
  outputDir = path.join(tmpDir, 'extracted');
  await runExtractionPipeline({
    rawDir: RAW_DIR,
    outputDir,
    assetsDir: ASSETS_DIR,
    renderImages: false,
  });
}, 60_000);

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Historical CAP English Exam Extractor (Multimodal Hardened)', () => {
  it('extracts all 5 raw exam PDFs with multimodal page rendering and official answers', () => {
    for (const examId of ['111', '112', '113', '114', '115']) {
      const file = path.join(outputDir, `${examId}.json`);
      expect(fs.existsSync(file)).toBe(true);
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      expect(() => ExtractedExamSchema.parse(content)).not.toThrow();
      expect(content.questions).toHaveLength(43);
      expect(content.questions.every((q: any) => ['A', 'B', 'C', 'D'].includes(q.answer))).toBe(true);
    }
  });

  it('correctly tags visual picture question Q1 as visual_only with page asset', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const q1 = content.questions.find((q: any) => q.questionNumber === 1);
    expect(q1.evidenceMode).toBe('visual_only');
    expect(q1.visualEvidenceRequired).toBe(true);
    expect(q1.requiredAssets?.[0]?.imagePath).toContain('115/page-2.png');
  });

  it('extracts Fruit Tea recipe infographic for 115 Q20-21 without blank placeholder', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const passage = content.passages.find((p: any) => p.id === '115-p20-21');
    expect(passage.genre).toBe('infographic_chart_table');
    expect(passage.visualEvidenceRequired).toBe(true);
    expect(passage.text).not.toContain('[Visual/Graphic Content');
  });

  it('correctly classifies Hawkins comic strip for 115 Q22-23 and cleans control chars', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const passage = content.passages.find((p: any) => p.id === '115-p22-23');
    expect(passage.genre).toBe('comic_strip');
    expect(passage.visualEvidenceRequired).toBe(true);
    expect(passage.text).not.toMatch(/[\u0000-\u001F\u007F-\u009F]/);
  });

  it('tags Marigolds Home Q26 as spatial evidence mode', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const q26 = content.questions.find((q: any) => q.questionNumber === 26);
    expect(q26.evidenceMode).toBe('spatial');
    expect(q26.visualEvidenceRequired).toBe(true);
  });

  it('does not insert false-positive blanks on Sea Glass process step numbers', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const passage = content.passages.find((p: any) => p.id === '115-p32-34');
    expect(passage.text).not.toContain('(Cloze blank 32)');
    expect(passage.genre).toBe('infographic_chart_table');
  });

  it('parses dual-document Icelandic opinion articles with sub-documents and split glossary', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const pIce = content.passages.find((p: any) => p.id === '115-p35-39');

    expect(pIce.genre).toBe('multi_document_comparison');
    expect(pIce.evidenceMode).toBe('multi_document');
    expect(pIce.subDocuments?.length).toBe(2);
    expect(pIce.subDocuments?.[0].title).toBe('The Future of Icelandic');
    expect(pIce.subDocuments?.[1].title).toBe('Our Future with Icelandic');
    expect(pIce.glossary?.['Icelander']).toBe('冰島人');
    expect(pIce.glossary?.['product']).toBe('商品');
  });

  it('preserves verified official-source visual and malformed-text fidelity overrides', () => {
    const y111 = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(outputDir, '111.json'), 'utf-8')));
    const y112 = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(outputDir, '112.json'), 'utf-8')));
    const y113 = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(outputDir, '113.json'), 'utf-8')));
    const y114 = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(outputDir, '114.json'), 'utf-8')));
    const y115 = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8')));

    const q = (exam: any, n: number) => exam.questions.find((item: any) => item.questionNumber === n);
    const passage = (exam: any, id: string) => exam.passages.find((item: any) => item.id === id);

    expect(q(y111, 21).stem).toBe('What does Tea-Rock celebrate?');
    expect(q(y111, 21).options.C).toBe('Their 20th year of business.');
    expect(q(y111, 32).visualEvidenceRequired).toBe(true);
    expect(q(y111, 39).evidenceMode).toBe('spatial');
    expect(q(y111, 41).visualEvidenceRequired).toBe(true);
    expect(passage(y111, '111-p23-24').text).toContain('rice milk');

    for (const n of [24, 25, 26, 27, 28, 29]) {
      expect(q(y112, n).visualEvidenceRequired).toBe(true);
    }
    expect(passage(y112, '112-p24-25').text).toContain("Four Seasons' Kitchen");
    expect(passage(y112, '112-p26-27').text).toContain("Birds don't care");
    expect(passage(y112, '112-p28-29').text).toContain('4.6');

    expect(q(y113, 26).stem).toBe('What is recommended to people who want to visit the festival?');
    expect(q(y113, 28).options.B).toBe("They don’t like to share.");
    expect(q(y113, 41).visualEvidenceRequired).toBe(true);
    expect(q(y113, 42).visualEvidenceRequired).toBe(true);

    expect(q(y114, 23).options.C).toContain("Ivy is still telling them about her baby");
    expect(q(y114, 27).stem).toBe('What do we learn from the first paragraph?');
    for (const n of [29, 30, 31]) {
      expect(q(y114, n).visualEvidenceRequired).toBe(true);
    }
    expect(q(y114, 36).visualEvidenceRequired).toBe(true);

    expect(q(y115, 26).answer).toBe('C');
    expect(q(y115, 26).evidenceMode).toBe('spatial');
    expect(q(y115, 30).evidenceMode).toBe('text_only');
    expect(q(y115, 30).visualEvidenceRequired).toBe(false);

    const allQuestions = [y111, y112, y113, y114, y115].flatMap((exam: any) => exam.questions);
    console.log('FRESH_VISUAL_REQUIRED', allQuestions.filter((item: any) => item.visualEvidenceRequired).map((item: any) => `${item.examId}-Q${item.questionNumber}`).join(','));
    expect(allQuestions.filter((item: any) => item.visualEvidenceRequired)).toHaveLength(40);
    for (const item of allQuestions) {
      expect(item.stem).not.toMatch(/\[Option [A-D]\]|\(Comprehension question \d+\)/);
      for (const option of Object.values(item.options)) {
        expect(String(option)).not.toMatch(/^\[Option [A-D]\]$/);
      }
    }
  });
});
