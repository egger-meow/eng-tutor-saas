import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export async function renderPdfFirstPageToPng(pdfPath: string, outputPath: string): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 2000 } })
    const pdfData = await readFile(pdfPath)
    const base64Pdf = pdfData.toString('base64')

    const pdfjsPath = require.resolve('pdfjs-dist/build/pdf.min.mjs')
    const pdfjsWorkerPath = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
    const [pdfjsCode, pdfjsWorkerCode] = await Promise.all([
      readFile(pdfjsPath, 'utf8'),
      readFile(pdfjsWorkerPath, 'utf8'),
    ])

    await page.route('https://local-pdfjs/pdf.min.mjs', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: pdfjsCode })
    )
    await page.route('https://local-pdfjs/pdf.worker.min.mjs', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: pdfjsWorkerCode })
    )

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; display: flex; justify-content: flex-start; align-items: flex-start; }
          canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="pdf-canvas"></canvas>
        <script type="module">
          import * as pdfjsLib from 'https://local-pdfjs/pdf.min.mjs';
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://local-pdfjs/pdf.worker.min.mjs';

          const base64Data = "${base64Pdf}";
          const rawData = atob(base64Data);
          const uint8Array = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; i++) {
            uint8Array[i] = rawData.charCodeAt(i);
          }

          async function render() {
            const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            // 2x scale for crystal-clear retina rendering
            const scale = 2.0;
            const viewport = page.getViewport({ scale });
            const canvas = document.getElementById('pdf-canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            window.__PDF_RENDERED__ = true;
          }

          render().catch(err => {
            console.error(err);
            window.__PDF_ERROR__ = err.message;
          });
        </script>
      </body>
      </html>
    `

    await page.setContent(html, { waitUntil: 'load' })
    await page.waitForFunction(
      () => (window as any).__PDF_RENDERED__ === true || (window as any).__PDF_ERROR__ !== undefined,
      { timeout: 30000 }
    )

    const error = await page.evaluate(() => (window as any).__PDF_ERROR__)
    if (error) {
      throw new Error(`PDF page 1 rendering failed: ${error}`)
    }

    const canvas = page.locator('#pdf-canvas')
    const imageBuffer = await canvas.screenshot({ type: 'png' })
    await writeFile(outputPath, imageBuffer)
  } finally {
    await browser.close()
  }
}

async function main() {
  const root = resolve(import.meta.dirname, '../../..')
  const studentPdf = resolve(root, 'apps/web/public/samples/sample-student.pdf')
  const parentPdf = resolve(root, 'apps/web/public/samples/sample-parent-answer.pdf')
  const studentOut = resolve(root, 'apps/web/public/samples/sample-student-preview.png')
  const parentOut = resolve(root, 'apps/web/public/samples/sample-parent-answer-preview.png')

  console.log('Rendering student PDF page 1 preview to PNG...')
  await renderPdfFirstPageToPng(studentPdf, studentOut)

  console.log('Rendering parent answer PDF page 1 preview to PNG...')
  await renderPdfFirstPageToPng(parentPdf, parentOut)

  console.log('Sample previews generated successfully.')
}

if (process.argv[1]?.endsWith('generate-sample-previews.ts') || process.argv[1]?.endsWith('generate-sample-previews.js')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
