const { execSync } = require('child_process');

exports.default = async function(configuration) {
  // configuration contains path to the executable to sign
  const { path } = configuration;

  console.log(`[EV-SIGN] Signing ${path}`);
  
  if (!process.env.EV_SIGNING_CERT_PATH || !process.env.EV_SIGNING_PASSWORD) {
    console.warn(`[EV-SIGN] Skipping signing: EV_SIGNING_CERT_PATH or EV_SIGNING_PASSWORD not provided.`);
    return;
  }

  try {
    // Example using signtool.exe
    // Note: Actual EV signing might require hardware token or specific cloud signing service (e.g. Azure Trusted Signing or AWS CloudHSM)
    const signtool = 'signtool';
    const command = `"${signtool}" sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /f "${process.env.EV_SIGNING_CERT_PATH}" /p "${process.env.EV_SIGNING_PASSWORD}" "${path}"`;
    
    execSync(command, { stdio: 'inherit' });
    console.log(`[EV-SIGN] Successfully signed ${path}`);
  } catch (error) {
    console.error(`[EV-SIGN] Failed to sign ${path}`, error);
    process.exit(1);
  }
};
