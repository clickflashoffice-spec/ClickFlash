import { useEffect, useRef } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { config } from '../utils/env';

const SYNC_DEBOUNCE_MS = 5000; // Sync after 5s of inactivity
const SESSION_KEY = 'clickflash_cart_session';

/**
 * Syncs the customer's cart to D1 for abandoned cart recovery.
 * Only activates when the customer has provided an email.
 * Debounces writes to avoid hammering the API on every quantity change.
 */
export function useCartSync(email: string | undefined): void {
  const items = useCartStore((s) => s.items);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<string>('');

  useEffect(() => {
    // Don't sync if no email or empty cart
    if (!email || items.length === 0) return;

    // Compute a fingerprint to avoid re-syncing identical state
    const fingerprint = JSON.stringify(items.map((i) => ({ id: i.photoId, q: i.quantity })));
    if (fingerprint === lastSyncRef.current) return;

    // Debounce: wait for customer to stop changing cart
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const sessionId = getOrCreateCartSessionId();
        const token = localStorage.getItem('gallery_token');
        if (!token) return;
        const baseUrl = config.apiUrl;

        const response = await fetch(`${baseUrl}/api/cart/snapshot`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              photoId: i.photoId,
              quantity: i.quantity,
            })),
            sessionId,
          }),
        });

        if (response.ok) lastSyncRef.current = fingerprint;
      } catch {
        // Silent fail — cart recovery is best-effort, never blocks UX
      }
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, email]);
}

/**
 * Mark the current session's cart as recovered after successful checkout.
 */
export async function markCartRecovered(): Promise<void> {
  const sessionId = localStorage.getItem(SESSION_KEY);
  const token = localStorage.getItem('gallery_token');
  if (!sessionId || !token) return;

  try {
    const baseUrl = config.apiUrl;
    await fetch(`${baseUrl}/api/cart/recovered`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Best-effort — don't block checkout success flow
  }
}

export function getOrCreateCartSessionId(): string {
  let session = localStorage.getItem(SESSION_KEY);
  if (!session || !/^[0-9a-f-]{36}$/i.test(session)) {
    session = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, session);
  }
  return session;
}

export default useCartSync;
