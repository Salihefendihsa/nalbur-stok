import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import path from 'node:path'
import fs from 'node:fs'

const BASE_URL = 'http://localhost:5173'
const EMAIL = process.env.SCREENSHOT_EMAIL
const PASSWORD = process.env.SCREENSHOT_PASSWORD
const OUT_DIR = path.resolve('sayfa-pdfleri')
const OUT_FILE = path.join(OUT_DIR, 'nalbur-stok-sayfalar.pdf')

const PAGES = [
  { path: '/', name: '01-dashboard' },
  { path: '/urunler', name: '02-urunler' },
  { path: '/kategoriler', name: '03-kategoriler' },
  { path: '/tedarikciler', name: '04-tedarikciler' },
  { path: '/satis', name: '05-satis' },
  { path: '/alis', name: '06-alis' },
  { path: '/hareketler', name: '07-hareketler' },
  { path: '/raporlar', name: '08-raporlar' },
  { path: '/kilavuz', name: '09-kilavuz' },
  { path: '/ayarlar', name: '10-ayarlar' },
]

fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()))
page.on('requestfailed', (req) => console.log('[reqfailed]', req.url(), req.failure()?.errorText))
page.on('response', (res) => {
  if (res.url().includes('supabase') || res.url().includes('auth')) {
    console.log('[response]', res.status(), res.url())
  }
})

await page.goto(`${BASE_URL}/login`)
await page.waitForLoadState('networkidle')
await page.getByPlaceholder('ornek@nalbur.com').click()
await page.getByPlaceholder('ornek@nalbur.com').fill(EMAIL)
await page.getByPlaceholder('••••••••').fill(PASSWORD)
await page.waitForTimeout(300)
await Promise.all([
  page.waitForResponse((r) => r.url().includes('/auth/v1/token'), { timeout: 20000 }),
  page.getByRole('button', { name: 'Giriş Yap' }).click(),
])
// Not: Giriş başarılı olsa da uygulama otomatik yönlendirmiyor (bilinen hata),
// bu yüzden manuel olarak ana sayfaya gidiyoruz.
await page.goto(`${BASE_URL}/`)
await page.waitForLoadState('networkidle')
if (page.url().includes('/login')) {
  await page.screenshot({ path: path.join(OUT_DIR, 'debug-login.png') })
  console.error('Login failed, page url:', page.url())
  console.error('Page text:', await page.locator('body').innerText())
  throw new Error('Login failed')
}

const merged = await PDFDocument.create()

for (const { path: route, name } of PAGES) {
  await page.goto(`${BASE_URL}${route}`)
  await page.waitForLoadState('networkidle')
  await page.emulateMedia({ media: 'screen' })
  const buffer = await page.pdf({
    printBackground: true,
    width: '1440px',
    height: '900px',
  })
  const doc = await PDFDocument.load(buffer)
  const copiedPages = await merged.copyPages(doc, doc.getPageIndices())
  copiedPages.forEach((p) => merged.addPage(p))
  console.log(`added ${name}`)
}

await browser.close()

fs.writeFileSync(OUT_FILE, await merged.save())
console.log(`Done. Combined PDF at ${OUT_FILE}`)
