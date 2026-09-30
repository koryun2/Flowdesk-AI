import { chromium } from 'playwright'

const base = process.env.AUDIT_URL ?? 'http://localhost:5173'
const findings = []

function note(area, detail) {
  findings.push({ area, detail })
  console.log(`FINDING ${area}: ${detail}`)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(12000)
let signedIn = false
const consoleErrors = []
const failedRequests = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error)))
page.on('requestfailed', (request) => {
  const url = request.url()
  if (url.startsWith(base)) failedRequests.push(`${request.failure()?.errorText} ${url}`)
})

async function step(label, action) {
  try {
    await action()
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n').slice(0, 3).join(' | ') : String(error)
    note(label, detail.slice(0, 240))
    await page.screenshot({ path: `scripts/audit-${label.replaceAll(' ', '-')}.png`, fullPage: true }).catch(() => {})
  }
}

async function expectVisible(locator, label) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: 15000 })
  } catch {
    note(label, 'expected element was not visible')
  }
}

async function overflow() {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
}

await step('auth', async () => {
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
  await expectVisible(page.getByRole('button', { name: 'Continue with demo workspace' }), 'login')
  await page.getByRole('button', { name: 'Show password' }).click()
  await page.getByRole('button', { name: 'Hide password' }).click()
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.waitForURL('**/register')
  await page.locator('#name').fill('')
  await page.locator('#workspace').fill('')
  await page.locator('#email').fill('')
  await page.locator('#password').fill('')
  await page.getByRole('button', { name: 'Create workspace' }).click()
  const registerErrors = await page.locator('.form-field span').count()
  if (registerErrors < 4) note('register', `expected field errors, saw ${registerErrors}`)
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Continue with demo workspace' }).click()
  await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 })
  await expectVisible(page.getByRole('heading', { name: /Good morning/ }), 'dashboard')
  const buttonBg = await page.locator('.button--primary').first().evaluate((element) => getComputedStyle(element).backgroundColor)
  if (buttonBg === 'rgba(0, 0, 0, 0)' || buttonBg === 'transparent') {
    note('styles', `primary button background is ${buttonBg}`)
  }
  signedIn = true
})

if (!signedIn) {
  console.log(`\nTOTAL ${findings.length}`)
  await browser.close()
  process.exit(1)
}

await step('dashboard', async () => {
  if ((await overflow()) > 4) note('dashboard', `horizontal overflow ${await overflow()}px`)
  await page.getByLabel('Ticket volume timeframe').selectOption('30')
  const volumeCopy = await page.locator('.chart-card--volume .section-heading p').innerText()
  if (!volumeCopy.includes('30')) note('dashboard', `volume caption stayed "${volumeCopy}" after selecting 30 days`)
  await page.getByLabel('Ticket volume timeframe').selectOption('7')
  await page.getByRole('link', { name: 'View ticket queue' }).click()
  await page.waitForURL('**/tickets')
  await expectVisible(page.getByRole('heading', { name: 'Tickets' }), 'tickets')
})

