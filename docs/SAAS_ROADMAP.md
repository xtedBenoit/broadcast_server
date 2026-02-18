# Messaging API as a Service Roadmap

## Product Direction
Turn this project into a multi-tenant messaging platform:
- Any app can connect via HTTP + WebSocket
- Each customer uses their own API credentials
- Optional custom database URL per tenant
- Real-time + persistent messaging with strong auth and observability

## Target Architecture
- API Gateway (Fastify): auth, rate-limit, routing, API keys
- Realtime Gateway (WebSocket): connection auth, subscriptions, fanout
- Core Messaging Service: message validation, routing, delivery rules
- Persistence Layer: messages, rooms, users, memberships
- Event Bus (Redis/NATS/Kafka): decouple HTTP writes from realtime fanout
- Worker Layer: retries, dead-letter queue, webhooks, push providers

## Multi-Tenant Model
- `Tenant`: id, name, plan, status, limits
- `Project/App`: public key, secret, allowed origins, webhook config
- `User`: externalUserId, profile metadata
- `Conversation`: direct or group
- `Membership`: user roles/permissions per conversation
- `Message`: id, sender, body, attachments, status, timestamps
- `Device/Session`: for WS and token lifecycle

## Security Baseline
- API key + secret or OAuth2 client credentials
- JWT access tokens for end users
- WebSocket auth during handshake
- RBAC for admin vs app user actions
- CORS allowlist + origin checks
- Rate limiting per tenant and endpoint
- Signed webhooks and replay protection

## API Surface (v1 proposal)
- `POST /v1/auth/token`
- `POST /v1/users`
- `POST /v1/conversations`
- `POST /v1/conversations/:id/members`
- `POST /v1/messages`
- `GET /v1/messages?conversationId=...`
- `GET /v1/presence/:userId`
- `POST /v1/webhooks`

WebSocket channels:
- `presence.update`
- `conversation.message.created`
- `conversation.message.updated`
- `conversation.member.joined`
- `conversation.member.left`

## Delivery and Reliability
- Message IDs (UUID/ULID)
- Idempotency key on message creation
- Ack protocol for client delivery
- Retry policy for transient failures
- DLQ for undelivered events
- Ordering guarantees per conversation

## Storage Strategy
- MongoDB for primary entities (current direction)
- Redis for presence, ephemeral state, and pub/sub
- Optional object storage (S3-compatible) for attachments

## Observability and Operations
- Structured logs with request/tenant correlation IDs
- Metrics: p95 latency, connected clients, message throughput, error rate
- Tracing across HTTP -> queue -> WS delivery
- Health checks and readiness checks
- Admin dashboard for tenant usage and incidents

## Phased Delivery
## Phase 1 (now -> short term)
- Stabilize current API + WS contract
- Add Zod validation to all HTTP endpoints
- Add auth middleware and API key model
- Add integration tests (HTTP + WS)

## Phase 2
- Add tenant/project entities and scoped API keys
- Add Redis pub/sub for horizontal scaling
- Add pagination, filtering, and message history endpoints
- Add conversation membership roles

## Phase 3
- Add webhooks, delivery receipts, typing/presence improvements
- Add attachments and moderation hooks
- Add plan limits and billing hooks

## Phase 4
- High availability deployment profile
- SLOs, autoscaling, disaster recovery
- SDKs (JS/TS first, then mobile)

## Concrete Next Step for This Repo
1. Introduce tenant-aware auth (`X-API-Key`) middleware.
2. Add Zod schemas for every route in `src/chat-api.js`.
3. Add `conversationId` domain model replacing free-form room strings.
4. Add automated E2E tests in CI for global, DM, room isolation.

