import { describe, it, expect } from 'vitest';
import { redactSensitiveFields, redactFormat, noopLogger, createLogger } from '../index';

// =============================================================================
// redactSensitiveFields (pure function)
// =============================================================================

describe('redactSensitiveFields', () => {
  it('replaces top-level sensitive fields with [REDACTED]', () => {
    const input = {
      username: 'alice',
      password: 'hunter2',
      token: 'jwt-xxx',
      apiKey: 'ak_live_123',
      safe: 'visible',
    };

    const result = redactSensitiveFields(input) as Record<string, unknown>;

    expect(result.username).toBe('alice');
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.safe).toBe('visible');
  });

  it('handles case-insensitive field names', () => {
    const input = {
      PASSWORD: 'secret',
      Token: 'abc',
      ApiKey: 'key',
      Authorization: 'Bearer xxx',
      CreditCard: '4111-1111-1111-1111',
      SSN: '123-45-6789',
      Cookie: 'session=abc',
    };

    const result = redactSensitiveFields(input) as Record<string, unknown>;

    expect(result.PASSWORD).toBe('[REDACTED]');
    expect(result.Token).toBe('[REDACTED]');
    expect(result.ApiKey).toBe('[REDACTED]');
    expect(result.Authorization).toBe('[REDACTED]');
    expect(result.CreditCard).toBe('[REDACTED]');
    expect(result.SSN).toBe('[REDACTED]');
    expect(result.Cookie).toBe('[REDACTED]');
  });

  it('recursively redacts nested objects', () => {
    const input = {
      user: {
        name: 'Bob',
        credentials: {
          password: 'p@ss',
          token: 'tok-123',
        },
      },
      metadata: {
        safe: true,
        secret: 'shh',
      },
    };

    const result = redactSensitiveFields(input) as Record<string, unknown>;
    const user = result.user as Record<string, unknown>;
    const credentials = user.credentials as Record<string, unknown>;
    const metadata = result.metadata as Record<string, unknown>;

    expect(user.name).toBe('Bob');
    expect(credentials.password).toBe('[REDACTED]');
    expect(credentials.token).toBe('[REDACTED]');
    expect(metadata.safe).toBe(true);
    expect(metadata.secret).toBe('[REDACTED]');
  });

  it('handles arrays with nested objects', () => {
    const input = [
      { username: 'a', password: '123' },
      { username: 'b', token: 'tok' },
    ];

    const result = redactSensitiveFields(input) as Record<string, unknown>[];

    expect(result[0].username).toBe('a');
    expect(result[0].password).toBe('[REDACTED]');
    expect(result[1].username).toBe('b');
    expect(result[1].token).toBe('[REDACTED]');
  });

  it('returns primitives and null/undefined unchanged', () => {
    expect(redactSensitiveFields(null)).toBeNull();
    expect(redactSensitiveFields(undefined)).toBeUndefined();
    expect(redactSensitiveFields(42)).toBe(42);
    expect(redactSensitiveFields('hello')).toBe('hello');
  });

  it('does not mutate the original object', () => {
    const input = { password: 'secret', name: 'test' };
    const result = redactSensitiveFields(input);

    expect(input.password).toBe('secret');
    expect((result as Record<string, unknown>).password).toBe('[REDACTED]');
  });
});

// =============================================================================
// redactFormat (Winston format)
// =============================================================================

describe('redactFormat', () => {
  it('creates a winston format function', () => {
    const format = redactFormat();
    expect(format).toBeDefined();
    expect(typeof format.transform).toBe('function');
  });

  it('redacts sensitive fields in Winston info object', () => {
    const format = redactFormat();
    const info = {
      level: 'info',
      message: 'test',
      password: 'secret123',
      token: 'jwt-token',
      safeField: 'visible',
      [Symbol.for('level')]: 'info',
    };

    const result = format.transform(info) as Record<string, unknown>;

    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.safeField).toBe('visible');
    // Winston internals should be preserved
    expect(result.level).toBe('info');
    expect(result.message).toBe('test');
  });
});

// =============================================================================
// child() method
// =============================================================================

describe('child()', () => {
  it('creates a child logger that includes parent default metadata', () => {
    const parentLogger = createLogger({
      serviceName: 'child-test',
      enableConsole: false,
      enableFile: false,
    });

    // child() should return an ILogger with the child method
    const childLogger = parentLogger.child({ requestId: 'req-123', userId: 'user_1' });

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.debug).toBe('function');
    expect(typeof childLogger.info).toBe('function');
    expect(typeof childLogger.warn).toBe('function');
    expect(typeof childLogger.error).toBe('function');
    expect(typeof childLogger.child).toBe('function');

    // Should not throw when logging
    expect(() => childLogger.info('test with child meta')).not.toThrow();
  });

  it('child of a child stacks metadata', () => {
    const parentLogger = createLogger({
      serviceName: 'nested-child-test',
      enableConsole: false,
      enableFile: false,
    });

    const childLogger = parentLogger.child({ requestId: 'req-001' });
    const grandChildLogger = childLogger.child({ operation: 'checkout' });

    // Both should be valid ILogger instances
    expect(typeof grandChildLogger.info).toBe('function');
    expect(typeof grandChildLogger.child).toBe('function');
  });
});

// =============================================================================
// noopLogger
// =============================================================================

describe('noopLogger', () => {
  it('does not throw on any method call', () => {
    expect(() => noopLogger.debug('test')).not.toThrow();
    expect(() => noopLogger.info('test', { key: 'value' })).not.toThrow();
    expect(() => noopLogger.warn('warning')).not.toThrow();
    expect(() => noopLogger.error('error', new Error('fail'))).not.toThrow();
    expect(() => noopLogger.error('error', { code: 500 })).not.toThrow();
  });

  it('has a child() method that returns a valid ILogger', () => {
    const child = noopLogger.child({ requestId: 'noop-child' });

    expect(typeof child.debug).toBe('function');
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.child).toBe('function');

    // child of noop should also not throw
    expect(() => child.info('test')).not.toThrow();
  });

  it('child of noopLogger returns noopLogger itself', () => {
    const child = noopLogger.child({ x: 1 });
    expect(child).toBe(noopLogger);
  });
});
