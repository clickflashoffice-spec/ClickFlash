/**
 * A lightweight, browser-compatible EventEmitter implementation.
 * Replaces Node.js 'events' module for browser-based apps.
 */
export class EventEmitter {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach((listener) => listener(...args));
    return true;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const onceListener = (...args: any[]) => {
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
