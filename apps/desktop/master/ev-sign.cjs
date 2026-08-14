const { execSync } = require('child_process');

exports.default = async function(configuration) {
  // configuration contains path to the executable to sign
  const { path } = configuration;

  console.log(`[EV-SIGN] Signing ${path}`);
  
  if (process.env.AZURE_KEY_VAULT_URI) {
    console.log(`[EV-SIGN] Using Azure Key Vault for EV Signing`);
    try {
      // AzureSignTool requires dotnet tool install --global AzureSignTool
      const command = `AzureSignTool sign -kvu "${process.env.AZURE_KEY_VAULT_URI}" -kvi "${process.env.AZURE_CLIENT_ID}" -kvs "${process.env.AZURE_CLIENT_SECRET}" -kvc "${process.env.AZURE_CERT_NAME}" -kvt "${process.env.AZURE_TENANT_ID}" -tr http://timestamp.digicert.com -td sha256 -fd sha256 "${path}"`;
      execSync(command, { stdio: 'inherit' });
      console.log(`[EV-SIGN] Successfully signed ${path} via Azure Key Vault`);
      return;
    } catch (error) {
      console.error(`[EV-SIGN] Failed to sign ${path} via Azure Key Vault`, error);
      process.exit(1);
    }
  } else if (process.env.EV_SIGNING_CERT_PATH && process.env.EV_SIGNING_PASSWORD) {
    console.log(`[EV-SIGN] Using Local PFX for Signing`);
    try {
      const signtool = 'signtool';
      const command = `"${signtool}" sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /f "${process.env.EV_SIGNING_CERT_PATH}" /p "${process.env.EV_SIGNING_PASSWORD}" "${path}"`;
      execSync(command, { stdio: 'inherit' });
      console.log(`[EV-SIGN] Successfully signed ${path} via Local PFX`);
      return;
    } catch (error) {
      console.error(`[EV-SIGN] Failed to sign ${path} via Local PFX`, error);
      process.exit(1);
    }
  } else {
    if ((process.env.NODE_ENV === 'production' || process.env.CI) && !process.env.SKIP_SIGNING) {
      console.error(`[EV-SIGN] FATAL: Skipping signing: No EV signing credentials provided, but required for production builds.`);
      process.exit(1);
    } else {
      console.warn(`[EV-SIGN] Skipping signing: No EV signing credentials provided (AZURE_KEY_VAULT_URI or EV_SIGNING_CERT_PATH).`);
    }
  }
};
