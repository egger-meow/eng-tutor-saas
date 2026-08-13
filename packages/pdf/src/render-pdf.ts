import { chromium, type Browser } from 'playwright'

async function renderWithBrowser(browser: Browser, html: string): Promise<Uint8Array> {
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.emulateMedia({ media: 'print' })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    await page.close()
  }
}

export async function renderPdfBatch(htmlDocuments: readonly string[]): Promise<Uint8Array[]> {
  const browser = await chromium.launch({ headless: true })
  try {
    const rendered: Uint8Array[] = []
    for (const html of htmlDocuments) rendered.push(await renderWithBrowser(browser, html))
    return rendered
  } finally {
    await browser.close()
  }
}

export async function renderPdf(html: string): Promise<Uint8Array> {
  const [pdf] = await renderPdfBatch([html])
  if (!pdf) throw new Error('PDF renderer returned no artifact')
  return pdf
}
