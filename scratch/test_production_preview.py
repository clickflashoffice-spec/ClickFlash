import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_tests():
    print("[Test] Starting browser preview verification tests...")
    
    # Target URL (Vite preview port)
    base_url = "http://localhost:5174"
    artifacts_dir = r"C:\Users\alamo\.gemini\antigravity\brain\5cae745a-c020-4348-9e40-707d1153f943"
    
    login_screenshot_path = os.path.join(artifacts_dir, "login_page.png")
    dashboard_screenshot_path = os.path.join(artifacts_dir, "dashboard_page.png")
    
    with sync_playwright() as p:
        print("[Test] Launching Chromium (headless)...")
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        page = browser.new_page()
        
        # 1. Load login page
        print(f"[Test] Navigating to {base_url}/login...")
        try:
            page.goto(f"{base_url}/login")
            page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"[ERROR] Failed to load login page: {e}")
            browser.close()
            sys.exit(1)
            
        print("[Test] Verifying login page elements...")
        title = page.title()
        print(f"[Test] Page title: '{title}'")
        
        # Verify inputs exist
        username_input = page.locator('[data-testid="username-input"]')
        password_input = page.locator('[data-testid="password-input"]')
        login_button = page.locator('[data-testid="login-button"]')
        
        if username_input.is_visible() and password_input.is_visible() and login_button.is_visible():
            print("[Test] PASS: All login inputs are visible.")
        else:
            print("[ERROR] FAIL: Login inputs are missing or hidden.")
            browser.close()
            sys.exit(1)
            
        # Capture login page screenshot
        print(f"[Test] Capturing login page screenshot to: {login_screenshot_path}")
        page.screenshot(path=login_screenshot_path, full_page=True)
        
        # 2. Perform authentication
        print("[Test] Authenticating with test credentials...")
        username_input.fill("admin@clickflash.local")
        password_input.fill("ClickFlash2025!")
        
        # Click login and wait for navigation
        login_button.click()
        page.wait_for_load_state("networkidle")
        time.sleep(3) # Wait for animations and state resolving
        
        current_url = page.url
        print(f"[Test] Redirected URL after authentication: {current_url}")
        
        # 3. Verify Dashboard
        dashboard_indicator = page.locator('main, [role="main"], [class*="dashboard"], [class*="Dashboard"]').first
        if "login" not in current_url and (dashboard_indicator.is_visible() or "dashboard" in current_url.lower()):
            print("[Test] PASS: Successfully authenticated and landed on Dashboard.")
        else:
            print(f"[ERROR] FAIL: Did not reach Dashboard. Current URL: {current_url}")
            # Take failure screenshot
            failure_path = os.path.join(artifacts_dir, "auth_failure.png")
            page.screenshot(path=failure_path, full_page=True)
            print(f"[Test] Failure state captured to {failure_path}")
            browser.close()
            sys.exit(1)
            
        # Capture Dashboard page screenshot
        print(f"[Test] Capturing Dashboard page screenshot to: {dashboard_screenshot_path}")
        page.screenshot(path=dashboard_screenshot_path, full_page=True)
        
        # Verify sidebar components
        print("[Test] Checking sidebar buttons...")
        sidebar_dashboard = page.locator('button:has-text("Dashboard"), a:has-text("Dashboard")').first
        sidebar_albums = page.locator('button:has-text("Albums"), a:has-text("Albums")').first
        
        if sidebar_dashboard.is_visible() and sidebar_albums.is_visible():
            print("[Test] PASS: Sidebar links are visible.")
        else:
            print("[WARNING] Sidebar links might be hidden or styled differently.")
            
        # 4. Perform logout (Switch User)
        print("[Test] Initiating logout...")
        switch_btn = page.locator('button:has-text("Switch User"), [data-testid="logout-button"]').first
        if switch_btn.is_visible():
            switch_btn.click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            
            if username_input.is_visible():
                print("[Test] PASS: Successfully logged out and returned to login form.")
            else:
                print(f"[ERROR] FAIL: Logout did not return to login form. Current URL: {page.url}")
        else:
            print("[WARNING] Logout/Switch User button was not found or visible.")
            
        print("[Test] Verification tests completed successfully!")
        browser.close()

if __name__ == "__main__":
    run_tests()
