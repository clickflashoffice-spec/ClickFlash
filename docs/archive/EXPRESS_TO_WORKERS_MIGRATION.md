# Express.js to Cloudflare Workers Migration Guide

## Overview

This guide covers migrating the Express.js backends (Management Hub, Gallery) to Cloudflare Workers. The main challenges are:

1. **Runtime Differences**: Express.js is Node.js, Workers uses V8 isolates
2. **Database Access**: `better-sqlite3` → D1 API
3. **Middleware**: Express middleware → Workers middleware/handlers
4. **WebSocket**: Limited on Workers, SSE recommended
5. **Node.js APIs**: Not all Node.js APIs available

---

## Technology Comparison

| Aspect      | Express.js (Node.js) | Cloudflare Workers     |
| ----------- | -------------------- | ---------------------- |
| Runtime     | Node.js              | V8 Isolates            |
| Database    | `better-sqlite3`     | Cloudflare D1          |
| File System | `fs` module          | R2 API                 |
| Sessions    | `express-session`    | KV / Durable Objects   |
| WebSocket   | `ws` module          | Durable Objects or SSE |
| HTTP        | Native               | Fetch API              |
| Streaming   | Native               | Limited                |

---

## Migration Strategy

### Option A: Hono.js (Recommended)

[Hono](https://hono.dev/) is a lightweight, ultrafast web framework that works on:

- Cloudflare Workers
- Cloudflare Pages
- Deno
- Bun
- Node.js

**Benefits:**

- Same code runs on multiple platforms
- Built-in middleware for auth, cors, jwt
- TypeScript-first design
- Small bundle size (~14KB)

### Option B: Itty Router

[itty-router](https://github.com/kwhitley/itty-router) is designed specifically for Cloudflare Workers:

- Zero dependencies
- OpenAPI schema support
- Built-in coroutines support

### Option C: Adapt Express to Workers

This is more complex but possible with:

- `express-on-cloudflare` adapter
- Custom middleware rewrite
- Heavy testing required

**Recommendation:** Use Hono.js for new Workers code

---

## Express to Hono Migration Example

### Original Express Code

```typescript
// Express server.ts
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { authenticate } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  // authentication logic
  res.json({ token });
});

app.get("/api/records", authenticate, async (req, res) => {
  const records = await db.query("SELECT * FROM records");
  res.json(records);
});

app.use(errorHandler);

app.listen(8092);
```

### Migrated to Hono

```typescript
// Workers server.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { etag } from "hono/etag";
import { logger } from "hono/logger";

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", etag());

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// Login
app.post("/api/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  // authentication logic
  return c.json({ token });
});

// Protected route
app.get("/api/records", async (c) => {
  const token = c.req.header("Authorization");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const records = await c.env.DB.prepare("SELECT * FROM records").all();

  return c.json(records);
});

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal error" }, 500);
});

export default app;
```

---

## Key Differences

### Database Access

**Express (better-sqlite3):**

```typescript
const db = new Database("data.db");
const results = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
```

**Workers (D1):**

```typescript
const results = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
  .bind(id)
  .first();

// Or for multiple:
const { results } = await env.DB.prepare("SELECT * FROM users").all();
```

### Request Parsing

**Express:**

```typescript
app.post("/api/data", (req, res) => {
  const body = req.body;
  const file = req.file; // using multer
});
```

**Hono:**

```typescript
app.post("/api/data", async (c) => {
  const body = await c.req.json();
  const formData = await c.req.formData();
});
```

### Response Types

**Express:**

```typescript
res.json({ data: "value" });
res.status(201).json({ created: true });
res.download("/path/to/file");
```

**Hono:**

```typescript
c.json({ data: "value" });
c.json({ created: true }, 201);
// For file downloads, return Response with appropriate headers
```

---

## Middleware Adaptation

### CORS

**Express:**

```typescript
app.use(
  cors({
    origin: ["https://example.com"],
    credentials: true,
  }),
);
```

**Hono:**

```typescript
import { cors } from "hono/cors";

app.use(
  "*",
  cors({
    origin: ["https://example.com"],
    credentials: true,
  }),
);
```

### Authentication/JWT

**Express:**

```typescript
import jwt from "jsonwebtoken";

app.get("/api/protected", authenticate, handler);

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
```

**Hono:**

```typescript
import { jwt } from "hono/jwt";

app.use("/api/*", async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "No token" }, 401);

  try {
    const payload = await jwt.verify(token, c.env.JWT_SECRET);
    c.set("jwtPayload", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

app.get("/api/protected", (c) => {
  const payload = c.get("jwtPayload");
  return c.json({ user: payload });
});
```

### Rate Limiting

**Express (using express-rate-limit):**

```typescript
import rateLimit from "express-rate-limit";

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);
```

**Hono (using built-in or custom):**

```typescript
import { rateLimit } from "hono/rate-limit";

app.use(
  "*",
  rateLimit({
    limit: 100,
    store: {
      increment: async (key) => {
        /* KV increment */
      },
      get: async (key) => {
        /* KV get */
      },
    },
  }),
);
```

---

## WebSocket Alternatives

Cloudflare Workers don't support WebSocket natively. Options:

### 1. Durable Objects (for WebSocket-like behavior)

```typescript
// durable-object.ts
export class ChatRoom implements DurableObject {
  sessions: Set<WebSocket>;

  async fetch(request: Request): Promise<Response> {
    // Upgrade to WebSocket
    const { 0: client, 1: server } = new WebSocketPair();
    this.sessions.add(client);

    // Handle messages
    client.addEventListener("message", (event) => {
      this.broadcast(event.data);
    });

    return new Response(null, { status: 101, webSocket: server });
  }

  broadcast(message: string) {
    this.sessions.forEach((session) => {
      session.send(message);
    });
  }
}
```

### 2. Server-Sent Events (SSE) - Recommended

**Worker endpoint:**

```typescript
app.get("/api/events", (c) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send events every second
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
      }, 1000);

      // Clean up on close
      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
```

---

## File Structure Adaptation

**Express Structure:**

```
backend/
├── server.ts
├── routes/
│   ├── auth.ts
│   ├── records.ts
│   └── files.ts
├── middleware/
│   ├── auth.ts
│   └── errorHandler.ts
├── services/
│   └── db.ts
└── utils/
    └── logger.ts
```

**Workers Structure:**

```
backend/
├── src/
│   ├── index.ts          # Entry point (worker fetch handler)
│   ├── router.ts         # Hono app
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── records.ts
│   │   └── files.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── services/
│   │   └── db.ts
│   └── utils/
│       └── logger.ts
├── wrangler.toml
└── package.json
```

---

## Deployment Comparison

### Express (PM2)

```bash
# Start server
pm2 start server.js --name api

# Cluster mode
pm2 start server.js -i max

# Logs
pm2 logs api
```

### Cloudflare Workers

```bash
# Deploy
npx wrangler deploy

# Preview
npx wrangler dev

# Logs
npx wrangler tail
```

---

## Testing

### Express Tests

```typescript
import request from "supertest";
import app from "./server";

test("GET /api/health", async () => {
  const res = await request(app).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body.status).toBe("ok");
});
```

### Workers Tests

```typescript
import app from "./src/index";

describe("Health endpoint", () => {
  it("returns ok status", async () => {
    const res = await app.request(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

---

## Migration Checklist

### Pre-Migration

- [ ] Audit all npm dependencies for Workers compatibility
- [ ] Identify Node.js-specific code paths
- [ ] Plan database migration from SQLite to D1
- [ ] Document all environment variables

### During Migration

- [ ] Set up new project structure with Hono.js
- [ ] Migrate database layer to D1 API
- [ ] Adapt middleware (auth, cors, rate limiting)
- [ ] Replace file operations with R2
- [ ] Migrate sessions to KV or Durable Objects
- [ ] Replace WebSocket with SSE or Durable Objects

### Post-Migration

- [ ] Test all API endpoints
- [ ] Verify authentication flow
- [ ] Check file upload/download
- [ ] Test real-time features (SSE)
- [ ] Performance benchmark
- [ ] Update documentation

---

## Known Limitations

1. **No `fs` module** - Use R2 for file storage
2. **No `child_process`** - Cannot spawn processes
3. **No native addons** - `better-sqlite3`, `sharp` won't work
4. **Limited CPU time** - 50ms (free) to 30s (unbound)
5. **Memory limit** - 128MB (free) to 512MB (unbound)
6. **No WebSocket server** - Use Durable Objects or SSE

---

## Recommended Migration Order

1. **MoneyTrash Worker** (already done) - serves as reference
2. **Gallery Backend** - simpler, fewer dependencies
3. **Management Backend** - most complex, do last

---

**Document Version:** 1.0  
**Last Updated:** March 22, 2026
