/**
 * ClickFlash Installer — Cloudflare API Client Hook
 */

import { useState, useCallback } from "react";
import type { CloudflareAccount } from "@/types/installer";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface UseCloudflareApiReturn {
  accounts: CloudflareAccount[];
  isLoading: boolean;
  error: string | null;
  validateToken: (token: string) => Promise<boolean>;
  fetchAccounts: (token: string) => Promise<void>;
  provisionServices: (token: string, accountId: string) => Promise<boolean>;
}

export function useCloudflareApi(): UseCloudflareApiReturn {
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token validation failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async (token: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CF_API_BASE}/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        success?: boolean;
        result?: Array<{ id: string; name: string }>;
      };
      if (data.success && data.result) {
        setAccounts(data.result.map((a) => ({ id: a.id, name: a.name })));
      } else {
        setError("Failed to fetch accounts");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account fetch failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const provisionServices = useCallback(async (token: string, accountId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // D1 Database creation
      const d1Res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: `clickflash-${accountId.slice(0, 8)}` }),
      });

      // R2 Bucket creation
      const r2Res = await fetch(`${CF_API_BASE}/accounts/${accountId}/r2/buckets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: `clickflash-storage-${accountId.slice(0, 8)}` }),
      });

      // KV Namespace creation
      const kvRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/storage/kv/namespaces`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: `clickflash-kv-${accountId.slice(0, 8)}` }),
      });

      return d1Res.ok && r2Res.ok && kvRes.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    accounts,
    isLoading,
    error,
    validateToken,
    fetchAccounts,
    provisionServices,
  };
}
