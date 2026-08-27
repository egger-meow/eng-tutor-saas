import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runExtractionPipeline } from '../../scripts/history-exams/src/extractor';
import { ExtractedExamSchema } from '../../scripts/history-exams/src/schemas';

describe('Historical CAP English Exam Extractor (Multimodal Hardened)', () => {
  const rawDir = path.resolve(__dirname, '../../history_exams/raw');
  const outputDir = path.resolve(__dirname, '../../history_exams/extracted');
  const assetsDir = path.resolve(__dirname, '../../history_exams/assets');

  it(
    'extracts all 5 raw exam PDFs with multimodal page rendering and official answers',
    async () => {
      const results = await runExtractionPipeline({
        rawDir,
        outputDir,
        assetsDir,
        renderImages: true,
      });

      expect(results.length).toBe(5);

      for (const res of results) {
        expect(res.questionCount).toBe(43);
        expect(res.passageCount).toBe(8);
        expect(res.renderedImagesCount).toBeGreaterThan(0);
        expect(res.validation.valid).toBe(true);

        const json = JSON.parse(fs.readFileSync(res.outputPath, 'utf-8'));
        const parsed = ExtractedExamSchema.parse(json);
        expect(parsed.questions.length).toBe(43);

        // Verify all 43 questions have official answers
        for (const q of parsed.questions) {
          expect(['A', 'B', 'C', 'D']).toContain(q.answer);
        }
      }
    },
    30000
  );

  it('correctly tags visual picture question Q1 as visual_only with page asset', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const q1 = content.questions.find((q: any) => q.questionNumber === 1);

    expect(q1.evidenceMode).toBe('visual_only');
    expect(q1.visualEvidenceRequired).toBe(true);
    expect(q1.requiredAssets.length).toBeGreaterThan(0);
    expect(q1.answer).toBe('B');
  });

  it('extracts Fruit Tea recipe infographic for 115 Q20-21 without blank placeholder', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const pFruit = content.passages.find((p: any) => p.id === '115-p20-21');

    expect(pFruit.genre).toBe('infographic_chart_table');
    expect(pFruit.evidenceMode).toBe('text_visual');
    expect(pFruit.visualEvidenceRequired).toBe(true);
    expect(pFruit.text).not.toBe('[Visual/Graphic/Infographic Context in Source PDF]');
    expect(pFruit.title).toBe('The Best Fruit Tea You Can Make at Home');
  });

  it('correctly classifies Hawkins comic strip for 115 Q22-23 and cleans control chars', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const pComic = content.passages.find((p: any) => p.id === '115-p22-23');

    expect(pComic.genre).toBe('comic_strip');
    expect(pComic.evidenceMode).toBe('text_visual');
    expect(pComic.visualEvidenceRequired).toBe(true);
    expect(pComic.text).not.toContain('\u0014');
    expect(pComic.text).not.toContain('\u0015');
  });

  it('tags Marigolds Home Q26 as spatial evidence mode', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const q26 = content.questions.find((q: any) => q.questionNumber === 26);

    expect(q26.evidenceMode).toBe('spatial');
    expect(q26.visualEvidenceRequired).toBe(true);
    expect(q26.answer).toBe('C');
  });

  it('does not insert false-positive blanks on Sea Glass process step numbers', () => {
    const content = JSON.parse(fs.readFileSync(path.join(outputDir, '115.json'), 'utf-8'));
    const pSea = content.passages.find((p: any) => p.id === '115-p32-34');

    expect(pSea.text).not.toContain('1 _____ into the sea');
    expect(pSea.text).not.toContain('2 _____ garbage');
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
    expect(allQuestions.filter((item: any) => item.visualEvidenceRequired)).toHaveLength(40);
    for (const item of allQuestions) {
      expect(item.stem).not.toMatch(/\[Option [A-D]\]|\(Comprehension question \d+\)/);
      for (const option of Object.values(item.options)) {
        expect(String(option)).not.toMatch(/^\[Option [A-D]\]$/);
      }
    }
  });
});
