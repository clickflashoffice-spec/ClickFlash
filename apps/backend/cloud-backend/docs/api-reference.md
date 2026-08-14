# Cloud Backend API Reference

## Base URL
`https://api.clickflash.com/v1`

## Authentication
Most endpoints require a Gallery Token or an Admin Token provided in the `Authorization` header as a Bearer token.

## Endpoints

### Gallery Routes

#### `GET /gallery/:id`
Retrieves the metadata and configuration for a specific gallery.
- **Path Parameters**: `id` (string) - The unique identifier of the gallery.
- **Response**: `200 OK`
  ```json
  {
    "id": "gal_123",
    "name": "Summer Festival",
    "status": "active"
  }
  ```

#### `GET /gallery/:id/photos`
Lists all photos available in the gallery.
- **Path Parameters**: `id` (string)
- **Query Parameters**: `page` (number), `limit` (number)
- **Response**: `200 OK` (Array of photo objects)

### Delivery Routes

#### `GET /delivery/:photoId/watermarked`
Downloads a lower-resolution, watermarked version of a photo for preview.
- **Path Parameters**: `photoId` (string)
- **Response**: `200 OK` (Image/jpeg)

#### `GET /delivery/:photoId/highres`
Downloads the high-resolution, LSB-watermarked version of a purchased photo.
- **Path Parameters**: `photoId` (string)
- **Headers**: Requires valid purchase token.
- **Response**: `200 OK` or `206 Partial Content` (Supports range requests)

### Face Search API

#### `POST /search/face`
Searches the gallery for photos matching the uploaded face image.
- **Body**: `multipart/form-data` containing the `image`.
- **Response**: `200 OK`
  ```json
  {
    "matches": [
      { "photoId": "p_456", "confidence": 0.98 }
    ]
  }
  ```

## Rate Limiting
- Guest API requests are limited to 100 requests per minute per IP.
- Face search API is limited to 10 requests per minute per IP.
- Responses will include `X-RateLimit-*` headers.

## Error Handling
Standard HTTP status codes are used. Error responses follow this format:
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired token provided."
  }
}
```
