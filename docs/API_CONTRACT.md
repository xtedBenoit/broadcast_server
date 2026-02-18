# API Contract (Phase 1)

## Authentication
- All `/api/*` endpoints require header `X-API-Key`.
- Missing key returns `401 API_KEY_REQUIRED`.
- Invalid/inactive key returns `403 INVALID_API_KEY`.

## Error Format
All HTTP errors return:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": null
  }
}
```

## Endpoints
- `GET /api/health`
- `GET /api/users/online`
- `POST /api/auth/ws-token`
- `GET /api/admin/projects`
- `POST /api/admin/projects`
- `PATCH /api/admin/projects/:projectId/allowed-origins`
- `POST /api/admin/projects/:projectId/rotate-key`
- `POST /api/admin/projects/:projectId/revoke`
- `POST /api/messages/global`
- `POST /api/messages/room/:room`
- `POST /api/messages/dm`

## Request Payloads
### POST `/api/messages/global`
```json
{
  "from": "api",
  "text": "hello everyone"
}
```

### POST `/api/messages/room/:room`
```json
{
  "from": "api",
  "text": "hello room"
}
```

### POST `/api/messages/dm`
```json
{
  "from": "api",
  "to": "alice",
  "text": "hello dm"
}
```

### POST `/api/auth/ws-token`
```json
{
  "username": "alice",
  "expiresIn": "30m"
}
```

### POST `/api/admin/projects`
```json
{
  "name": "frontend-webapp",
  "allowedOrigins": ["https://app.example.com"]
}
```

### PATCH `/api/admin/projects/:projectId/allowed-origins`
```json
{
  "allowedOrigins": ["https://app.example.com", "https://admin.example.com"]
}
```

Response:
```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": "30m"
}
```

## Validation Rules
- `text` is required and must be a non-empty string.
- `to` is required for DM and must be a non-empty string.
- `room` route param is required and must be a non-empty string.
- `from` defaults to `"api"` when omitted.

## Tenant Scoping
- Message delivery is scoped by tenant API key.
- Direct message targets are resolved only inside the same tenant.
- Room broadcasts are isolated by `(tenant, room)`.

## WebSocket Authentication
- WebSocket accepts either:
  - `X-API-Key` header
  - JWT token via query param: `ws://host/ws?token=<jwt>`
  - JWT token via header: `Authorization: Bearer <jwt>`
