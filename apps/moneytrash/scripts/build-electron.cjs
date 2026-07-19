const path = require("node:path");
const esbuild = require("esbuild");

const projectDirectory = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectDirectory, "dist", "electron");

async function build() {
  await esbuild.build({
    entryPoints: [
      path.join(projectDirectory, "electron-main.ts"),
      path.join(projectDirectory, "preload.ts"),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
    outdir: outputDirectory,
    outExtension: { ".js": ".js" },
    sourcemap: false,
    minify: false,
    legalComments: "none",
    logLevel: "info",
  });
}

build().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
