const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark'
  });
  const page = await context.newPage();

  const outDir = __dirname;
  
  console.log('Navigating to Management Hub...');
  await page.goto('http://localhost:5175');
  
  // Wait for React to load
  await page.waitForTimeout(3000);

  // Take screenshot of Login if it appears
  const loginText = await page.getByText(/Sign In/i).isVisible();
  if (loginText) {
    console.log('Taking Login screenshot...');
    await page.screenshot({ path: path.join(outDir, '01_management_login.png') });
    // Attempt Login
    await page.getByPlaceholder('Admin PIN').fill('1234');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForTimeout(2000);
  }

  // Dashboard View
  console.log('Taking Dashboard screenshot...');
  await page.goto('http://localhost:5175/#/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '02_management_dashboard.png') });

  // Live Ops (Fleet) View
  console.log('Taking Live Ops screenshot...');
  await page.goto('http://localhost:5175/#/fleet');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '03_management_fleet.png') });

  // Ingestion Studio
  console.log('Taking Ingestion Studio screenshot...');
  await page.goto('http://localhost:5175/#/ingestion-studio');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '04_management_ingestion.png') });

  // Galleries
  console.log('Taking Galleries screenshot...');
  await page.goto('http://localhost:5175/#/galleries');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '05_management_galleries.png') });
  
  // WhatsApp Swarm
  console.log('Taking WhatsApp Swarm screenshot...');
  await page.goto('http://localhost:5175/#/whatsapp-swarm');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '06_management_whatsapp.png') });

  console.log('Done!');
  await browser.close();
})();
