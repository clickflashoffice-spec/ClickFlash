const { chromium } = require("@playwright/test");
const path = require("path");

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Capture console logs
  page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
  page.on("pageerror", (error) =>
    console.error("BROWSER ERROR:", error.message),
  );
  page.on("requestfailed", (request) =>
    console.error(
      "BROWSER REQUEST FAILED:",
      request.url(),
      request.failure().errorText,
    ),
  );

  try {
    console.log("Navigating to http://127.0.0.1:5174/login...");
    const response = await page.goto("http://127.0.0.1:5174/login", {
      waitUntil: "load",
    });
    console.log("Main page status:", response.status());

    console.log("Waiting for potential rendering (10s)...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const rootHTML = await page.evaluate(() =>
      document.getElementById("root")
        ? document.getElementById("root").innerHTML
        : "ROOT NOT FOUND",
    );
    console.log("Root HTML content length:", rootHTML.length);
    if (rootHTML.length > 0) {
      console.log(
        "Root HTML content (first 500 chars):",
        rootHTML.substring(0, 500),
      );
    }

    const isOnline = await page.getByText("SYSTEM ONLINE").isVisible();
    console.log("Is SYSTEM ONLINE visible?", isOnline);
  } catch (error) {
    console.error("Error during inspection:", error.message);
  } finally {
    await browser.close();
  }
}

run();
