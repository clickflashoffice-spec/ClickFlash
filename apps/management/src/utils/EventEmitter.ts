/**
 * A lightweight, browser-compatible EventEmitter implementation.
 * Replaces Node.js 'events' module for browser-based apps.
 */
export type EventListener = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners: Record<string, EventListener[]> = {};

  on(event: string, listener: EventListener): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: EventListener): this {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach((listener) => listener(...args));
    return true;
  }

  once(event: string, listener: EventListener): this {
    const onceListener: EventListener = (...args: unknown[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    return this.on(event, onceListener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.listeners[event] ? this.listeners[event].length : 0;
  }
}
