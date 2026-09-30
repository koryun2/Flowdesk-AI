import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
await page.goto('http://localhost:5173/login')
await page.fill('#email', 'koryun@flowdesk.ai')
await page.fill('#password', 'flowdesk')
await page.locator('button[type="submit"]').click()
await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })
await page.goto('http://localhost:5173/tickets/88b8396a-6fcc-4380-81fd-10ef84dba140')
const paragraph = page.locator('p', { hasText: 'ghfghfgh' })
await paragraph.waitFor({ timeout: 10000 })
const info = await paragraph.evaluate((node) => {
  const style = getComputedStyle(node)
  const text = node.textContent ?? ''
  return {
    whiteSpace: style.whiteSpace,
    lineBreaks: (text.match(/\n/g) ?? []).length,
  }
})
console.log(JSON.stringify({ url: page.url(), ...info, errors }))
await browser.close()
