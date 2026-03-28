# ClickFlash API Documentation

> Complete REST API reference for the ClickFlash ecosystem

---

## 📚 Base URL

```
Development: http://localhost:8090/api
Production:  https://api.clickflash.app/api
```

---

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

---

## 📁 Albums

### List Albums
```http
GET /albums?page=1&limit=20&status=active
```

**Response:**
```json
{
  "success": true,
  "data": {
    "albums": [
      {
        "id": "uuid",
        "title": "Wedding Photos",
        "description": "John & Jane Wedding",
        "status": "active",
        "photoCount": 150,
        "createdAt": "2026-01-15T10:00:00Z",
        "coverUrl": "/uploads/cover.jpg"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
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

---

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

### Get Photo
```http
GET /photos/:id
```

### Update Photo
```http
PUT /photos/:id
Content-Type: application/json

{
  "name": "New Name",
  "tags": ["wedding", "ceremony"],
  "isFavorite": true
}
```

### Delete Photo
```http
DELETE /photos/:id
```

---

## 🛒 Orders

### List Orders
```http
GET /orders?page=1&limit=20&status=pending&startDate=2026-01-01&endDate=2026-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "customerName": "John Doe",
        "customerEmail": "john@example.com",
        "items": [
          {
            "productId": "uuid",
            "productName": "8x10 Print",
            "quantity": 2,
            "price": 1500
          }
        ],
        "total": 3000,
        "status": "pending",
        "paymentStatus": "paid",
        "createdAt": "2026-01-20T14:30:00Z"
      }
    ]
  }
}
```

### Create Order
```http
POST /orders
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "paymentMethod": "stripe"
}
```

### Get Order
```http
GET /orders/:id
```

### Update Order
```http
PUT /orders/:id
Content-Type: application/json

{
  "status": "completed",
  "paymentStatus": "paid"
}
```

### Delete Order
```http
DELETE /orders/:id
```

---

## 👥 Clients

### List Clients
```http
GET /clients?page=1&limit=20&search=john&status=vip
```

### Get Client
```http
GET /clients/:id
```

### Create Client
```http
POST /clients
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

### Update Client
```http
PUT /clients/:id
Content-Type: application/json

{
  "name": "John Smith",
  "notes": "VIP customer"
}
```

---

## 📦 Products

### List Products
```http
GET /products?category=prints&active=true
```

### Get Product
```http
GET /products/:id
```

### Create Product
```http
POST /products
Content-Type: application/json

{
  "name": "8x10 Print",
  "description": "High quality photo print",
  "category": "prints",
  "price": 1500,
  "cost": 500,
  "sku": "PRINT-8X10"
}
```

---

## 📅 Bookings

### List Bookings
```http
GET /bookings?startDate=2026-02-01&endDate=2026-02-28
```

### Create Booking
```http
POST /bookings
Content-Type: application/json

{
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "eventType": "wedding",
  "date": "2026-06-15",
  "startTime": "10:00",
  "endTime": "18:00",
  "location": "Central Park",
  "notes": "Outdoor ceremony"
}
```

---

## ☁️ Cloud (MoneyTrash)

### Get Cloud Status
```http
GET /cloud/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "status": "syncing",
    "lastSync": "2026-01-31T20:00:00Z",
    "queues": {
      "retention": 15,
      "fulfillment": 3
    }
  }
}
```

### Get Retention Candidates
```http
GET /cloud/candidates
```

### Process Candidate
```http
POST /cloud/candidates/:id/action
Content-Type: application/json

{
  "action": "upload" // or "exclude" or "delete"
}
```

### Trigger Retention
```http
POST /cloud/retention
```

### Queue Actions
```http
POST /cloud/queue/pause
POST /cloud/queue/resume
POST /cloud/queue/purge
```

---

## 📊 Analytics

### Get Dashboard Stats
```http
GET /analytics/dashboard?period=7d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 15000,
      "change": 15.5
    },
    "orders": {
      "total": 45,
      "change": 8.2
    },
    "albums": {
      "total": 12,
      "change": 20.0
    },
    "clients": {
      "total": 89,
      "change": 5.3
    }
  }
}
```

### Get Revenue Report
```http
GET /analytics/revenue?startDate=2026-01-01&endDate=2026-01-31&groupBy=day
```

---

## ⚙️ Settings

### Get Settings
```http
GET /settings
```

### Update Settings
```http
PUT /settings
Content-Type: application/json

{
  "companyName": "ClickFlash Photography",
  "currency": "USD",
  "taxRate": 8.5
}
```

### Network Settings
```http
GET /network-settings
PUT /network-settings
```

---

## 🔧 System

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-31T20:00:00Z",
  "version": "1.0.0",
  "uptime": 86400
}
```

### Backup
```http
POST /system/backup
```

### Restore
```http
POST /system/restore
Content-Type: multipart/form-data

backup: <file>
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
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

---

## 📈 Rate Limiting

- **Authenticated**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

---

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

---

*For SDKs and code examples, see the [Developer Docs](https://docs.clickflash.app)*