await step('tickets', async () => {
for (const tab of ['New', 'Investigating', 'Waiting', 'Resolved', 'All']) {
  const tabButton = page.getByRole('tab', { name: new RegExp(`^${tab}`) })
  if (await tabButton.count()) await tabButton.click()
}
await page.getByLabel('Search tickets', { exact: true }).fill('export')
await expectVisible(page.getByText('FD-1284'), 'ticket search')
await page.getByLabel('Filter by priority').selectOption('urgent')
await page.getByRole('button', { name: 'Clear filters' }).click()
await page.getByLabel('Sort tickets').selectOption('priority')
await page.getByLabel('Sort tickets').selectOption('newest')
await page.getByLabel('Search tickets', { exact: true }).fill('FD-1284')
await expectVisible(page.getByText('FD-1284'), 'ticket search result')

await page.getByRole('button', { name: 'Export' }).click()
await page.getByRole('button', { name: 'New ticket' }).click()
await expectVisible(page.getByRole('heading', { name: 'Create ticket' }), 'create ticket')
await page.getByRole('button', { name: 'Create ticket' }).click()
if ((await page.locator('#create-ticket-form span').count()) < 2) {
  note('create ticket', 'empty submit did not show field errors')
}
await page.getByLabel('Title').fill('UI')
await page.getByRole('button', { name: 'Cancel' }).click()

await page.getByRole('button', { name: 'New ticket' }).click()
await page.getByLabel('Title').fill('UI audit sample ticket')
await page.getByLabel('Description').fill('Created while checking the ticket form, reply box, and analysis card.')
await page.locator('#ticket-customer').selectOption({ index: 1 })
await page.getByRole('button', { name: 'Create ticket' }).click()
await page.waitForURL(/\/tickets\/[0-9a-f-]{8,}/)
await expectVisible(page.getByRole('heading', { name: 'UI audit sample ticket' }), 'created ticket')
await page.getByRole('button', { name: 'Internal note' }).click()
await page.getByLabel('Internal note').fill('Checked the internal note composer.')
await page.getByRole('button', { name: 'Add note' }).click()
await expectVisible(page.getByText('Checked the internal note composer.'), 'ticket comment')
await page.goto(`${base}/tickets`)
await page.getByLabel('Search tickets', { exact: true }).fill('FD-1284')
await expectVisible(page.getByText('FD-1284'), 'return to seeded ticket')

await page.getByLabel('Select FD-1284').check()
await expectVisible(page.getByLabel('Assign selected'), 'bulk actions')
await expectVisible(page.getByLabel('Set priority'), 'bulk priority')
await expectVisible(page.getByLabel('Change status'), 'bulk status')
await page.getByRole('button', { name: 'Clear', exact: true }).click()
})

await step('ticket detail', async () => {
await page.getByRole('link', { name: /FD-1284/ }).first().click()
await page.waitForURL(/\/tickets\/[0-9a-f-]{8,}/)
await expectVisible(page.getByText('CSV export fails'), 'ticket detail')
await page.getByRole('button', { name: 'Activity' }).click()
await page.getByRole('button', { name: /Conversation/ }).click()
await page.getByRole('button', { name: 'Internal note' }).click()
await page.getByRole('button', { name: 'Reply to customer' }).click()
await page.getByRole('button', { name: 'Add tag' }).click()
await expectVisible(page.getByLabel('Tag name'), 'add tag')
await page.keyboard.press('Escape')

const customerLink = page.locator('.ticket-detail-header').getByRole('link')
if (await customerLink.count()) {
  await customerLink.click()
  await page.waitForURL(/\/customers\/[0-9a-f-]{8,}/)
  await expectVisible(page.getByRole('heading', { level: 1 }), 'customer detail')
  const edit = page.getByRole('button', { name: 'Edit', exact: true })
  if (await edit.count()) {
    await edit.click()
    await page.keyboard.press('Escape')
  }
}
})

await step('customers', async () => {
await page.locator('nav[aria-label="Primary navigation"]').getByRole('link', { name: 'Customers' }).click()
await page.waitForURL('**/customers')
await expectVisible(page.getByRole('heading', { name: 'Customers' }), 'customers')
await page.getByLabel(/Search customers/i).fill('Lumon')
await page.getByLabel(/Search customers/i).fill('')
await page.getByRole('button', { name: 'Add customer' }).click()
await expectVisible(page.getByRole('heading', { name: /Add customer|New customer/i }), 'add customer')
await page.getByRole('button', { name: 'Cancel' }).click()
})

