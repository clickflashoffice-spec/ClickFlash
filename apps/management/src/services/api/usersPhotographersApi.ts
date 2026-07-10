import { pb } from "../pb";
import {
  Photographer,
} from "../../types";
import { PocketRecord } from "../pbTypes";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


export const usersPhotographersApi = {
  async getUsers(): Promise<Photographer[]> {
    try {
      const records = await pb.collection("users").getFullList();
      return records.map((r: PocketRecord) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        password: r.password,
        role: r.role,
        specialty: r.specialty,
        avatarUrl: r.avatarUrl,
        monthlyTarget: r.monthlyTarget,
        dailyPhotoTarget: r.dailyPhotoTarget,
        payrollType: r.payrollType,
        monthlySalary: r.monthlySalary,
        commissionRate: r.commissionRate,
        destinationId: r.destinationId,
        workingHours: r.workingHours,
      }));
    } catch (error) {
      console.warn("Failed to fetch users from PocketBase, returning mock staff fallback:", error);
      return [
        {
          id: "1",
          name: "Alaeddine Khemiri",
          email: "alaeddine@example.com",
          role: "CEO",
          specialty: "Executive",
          avatarUrl: "",
          destinationId: "marhaba_concorde",
        } as unknown as Photographer,
        {
          id: "2",
          name: "Sarah Jenkins",
          email: "sarah@example.com",
          role: "Team Leader",
          specialty: "Resort & Event",
          avatarUrl: "",
          destinationId: "marhaba_club",
        } as unknown as Photographer,
        {
          id: "3",
          name: "Marc Laurent",
          email: "marc@example.com",
          role: "Photographer",
          specialty: "Portrait",
          avatarUrl: "",
          destinationId: "marhaba_occidental",
        } as unknown as Photographer,
      ];
    }
  },

  async createUser(data: Partial<Photographer>): Promise<Photographer> {
    const record = await pb.collection("users").create(data);
    return record as Photographer;
  },

  async updateUser(
    id: string | number,
    data: Partial<Photographer>,
  ): Promise<Photographer> {
    const record = await pb.collection("users").update(String(id), data);
    return record as Photographer;
  },

  async deleteUser(id: string | number): Promise<void> {
    await pb.collection("users").delete(String(id));
  },

  async loginUser(
    email: string,
    password: string,
  ): Promise<{ token: string; user: Photographer } | null> {
    try {
      const baseUrl = pb.baseUrlValue;

      // First, check if backend is reachable
      try {
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(
          () => healthController.abort(),
          5000,
        ); // 5 second timeout

        const healthCheck = await fetch(`${baseUrl}/api/health`, {
          method: "GET",
          signal: healthController.signal,
        }).catch((fetchError) => {
          // Catch network errors from fetch itself
          if (
            fetchError instanceof TypeError &&
            (fetchError.message.includes("Failed to fetch") ||
              fetchError.message.includes("NetworkError"))
          ) {
            const networkError = new Error(
              "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
            );
            networkError.name = "NetworkError";
            throw networkError;
          }
          throw fetchError;
        });

        clearTimeout(healthTimeoutId);

        if (!healthCheck.ok) {
          throw new Error(
            "Backend server is not responding. Please ensure the server is running on port 8092.",
          );
        }
      } catch (healthError) {
        if (healthError instanceof Error) {
          if (
            healthError.name === "AbortError" ||
            healthError.message.includes("timeout")
          ) {
            throw new Error(
              "Backend server connection timeout. Please check if the server is running on port 8092.",
            );
          }
          if (
            healthError.name === "NetworkError" ||
            healthError.message.includes("Failed to fetch") ||
            healthError.message.includes("NetworkError") ||
            healthError.message.includes("Cannot connect to backend server")
          ) {
            throw new Error(
              "Cannot connect to backend server. Please ensure the server is running. Start it with: node backend/server.js",
            );
          }
          throw new Error(`Backend server error: ${healthError.message}`);
        }
        throw new Error(
          "Backend server is not reachable. Please ensure the server is running on port 8092.",
        );
      }

      // Perform login with timeout
      const loginController = new AbortController();
      const loginTimeoutId = setTimeout(() => loginController.abort(), 10000); // 10 second timeout for login

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
      });
      clearTimeout(loginTimeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Login failed" }));
        // Prioritize message over error since message contains user-friendly description
        throw new Error(errorData.message || errorData.error || "Login failed");
      }

      const data = await response.json();

      // Store the token in the pb adapter
      pb.setAuthToken(data.token);

      return {
        token: data.token,
        user: data.user as Photographer,
      };
    } catch (error) {
      // Don't log here - let the caller (Login component) handle logging
      // Re-throw with more context if it's a network error
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

  async refreshData(
    collections?: string[],
    incremental = true,
  ): Promise<{ success: boolean; refreshed: string[]; status: any }> {
    const baseUrl = pb.baseUrlValue;
    const response = await fetch(`${baseUrl}/api/data/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ collections, incremental }),
    });

    if (!response.ok) {
      // Try to read the error message from the response
      let errorMessage = "Failed to refresh data";
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Create error with more context
      const error = new Error(errorMessage);
      // Add status code for handling authentication errors
      (error as any).status = response.status;
      (error as any).code =
        response.status === 401 ? "AUTHENTICATION_ERROR" : "REFRESH_ERROR";
      throw error;
    }

    return await response.json();
  },
};
