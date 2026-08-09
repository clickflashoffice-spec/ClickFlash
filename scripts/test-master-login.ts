import { chromium } from 'playwright';

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  try {
    console.log("Navigating to localhost:8090...");
    await page.goto('http://localhost:8090/', { timeout: 15000, waitUntil: 'networkidle' });
    console.log("Taking screenshot of login page...");
    await page.screenshot({ path: 'scripts/screenshots/master-login-page.png' });
    
    // Fill in credentials if the form exists
    console.log("Looking for login form...");
    
    // Try to find email input
    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="Email"]');
    if (await emailInput.count() > 0) {
      await emailInput.first().fill('clickflash.office@gmail.com');
      console.log("Filled email.");
      
      const pwdInput = page.locator('input[type="password"], input[name="password"]');
      if (await pwdInput.count() > 0) {
        await pwdInput.first().fill('STRONG_PASSWORD_PLACEHOLDER');
        console.log("Filled password.");
      }
      
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        console.log("Clicked submit button.");
        
        // Wait a bit for response
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'scripts/screenshots/master-post-login.png' });
        console.log("Took post-login screenshot.");
      }
    } else {
      console.log("No email input found.");
    }
    
    console.log("Test finished successfully.");
  } catch (error) {
    console.error("Test failed:", error);
    await page.screenshot({ path: 'scripts/screenshots/master-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
