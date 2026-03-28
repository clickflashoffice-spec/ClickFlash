import fs from "fs";
import path from "path";
import { validateImageMagicNumber } from "../../shared/validateImage";

async function runTests() {
  console.log("=== Testing Magic Number Validation ===");

  const testDir = path.join(__dirname, "testFiles");
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // 1. Create a dummy text file pretending to be a JPG
  const fakeJpg = path.join(testDir, "malicious.jpg");
  fs.writeFileSync(fakeJpg, "const exploit = 'This is not an image at all';");

  // 2. Create a very small file
  const tinyFile = path.join(testDir, "tiny.jpg");
  fs.writeFileSync(tinyFile, "A");

  // 3. Create a real valid JPEG (just the header is enough since we only read 12 bytes)
  const validJpg = path.join(testDir, "valid.jpg");
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  fs.writeFileSync(validJpg, jpegHeader);

  // Run tests
  const fakeResult = await validateImageMagicNumber(fakeJpg);
  console.log(
    `[TEST 1] Fake JPG validation: ${fakeResult === false ? "PASSED" : "FAILED"} (Got ${fakeResult})`,
  );

  const tinyResult = await validateImageMagicNumber(tinyFile);
  console.log(
    `[TEST 2] Tiny File validation: ${tinyResult === false ? "PASSED" : "FAILED"} (Got ${tinyResult})`,
  );

  const validResult = await validateImageMagicNumber(validJpg);
  console.log(
    `[TEST 3] Valid JPG validation: ${validResult === true ? "PASSED" : "FAILED"} (Got ${validResult})`,
  );

  // Cleanup
  fs.unlinkSync(fakeJpg);
  fs.unlinkSync(tinyFile);
  fs.unlinkSync(validJpg);
  fs.rmdirSync(testDir);
}

runTests().catch(console.error);
