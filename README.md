## Architecture
- API HTTP Fastify et WebSocket tournent dans le meme serveur (`src/server.js`).
- Les routes HTTP publient des evenements vers les clients connectes en WebSocket (`/ws`).

## Documentation
- Flow de test complet: `docs/E2E_TEST_FLOW.md`
- Roadmap API as a Service: `docs/SAAS_ROADMAP.md`
- Contrat API actuel: `docs/API_CONTRACT.md`

## Start
- `npm start`
- ou `node src/commander.js start --port 3000 --mongo mongodb://127.0.0.1:27017/broadcast_server`
- cle API par defaut en local: `dev-api-key` (changeable via `DEFAULT_API_KEY`)

## WebSocket Clients (test)
- `node src/commander.js connect --url ws://localhost:3000/ws --api-key dev-api-key --name alice`
- `node src/commander.js connect --url ws://localhost:3000/ws --api-key dev-api-key --count 2 --name lobbybot --room lobby --message "hello lobby" --interval 1000`

## HTTP Routes
- `GET /api/health`
- `GET /api/users/online`
- `POST /api/auth/ws-token` body: `{ "username": "alice", "expiresIn": "30m" }`
- `GET /api/admin/projects`
- `POST /api/admin/projects` body: `{ "name": "frontend-webapp", "allowedOrigins": ["https://app.example.com"] }`
- `PATCH /api/admin/projects/:projectId/allowed-origins` body: `{ "allowedOrigins": ["https://app.example.com"] }`
- `POST /api/admin/projects/:projectId/rotate-key`
- `POST /api/admin/projects/:projectId/revoke`
- `POST /api/messages/global` body: `{ "from": "api", "text": "hello all" }`
- `POST /api/messages/room/:room` body: `{ "from": "api", "text": "hello room" }`
- `POST /api/messages/dm` body: `{ "from": "api", "to": "alice", "text": "hello dm" }`

## Curl Examples
- `curl http://localhost:3000/api/health -H "X-API-Key: dev-api-key"`
- `curl -X POST http://localhost:3000/api/auth/ws-token -H "X-API-Key: dev-api-key" -H "Content-Type: application/json" -d "{\"username\":\"alice\",\"expiresIn\":\"30m\"}"`
- `curl -X GET http://localhost:3000/api/admin/projects -H "X-API-Key: dev-api-key"`
- `curl -X POST http://localhost:3000/api/messages/global -H "X-API-Key: dev-api-key" -H "Content-Type: application/json" -d "{\"from\":\"api\",\"text\":\"hello all\"}"`
- `curl -X POST http://localhost:3000/api/messages/room/lobby -H "X-API-Key: dev-api-key" -H "Content-Type: application/json" -d "{\"from\":\"api\",\"text\":\"hello lobby\"}"`
- `curl -X POST http://localhost:3000/api/messages/dm -H "X-API-Key: dev-api-key" -H "Content-Type: application/json" -d "{\"from\":\"api\",\"to\":\"alice\",\"text\":\"hello\"}"`
