const fs = require("node:fs/promises");
const path = require("node:path");

const projectDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.resolve(projectDirectory, "release-electron");
const expectedPrefix = `${projectDirectory}${path.sep}`;

async function clean() {
  if (!outputDirectory.startsWith(expectedPrefix) || path.basename(outputDirectory) !== "release-electron") {
    throw new Error(`Refusing to clean unexpected path: ${outputDirectory}`);
  }
  await fs.rm(outputDirectory, { recursive: true, force: true });
  process.stdout.write(`Cleaned generated Electron output: ${outputDirectory}\n`);
}

clean().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
