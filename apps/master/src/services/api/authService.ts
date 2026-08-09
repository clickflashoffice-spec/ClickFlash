/**
 * Authentication Service
 *
 * Handles user authentication and login operations
 */

import { pb } from "../pb";
import { Photographer } from "../../types";
import { logger } from "../../utils/logger";
import { DEFAULT_MASTER_PORT } from "../../constants";

export const authService = {
  /**
   * Login user with email and password
   *
   * Performs health check before login and handles token refresh setup.
   * Token is stored in httpOnly cookie, not returned in response.
   */
  /**
   * Synchronize CSRF token with backend
   * This establishes a session and sets the XSRF-TOKEN cookie
   */
  async syncCsrf(): Promise<string | null> {
    let baseUrl = pb.baseUrlValue;
    // Only force absolute URL if NOT in browser context and no baseUrl set
    if (!baseUrl || baseUrl === "/") {
      if (typeof window === "undefined") {
        baseUrl = `http://127.0.0.1:${DEFAULT_MASTER_PORT}`;
      } else {
        baseUrl = ""; // Use relative path in browser
      }
    }

    try {
      const healthController = new AbortController();
      const healthTimeoutId = setTimeout(() => healthController.abort(), 5000);

      const healthCheck = await fetch(`${baseUrl}/api/health`, {
        method: "GET",
        signal: healthController.signal,
        credentials: "include",
      }).catch((fetchError) => {
        if (
          fetchError instanceof TypeError &&
          (fetchError.message.includes("Failed to fetch") ||
            fetchError.message.includes("NetworkError"))
        ) {
          throw new Error("Cannot connect to backend server");
        }
        throw fetchError;
      });

      clearTimeout(healthTimeoutId);

      const healthData = await healthCheck.json().catch(() => ({}));
      const serverCsrfToken = healthData.diagnostics?.csrfToken;
      if (serverCsrfToken) {
        pb.setCsrfToken(serverCsrfToken);
        return serverCsrfToken;
      }

      if (!healthCheck.ok) {
        throw new Error(`Health check failed: ${healthCheck.status}`);
      }
      return null;
    } catch (error) {
      logger.warn("[Auth] syncCsrf failed", error);
      return null;
    }
  },

  /**
   * Login user with email and password
   *
   * Performs health check before login and handles token refresh setup.
   * Token is stored in httpOnly cookie, not returned in response.
   */
  async loginUser(
    email: string,
    password: string,
  ): Promise<{ token: string; user: Photographer } | null> {
    try {
      let baseUrl = pb.baseUrlValue;

      // Only force absolute URL if NOT in browser context and no baseUrl set
      if (!baseUrl || baseUrl === "/") {
        if (typeof window === "undefined") {
          baseUrl = `http://127.0.0.1:${DEFAULT_MASTER_PORT}`;
        } else {
          baseUrl = ""; // Use relative path in browser
        }
      }

      // Sync CSRF first
      await this.syncCsrf();

      // Perform login with timeout
      const loginController = new AbortController();
      const loginTimeoutId = setTimeout(() => loginController.abort(), 30000); // 30 second timeout for login

      const loginUrl = `${baseUrl}/api/auth/login`;
      logger.info("[Auth] Attempting login", { url: loginUrl, email });

      // Use the token from pb adapter (which was set from syncCsrf)
      const csrfToken = await (pb as any).getCsrfToken();

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
        credentials: "include", // Include cookies for authentication
      });
      clearTimeout(loginTimeoutId);

      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            // Not JSON, use raw text or generic message based on status
            errorData = {
              error:
                text ||
                (response.status === 429
                  ? "Too many requests"
                  : "Login failed"),
            };
          }
        } catch (e) {
          errorData = { error: "Login failed" };
        }
        throw new Error(errorData.message || errorData.error || "Login failed");
      }

      const data = await response.json();

      return {
        token: "", // Token is in httpOnly cookie
        user: data.user as Photographer,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new Error(
            "Login request timed out. Please check your connection and try again.",
          );
        }
        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Cannot connect to backend server")
        ) {
          throw new Error(
            "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
          );
        }
      }
      throw error;
    }
  },

  /**
   * Logout current user and clear session
   */
  async logoutUser(): Promise<void> {
    return pb.logout();
  },
};
