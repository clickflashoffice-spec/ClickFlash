/**
 * ClickFlash - Test Utilities
 * 
 * Shared utilities for all test suites
 */

export class TestData {
  static users = {
    admin: {
      email: 'admin@test.com',
      password: 'TestPassword123!',
      name: 'Admin User'
    },
    photographer: {
      email: 'photographer@test.com',
      password: 'TestPassword123!',
      name: 'Photo User'
    },
    customer: {
      email: 'customer@test.com',
      password: 'TestPassword123!',
      name: 'Customer User'
    }
  };

  static albums = [
    {
      id: 'album-1',
      name: 'Wedding Sample',
      description: 'A beautiful wedding album',
      photos: 50,
      status: 'published'
    },
    {
      id: 'album-2',
      name: 'Portrait Session',
      description: 'Professional headshots',
      photos: 25,
      status: 'draft'
    }
  ];

  static orders = [
    {
      id: 'order-1',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [
        { productId: 'photo-1', quantity: 2, price: 10.00 }
      ],
      total: 20.00,
      status: 'completed'
    }
  ];

  static products = [
    { id: 'photo-1', name: '4x6 Print', price: 2.99, category: 'prints' },
    { id: 'photo-2', name: '5x7 Print', price: 4.99, category: 'prints' },
    { id: 'photo-3', name: '8x10 Print', price: 9.99, category: 'prints' },
    { id: 'photo-4', name: 'Digital Download', price: 5.99, category: 'digital' },
    { id: 'photo-5', name: 'Canvas Print', price: 49.99, category: 'canvas' }
  ];
}

export class APIClient {
  baseUrl: string;
  token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get(path: string, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { ...this.getHeaders(), ...options?.headers },
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  async post(path: string, body: any, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.getHeaders(), ...options?.headers },
      body: JSON.stringify(body),
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  async put(path: string, body: any, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.getHeaders(), ...options?.headers },
      body: JSON.stringify(body),
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  async patch(path: string, body: any, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { ...this.getHeaders(), ...options?.headers },
      body: JSON.stringify(body),
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  async delete(path: string, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { ...this.getHeaders(), ...options?.headers },
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  async options(path: string, options?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'OPTIONS',
      headers: { ...this.getHeaders(), ...options?.headers },
      ...options
    });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.json().catch(() => null)
    };
  }

  getTestToken() {
    return 'test-token-for-ci';
  }

  getExpiredToken() {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj8T6a8cS8i4';
  }

  getAdminToken() {
    return 'admin-token-for-testing';
  }
}

export class MoneyTrashAPI extends APIClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }
}

export class GalleryAPI extends APIClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }
}

export class ManagementAPI extends APIClient {
  constructor(baseUrl: string) {
    super(baseUrl);
  }
}

export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateTestEmail(): string {
  return `test-${Date.now()}@example.com`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        resolve(result);
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          reject(error);
          return;
        }
        await wait(delay * attempt);
      }
    }
  });
}
