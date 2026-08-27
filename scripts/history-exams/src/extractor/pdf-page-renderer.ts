import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export interface PageRenderResult {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
}

export interface ExamRenderSummary {
  examId: string;
  renderedPages: PageRenderResult[];
}

let playwrightChromium: any = null;

async function getChromium() {
  if (!playwrightChromium) {
    try {
      const pw = await import('playwright');
      playwrightChromium = pw.chromium || pw.default?.chromium;
    } catch {
      const req = createRequire(path.resolve(process.cwd(), 'packages/pdf/src/index.ts'));
      const pw = await import(req.resolve('playwright'));
      playwrightChromium = pw.chromium || pw.default?.chromium;
    }
  }
  return playwrightChromium;
}

export async function renderExamPagesToImages(
  pdfPath: string,
  examId: string,
  outputDir: string,
  options?: { scale?: number; pages?: number[] }
): Promise<ExamRenderSummary> {
  const scale = options?.scale ?? 2.0;
  const examAssetDir = path.join(outputDir, examId);
  if (!fs.existsSync(examAssetDir)) {
    fs.mkdirSync(examAssetDir, { recursive: true });
  }

  const req = createRequire(path.resolve(process.cwd(), 'packages/pdf/src/index.ts'));
  const pdfJsPath = req.resolve('pdfjs-dist/build/pdf.min.mjs');
  const workerPath = req.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfJsCode = fs.readFileSync(pdfJsPath);
  const workerCode = fs.readFileSync(workerPath);

  const chromium = await getChromium();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Pure in-memory route interception (zero network, zero file:// scheme issues)
  await page.route('http://pdf-renderer/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/pdf.mjs')) {
      route.fulfill({ status: 200, contentType: 'application/javascript', body: pdfJsCode });
    } else if (url.endsWith('/worker.mjs')) {
      route.fulfill({ status: 200, contentType: 'application/javascript', body: workerCode });
    } else if (url.endsWith('/exam.pdf')) {
      route.fulfill({ status: 200, contentType: 'application/pdf', body: pdfBuffer });
    } else {
      route.fulfill({ status: 404 });
    }
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body, html { margin: 0; padding: 0; background: white; }
    #canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import * as pdfjsLib from 'http://pdf-renderer/pdf.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'http://pdf-renderer/worker.mjs';
    
    let docPromise = null;
    async function getDoc() {
      if (!docPromise) {
        const response = await fetch('http://pdf-renderer/exam.pdf');
        const data = new Uint8Array(await response.arrayBuffer());
        docPromise = pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
      }
      return docPromise;
    }

    window.__loadDoc = async function() {
      const doc = await getDoc();
      return doc.numPages;
    };

    window.__renderPage = async function(pageNum, renderScale) {
      const doc = await getDoc();
      const pdfPage = await doc.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: renderScale });
      const canvas = document.getElementById('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      return { width: viewport.width, height: viewport.height };
    };

    window.__ready = true;
  </script>
</body>
</html>`;

  await page.goto('http://pdf-renderer/index.html', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.setContent(html);
  await page.waitForFunction(() => (window as any).__ready === true, null, { timeout: 15000 });

  const totalPages: number = await page.evaluate(() => (window as any).__loadDoc());
  const targetPages = options?.pages ?? Array.from({ length: totalPages }, (_, i) => i + 1);
  const renderedPages: PageRenderResult[] = [];

  for (const pageNum of targetPages) {
    if (pageNum < 1 || pageNum > totalPages) continue;

    const outPath = path.join(examAssetDir, `page-${pageNum}.png`);

    if (fs.existsSync(outPath)) {
      renderedPages.push({
        pageNumber: pageNum,
        imagePath: outPath,
        width: Math.round(595 * scale),
        height: Math.round(842 * scale),
      });
      continue;
    }

    const meta = await page.evaluate(
      (args: { pageNum: number; scale: number }) => (window as any).__renderPage(args.pageNum, args.scale),
      { pageNum, scale }
    );

    const canvas = page.locator('#canvas');
    const imageBuffer = await canvas.screenshot();
    fs.writeFileSync(outPath, imageBuffer);

    renderedPages.push({
      pageNumber: pageNum,
      imagePath: outPath,
      width: meta.width,
      height: meta.height,
    });
  }

  await browser.close();

  return {
    examId,
    renderedPages,
  };
}
