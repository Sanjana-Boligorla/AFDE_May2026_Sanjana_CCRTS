/**
 * Automated screenshots for CCRTS Phase 2
 * Captures all major pages including new Phase 2 analytics & ETL pages.
 * Run: node scripts/take-screenshots.js
 * Requires: frontend on http://localhost:5173, backend on http://localhost:8000
 */
const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const BASE_URL  = 'http://localhost:5173';
const OUT_DIR   = path.resolve(__dirname, '../screenshots');
const EMAIL     = 'admin@complainttracker.com';
const PASSWORD  = 'Password@123';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function shot(page, filename, description) {
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`  ✅  ${description} → screenshots/${filename}`);
}

(async () => {
  console.log('\n📸  CCRTS Screenshot Tool\n');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    // 1. Login page
    console.log('1. Login page');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await shot(page, '01-login.png', 'Login page');

    // 2. Log in
    console.log('2. Logging in as admin...');
    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);
    console.log('   ✓ Logged in');

    // 3. Dashboard
    console.log('3. Dashboard');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    await shot(page, '02-dashboard.png', 'Dashboard');

    // 4. Complaints list
    console.log('4. Complaints list');
    await page.goto(`${BASE_URL}/complaints`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    await shot(page, '03-complaints-list.png', 'Complaints List');

    // 5. Complaint detail
    console.log('5. Complaint detail');
    try {
      await page.waitForSelector('a[href*="/complaints/"], tr[data-id], tbody tr', { timeout: 5000 });
      const link = await page.$('a[href*="/complaints/"]');
      if (link) {
        await link.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        await sleep(1500);
        await shot(page, '04-complaint-detail.png', 'Complaint Detail');
      }
    } catch { console.log('   ⚠️  Skipping complaint detail'); }

    // 6. Users management
    console.log('6. Users');
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    await shot(page, '05-users.png', 'User Management');

    // 7. Categories
    console.log('7. Categories');
    await page.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    await shot(page, '06-categories.png', 'Categories');

    // ── Phase 2 pages ────────────────────────────────────────────

    // 8. Reports — Monthly Trends tab
    console.log('8. Reports — Monthly Trends');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);
    await shot(page, '07-reports-monthly.png', 'Reports — Monthly Trends');

    // 9. Reports — SLA tab
    console.log('9. Reports — SLA Report');
    try {
      const tabs = await page.$$('button');
      for (const tab of tabs) {
        const text = await tab.evaluate(el => el.textContent.trim());
        if (text === 'SLA Report') { await tab.click(); break; }
      }
      await sleep(1500);
      await shot(page, '08-reports-sla.png', 'Reports — SLA Report');
    } catch { console.log('   ⚠️  SLA tab skip'); }

    // 10. Reports — Categories tab
    console.log('10. Reports — Categories');
    try {
      const tabs = await page.$$('button');
      for (const tab of tabs) {
        const text = await tab.evaluate(el => el.textContent.trim());
        if (text === 'Categories') { await tab.click(); break; }
      }
      await sleep(1500);
      await shot(page, '09-reports-categories.png', 'Reports — Categories');
    } catch { console.log('   ⚠️  Categories tab skip'); }

    // 11. Reports — Agent Performance tab
    console.log('11. Reports — Agent Performance');
    try {
      const tabs = await page.$$('button');
      for (const tab of tabs) {
        const text = await tab.evaluate(el => el.textContent.trim());
        if (text === 'Agent Performance') { await tab.click(); break; }
      }
      await sleep(1500);
      await shot(page, '10-reports-agents.png', 'Reports — Agent Performance');
    } catch { console.log('   ⚠️  Agents tab skip'); }

    // 12. ETL Pipeline
    console.log('12. ETL Pipeline');
    await page.goto(`${BASE_URL}/etl`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    await shot(page, '11-etl-pipeline.png', 'ETL Pipeline');

    // 13. Profile
    console.log('13. Profile');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(1500);
    await shot(page, '12-profile.png', 'Profile');

  } catch (err) {
    console.error('\n❌  Error:', err.message);
    await page.screenshot({ path: path.join(OUT_DIR, '_error.png') });
  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(OUT_DIR).filter(f => /^\d+-.+\.png$/.test(f));
  console.log(`\n✅  Done — ${files.length} screenshots saved to screenshots/\n`);
})();
