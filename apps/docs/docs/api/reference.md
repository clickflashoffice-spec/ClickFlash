---
sidebar_position: 1
title: API Reference
description: Complete REST API reference for the ClickFlash ecosystem — authentication, albums, photos, orders, analytics, and system endpoints.
---

# ClickFlash API Documentation

> Complete REST API reference for the ClickFlash ecosystem

## 📚 Base URL

```
Development: http://localhost:8090/api
Production:  https://api.clickflash.app/api
```

## 🔐 Authentication

All API requests (except login/register) require an Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    }
  }
}
```

## 📁 Albums

### List Albums
```http
GET /albums?page=1&limit=20&status=active
```

### Create Album
```http
POST /albums
Content-Type: application/json

{
  "title": "New Album",
  "description": "Album description",
  "customerEmail": "customer@example.com",
  "eventDate": "2026-02-14"
}
```

### Get Album
```http
GET /albums/:id
```

### Update Album
```http
PUT /albums/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "archived"
}
```

### Delete Album
```http
DELETE /albums/:id
```

## 📸 Photos

### Upload Photos
```http
POST /albums/:id/photos
Content-Type: multipart/form-data

photos[]: <file1>
photos[]: <file2>
```

### List Photos
```http
GET /albums/:id/photos?page=1&limit=50
```

### Get / Update / Delete Photo
```http
GET /photos/:id
PUT /photos/:id
DELETE /photos/:id
```

## 🛒 Orders

### List Orders
```http
GET /orders?page=1&limit=20&status=pending&startDate=2026-01-01&endDate=2026-01-31
```

### Create Order
```http
POST /orders
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "paymentMethod": "stripe"
}
```

### Get / Update / Delete Order
```http
GET /orders/:id
PUT /orders/:id
DELETE /orders/:id
```

## 👥 Clients

```http
GET /clients?page=1&limit=20&search=john&status=vip
GET /clients/:id
POST /clients
PUT /clients/:id
```

## 📦 Products

```http
GET /products?category=prints&active=true
GET /products/:id
POST /products
```

## 📅 Bookings

```http
GET /bookings?startDate=2026-02-01&endDate=2026-02-28
POST /bookings
```

## ☁️ Cloud (MoneyTrash)

```http
GET /cloud/status
GET /cloud/candidates
POST /cloud/candidates/:id/action
POST /cloud/retention
POST /cloud/queue/pause
POST /cloud/queue/resume
POST /cloud/queue/purge
```

## 📊 Analytics

### Get Dashboard Stats
```http
GET /analytics/dashboard?period=7d
```

### Get Revenue Report
```http
GET /analytics/revenue?startDate=2026-01-01&endDate=2026-01-31&groupBy=day
```

## ⚙️ Settings

```http
GET /settings
PUT /settings
GET /network-settings
PUT /network-settings
```

## 🔧 System

### Health Check
```http
GET /health
```

### Backup / Restore
```http
POST /system/backup
POST /system/restore (multipart/form-data)
```

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## 📈 Rate Limiting

- **Authenticated**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

## 🌐 WebSocket

Real-time updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8090/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'orders'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```
