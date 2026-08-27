import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedPageText {
  pageNumber: number;
  lines: string[];
  rawText: string;
}

async function loadPdfJs(): Promise<any> {
  try {
    const req = createRequire(path.resolve(process.cwd(), 'packages/pdf/src/index.ts'));
    const resolved = req.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    const fileUrl = path.isAbsolute(resolved)
      ? `file:///${resolved.replace(/\\/g, '/')}`
      : resolved;
    return await import(fileUrl);
  } catch {
    return await import('pdfjs-dist/legacy/build/pdf.mjs' as string);
  }
}

/**
 * Loads a PDF and extracts text page-by-page, sorting items by coordinate geometry
 * and reconstructing fill-in-the-blank gaps ('_____') from physical coordinate distances.
 */
export async function extractPdfText(pdfPath: string): Promise<ExtractedPageText[]> {
  const pdfjs = await loadPdfJs();
  const getDocument = pdfjs.getDocument || pdfjs.default?.getDocument;
  const buffer = fs.readFileSync(pdfPath);
  const data = Uint8Array.from(buffer);
  const loadingTask = getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: ExtractedPageText[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const items: TextItemWithPos[] = [];
    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.trim().length > 0) {
        items.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
        });
      }
    }

    // Sort by Y descending (top of page to bottom), then X ascending (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 3.5) {
        return yDiff;
      }
      return a.x - b.x;
    });

    // Group items into lines based on Y coordinate tolerance
    const lines: string[] = [];
    let currentLineItems: TextItemWithPos[] = [];
    let currentY: number | null = null;

    for (const item of items) {
      if (currentY === null || Math.abs(currentY - item.y) <= 4.0) {
        currentLineItems.push(item);
        currentY = item.y;
      } else {
        lines.push(buildLineWithBlanks(currentLineItems));
        currentLineItems = [item];
        currentY = item.y;
      }
    }

    if (currentLineItems.length > 0) {
      lines.push(buildLineWithBlanks(currentLineItems));
    }

    pages.push({
      pageNumber: p,
      lines,
      rawText: lines.join('\n'),
    });
  }

  return pages;
}

/**
 * Joins items on the same line, inserting '_____' when physical X distance indicates a blank
 */
function buildLineWithBlanks(items: TextItemWithPos[]): string {
  if (items.length === 0) return '';
  items.sort((a, b) => a.x - b.x);

  const isOptionLine = items.some((it) => /\([A-D]\)/.test(it.str));

  let res = items[0].str;
  for (let i = 0; i < items.length - 1; i++) {
    const it1 = items[i];
    const it2 = items[i + 1];
    const end1 = it1.x + it1.width;
    const start2 = it2.x;
    const gap = start2 - end1;

    // Check if next or current is an option identifier
    const isNextOption = /^\([A-D]\)/.test(it2.str.trim());
    const isCurrentOption = /^\([A-D]\)/.test(it1.str.trim());

    // Only insert blank if this is not an options line and physical gap >= 22 points
    if (!isOptionLine && !isNextOption && !isCurrentOption && gap >= 22.0) {
      res += ' _____ ' + it2.str;
    } else {
      res += ' ' + it2.str;
    }
  }

  return res;
}
