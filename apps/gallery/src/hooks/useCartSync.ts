import { useEffect } from 'react';
import type { CartItem } from '../types';

export function getOrCreateCartSessionId(): string {
  try {
    let id = localStorage.getItem('clickflash_cart_session_id');
    if (!id) {
      id = `cart_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('clickflash_cart_session_id', id);
    }
    return id;
  } catch {
    return `cart_sess_${Date.now()}`;
  }
}

export function useCartSync(userEmailOrItems?: string | CartItem[]) {
  useEffect(() => {
    try {
      if (Array.isArray(userEmailOrItems)) {
        localStorage.setItem('clickflash_active_cart', JSON.stringify(userEmailOrItems));
      } else if (typeof userEmailOrItems === 'string') {
        localStorage.setItem('clickflash_customer_email', userEmailOrItems);
      }
    } catch {}
  }, [userEmailOrItems]);
}

export function markCartRecovered(cartId?: string) {
  try {
    localStorage.setItem('clickflash_cart_recovered', cartId || 'true');
  } catch {}
}