await step('knowledge', async () => {
await page.getByRole('link', { name: 'Knowledge' }).click()
await page.waitForURL('**/knowledge')
await expectVisible(page.getByRole('heading', { name: 'Knowledge base' }), 'knowledge')
const ask = page.getByLabel(/Ask|question/i)
if (await ask.count()) {
  await ask.fill('How should customers export datasets over 50,000 rows?')
  await page.getByRole('button', { name: /Ask|Search knowledge/i }).click()
  await expectVisible(page.getByText(/24 hours|background export/i), 'knowledge answer')
}
await page.getByRole('button', { name: 'Add source' }).click()
await expectVisible(page.getByRole('heading', { name: 'Add knowledge source' }), 'add source')
await page.getByRole('button', { name: 'Import URL' }).click()
await page.getByRole('button', { name: 'Paste text' }).click()
await page.getByRole('button', { name: 'Upload file' }).click()
await page.getByRole('button', { name: 'Cancel' }).click()
})

await step('agent', async () => {
await page.getByRole('link', { name: 'AI Agent' }).click()
await page.waitForURL('**/agent')
await expectVisible(page.getByRole('heading', { name: 'AI Agent' }), 'agent')
await page.getByRole('button', { name: /Find unresolved export bugs/ }).click()
await expectVisible(page.getByText(/FD-1284/), 'agent search')
await page.getByRole('button', { name: 'New conversation' }).click()
await page.getByLabel('Message Flowdesk Agent').fill('Close FD-9999')
await page.getByRole('button', { name: 'Send message' }).click()
await expectVisible(page.getByText(/not in this workspace|Name one ticket/i), 'agent unknown ticket')
})

await step('settings', async () => {
await page.getByRole('link', { name: 'Settings' }).click()
await page.waitForURL('**/settings')
for (const tab of ['Workspace', 'AI configuration', 'Integrations', 'Security', 'My profile']) {
  await page.getByRole('button', { name: tab }).click()
  await expectVisible(page.getByRole('heading', { level: 2 }), `settings ${tab}`)
}
await page.getByRole('button', { name: 'Save changes' }).click()
await expectVisible(page.getByText('Profile settings saved'), 'settings toast')
})

await step('shell', async () => {
await page.getByLabel('Notifications').click()
await page.getByRole('button', { name: 'Mark all read' }).click()
await page.getByRole('link', { name: 'View all notifications' }).click()
await page.waitForURL('**/notifications')
await page.getByRole('button', { name: 'Mark all as read' }).click()
await page.locator('.notification-page-list').getByRole('button', { name: /Urgent ticket assigned/ }).click()

await page.getByRole('button', { name: /Workspace/ }).first().click()
await page.locator('.collapse-button').click()
await page.locator('.collapse-button').click()

await page.getByLabel('Search tickets and customers').fill('FD-1284')
await page.getByLabel('Search tickets and customers').press('Enter')
await page.waitForURL('**/tickets?q=FD-1284')
await expectVisible(page.getByText('FD-1284'), 'global search')

await page.goto(`${base}/missing-page`)
await expectVisible(page.getByRole('heading', { name: /isn’t in this workspace/ }), '404')
await page.getByRole('link', { name: 'Return to dashboard' }).click()
await page.waitForURL(base + '/')

await page.setViewportSize({ width: 390, height: 844 })
await page.getByLabel('Open navigation').click()
await expectVisible(page.getByRole('link', { name: 'Tickets' }), 'mobile nav')
const mobileOverflow = await overflow()
if (mobileOverflow > 8) note('mobile', `horizontal overflow ${mobileOverflow}px`)
await page.getByLabel('Close navigation').click()

await page.getByRole('button', { name: /Koryun|profile/i }).click().catch(async () => {
  await page.locator('.profile-button').click()
})
await page.getByRole('button', { name: 'Sign out' }).click()
await page.waitForURL('**/login')
})

const uniqueConsole = [...new Set(consoleErrors)]
for (const error of uniqueConsole) note('console', error.slice(0, 300))
for (const error of failedRequests) note('network', error.slice(0, 300))

console.log(`\nTOTAL ${findings.length}`)
await browser.close()
process.exit(findings.length ? 1 : 0)
