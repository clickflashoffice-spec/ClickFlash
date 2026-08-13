async function main() {
  const { generatePayloadKey } =
    await import("./apps/installer/scripts/generate-payload-key.mjs");

  const result = generatePayloadKey();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Key generation failed";
    process.stderr.write(`${JSON.stringify({ error: message })}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main };
