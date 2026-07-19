const fs = require("node:fs/promises");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const distDirectory = path.join(projectDirectory, "dist");
const stageDirectory = path.join(projectDirectory, "build-electron-stage");

async function prepareStage() {
  const sourcePackage = JSON.parse(await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"));
  await fs.access(path.join(distDirectory, "index.html"));
  await fs.access(path.join(distDirectory, "electron", "electron-main.js"));
  await fs.access(path.join(distDirectory, "electron", "preload.js"));

  await fs.rm(stageDirectory, { recursive: true, force: true });
  await fs.mkdir(stageDirectory, { recursive: true });
  await fs.cp(distDirectory, path.join(stageDirectory, "dist"), { recursive: true });
  await fs.writeFile(path.join(stageDirectory, "package.json"), `${JSON.stringify({
    name: sourcePackage.name,
    productName: "MoneyTrash Uploader",
    description: "Secure ClickFlash desktop uploader for high-volume photography workflows",
    author: "ClickFlash Photography",
    version: sourcePackage.version,
    private: true,
    packageManager: sourcePackage.packageManager,
    main: "dist/electron/electron-main.js",
  }, null, 2)}\n`, "utf8");

  const forbiddenEntries = ["node_modules", "src-tauri", ".env", "Cargo.toml"];
  for (const entry of forbiddenEntries) {
    try {
      await fs.access(path.join(stageDirectory, entry));
      throw new Error(`Forbidden package-stage entry exists: ${entry}`);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  process.stdout.write(`Prepared dependency-free Electron stage: ${stageDirectory}\n`);
}

prepareStage().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
