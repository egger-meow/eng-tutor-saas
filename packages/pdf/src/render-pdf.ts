import { chromium } from 'playwright'

export async function renderPdf(html: string): Promise<Uint8Array> {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.emulateMedia({ media: 'print' })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    await browser.close()
  }
}
