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
});