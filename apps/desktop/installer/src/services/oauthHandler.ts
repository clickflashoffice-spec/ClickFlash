/**
 * ClickFlash Installer — OAuth 2.0 PKCE Handler
 * Cloudflare account linking with secure PKCE flow
 */

import crypto from "crypto";
import http from "http";
import { shell } from "electron";

const CLOUDFLARE_OAUTH_AUTHORIZE = "https://dash.cloudflare.com/oauth2/auth";
const CLOUDFLARE_OAUTH_TOKEN = "https://api.cloudflare.com/oauth2/token";
const CLIENT_ID = "clickflash-installer"; // Registered with Cloudflare

export interface OAuthTokenResult {
  access_token: string;
  refresh_token: string;
  account_id: string;
  expires_in: number;
  token_type: string;
}

function generateCodeVerifier(): string {
  // PKCE: 43-128 chars of [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const bytes = crypto.randomBytes(32);
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function startCallbackServer(
  port: number,
  state: string,
  codeVerifier: string
): Promise<OAuthTokenResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      // Always respond with a friendly close page
      const sendClosePage = (message: string, success: boolean) => {
        const color = success ? "#22c55e" : "#ef4444";
        const html = `
          <!DOCTYPE html>
          <html>
            <head><title>ClickFlash OAuth</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:40px;">
              <h1 style="color:${color}">${success ? "Account Linked" : "Link Failed"}</h1>
              <p>${message}</p>
              <script>setTimeout(()=>window.close(),3000)</script>
            </body>
          </html>`;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      };

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          sendClosePage(errorDescription || error, false);
          server.close();
          reject(new Error(`OAuth error: ${error} — ${errorDescription || ""}`));
          return;
        }

        if (!code) {
          sendClosePage("Authorization code missing from callback.", false);
          server.close();
          reject(new Error("Authorization code missing from callback."));
          return;
        }

        if (returnedState !== state) {
          sendClosePage("State mismatch — possible CSRF attack.", false);
          server.close();
          reject(new Error("State mismatch — possible CSRF attack."));
          return;
        }

        try {
          const tokenResult = await exchangeCodeForToken(code, codeVerifier);
          sendClosePage("Cloudflare account linked successfully. You may close this window.", true);
          server.close();
          resolve(tokenResult);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          sendClosePage(`Token exchange failed: ${msg}`, false);
          server.close();
          reject(err);
        }
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    server.listen(port, "127.0.0.1", () => {
      // Server is ready; browser should be opened by caller
    });

    server.on("error", (err) => {
      reject(err);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("OAuth callback timed out after 5 minutes."));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResult> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", CLIENT_ID);
  params.append("code", code);
  params.append("code_verifier", codeVerifier);
  params.append("redirect_uri", "http://localhost:0/callback"); // Port resolved at runtime

  const res = await fetch(CLOUDFLARE_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  // Fetch account info to get account_id
  const accountRes = await fetch("https://api.cloudflare.com/client/v4/accounts", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  let account_id = "";
  if (accountRes.ok) {
    const accountData = (await accountRes.json()) as {
      success: boolean;
      result?: Array<{ id: string; name: string }>;
    };
    if (accountData.success && accountData.result && accountData.result.length > 0) {
      account_id = accountData.result[0].id;
    }
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id,
    expires_in: data.expires_in,
    token_type: data.token_type || "Bearer",
  };
}

/**
 * Find an available ephemeral port on localhost.
 */
function findEphemeralPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

/**
 * Initiate OAuth 2.0 PKCE flow for Cloudflare account linking.
 * Opens the system browser and starts a local callback server.
 */
export async function initiateOAuthFlow(): Promise<OAuthTokenResult> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  const port = await findEphemeralPort();

  const authUrl = new URL(CLOUDFLARE_OAUTH_AUTHORIZE);
  authUrl.searchParams.append("client_id", CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", `http://localhost:${port}/callback`);
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append(
    "scope",
    "account:read zone:read dns_records:read workers_scripts:write workers_kv:write d1:write r2:write"
  );

  // Open browser
  await shell.openExternal(authUrl.toString());

  // Start local server to receive callback
  return startCallbackServer(port, state, codeVerifier);
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  token_type: string;
}> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", CLIENT_ID);
  params.append("refresh_token", refreshToken);

  const res = await fetch(CLOUDFLARE_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_type: data.token_type || "Bearer",
  };
}
