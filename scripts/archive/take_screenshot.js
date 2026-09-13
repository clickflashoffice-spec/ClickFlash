const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to Hub...');
  await page.goto('http://127.0.0.1:5175');
  
  console.log('Logging in...');
  await page.getByRole('button', { name: /Instant CEO & Fleet Command Preview/i }).click();
  
  console.log('Waiting for Dashboard...');
  await page.waitForSelector('text=Management Command Hub');

  console.log('Navigating to Ingestion Studio...');
  await page.goto('http://127.0.0.1:5175/ingestion-studio');
  
  console.log('Waiting for UI to load...');
  await page.waitForSelector('text=Ingest Sessions');
  
  // Wait a small bit extra for animations/layouts to settle
  await page.waitForTimeout(1000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'C:\\Users\\alamo\\.gemini\\antigravity\\brain\\b6d5b251-db38-48e0-8da1-c50f99a551ef\\08_ingestion_studio_v2.png' });
  
  await browser.close();
  console.log('Screenshot saved!');
})().catch(console.error);
