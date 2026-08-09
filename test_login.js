const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Log all console messages
  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`));
  
  // Log failed network requests
  page.on('requestfailed', request =>
    console.log(`BROWSER NETWORK ERROR: ${request.url()} - ${request.failure().errorText}`)
  );
  
  // Log responses
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`API RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  
  console.log('Taking pre-login screenshot...');
  await page.screenshot({ path: 'pre-login.png' });

  console.log('Filling out the login form...');
  try {
    await page.fill('input[type="email"]', 'clickflash.office@gmail.com');
    await page.fill('input[type="password"]', 'STRONG_PASSWORD_PLACEHOLDER');
    await page.click('button[type="submit"]');
  } catch (e) {
    console.log('Form elements not found, trying different selectors...', e.message);
    // Maybe they don't have type="email"
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('clickflash.office@gmail.com');
      await inputs[1].fill('STRONG_PASSWORD_PLACEHOLDER');
      await page.click('button');
    }
  }

  console.log('Waiting 3 seconds for network activity after submit...');
  await page.waitForTimeout(3000);
  
  console.log('Taking post-login screenshot...');
  await page.screenshot({ path: 'post-login.png' });
  
  // Get text of any error messages on screen
  const bodyText = await page.innerText('body');
  console.log('PAGE TEXT (Snippet):', bodyText.substring(0, 300));
  
  const permStatus = await page.evaluate(async () => {
    const res = await fetch('/api/permissions');
    return { status: res.status, ok: res.ok };
  });
  console.log('PERMISSIONS API STATUS:', permStatus);
  
  await browser.close();
})();
