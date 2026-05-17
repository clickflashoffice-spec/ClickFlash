import { useEffect, useRef } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { pb } from '../services/pb';

const SYNC_DEBOUNCE_MS = 5000; // Sync after 5s of inactivity
const SESSION_KEY = 'clickflash_cart_session';

/**
 * Syncs the customer's cart to D1 for abandoned cart recovery.
 * Only activates when the customer has provided an email.
 * Debounces writes to avoid hammering the API on every quantity change.
 */
export function useCartSync(email: string | undefined, albumId?: string, currency: string = 'eur'): void {
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
        const sessionId = getOrCreateSession();
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const baseUrl = pb.baseUrlValue;

        await fetch(`${baseUrl}/api/cart/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            albumId: albumId || null,
            items: items.map((i) => ({
              photoId: i.photoId,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              format: i.format,
            })),
            total,
            currency,
            sessionId,
          }),
        });

        lastSyncRef.current = fingerprint;
      } catch {
        // Silent fail — cart recovery is best-effort, never blocks UX
      }
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, email, albumId, currency]);
}

/**
 * Mark the current session's cart as recovered after successful checkout.
 */
export async function markCartRecovered(): Promise<void> {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return;

  try {
    const baseUrl = pb.baseUrlValue;
    await fetch(`${baseUrl}/api/cart/recovered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
  } catch {
    // Best-effort — don't block checkout success flow
  }
}

function getOrCreateSession(): string {
  let session = localStorage.getItem(SESSION_KEY);
  if (!session) {
    session = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, session);
  }
  return session;
}

export default useCartSync;
