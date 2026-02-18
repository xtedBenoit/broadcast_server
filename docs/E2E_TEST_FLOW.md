# End-to-End Test Flow (HTTP + WebSocket)

## Goal
Validate that:
- HTTP API is online
- WebSocket clients receive global messages
- Direct messages are routed to the right user
- Room messages are isolated per room
- Error cases are handled correctly

## Prerequisites
- MongoDB available (local or remote)
- Dependencies installed (`npm install`)
- PowerShell terminal
- API key available (default local key: `dev-api-key`)

## 1. Start Server
Terminal A:

```powershell
npm start
```

Expected logs include:
- `Server listening at ...`
- `WebSocket endpoint available at ws://localhost:3000/ws`

## 2. Connect WebSocket Clients
Terminal B (Alice in lobby):

```powershell
node src/commander.js connect --url ws://localhost:3000/ws --api-key dev-api-key --name alice --room lobby
```

Terminal C (Bob in dev):

```powershell
node src/commander.js connect --url ws://localhost:3000/ws --api-key dev-api-key --name bob --room dev
```

Terminal D (Watcher, no room):

```powershell
node src/commander.js connect --url ws://localhost:3000/ws --api-key dev-api-key --name watcher
```

## 3. HTTP Health and Presence
Terminal E:

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/health" -Headers @{ "X-API-Key" = "dev-api-key" }
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/users/online" -Headers @{ "X-API-Key" = "dev-api-key" }
```

Expected:
- `status: ok`
- WebSocket client count >= 3
- Online users include `alice`, `bob`, `watcher`

## 4. Global Broadcast
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/messages/global" `
  -Headers @{ "X-API-Key" = "dev-api-key" } `
  -ContentType "application/json" `
  -Body '{"from":"api","text":"hello everyone"}'
```

Expected:
- Alice receives `type: "chat"`
- Bob receives `type: "chat"`
- Watcher receives `type: "chat"`

## 5. Direct Message (DM)
```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/messages/dm" `
  -Headers @{ "X-API-Key" = "dev-api-key" } `
  -ContentType "application/json" `
  -Body '{"from":"api","to":"alice","text":"hello alice dm"}'
```

Expected:
- Only Alice receives `type: "dm"` with `from: "api"`

## 6. Room Isolation
Message to `lobby`:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/messages/room/lobby" `
  -Headers @{ "X-API-Key" = "dev-api-key" } `
  -ContentType "application/json" `
  -Body '{"from":"api","text":"hello lobby only"}'
```

Expected:
- Alice receives `type: "room_message"` for `room: "lobby"`
- Bob does not receive it
- Watcher does not receive it

Message to `dev`:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/messages/room/dev" `
  -Headers @{ "X-API-Key" = "dev-api-key" } `
  -ContentType "application/json" `
  -Body '{"from":"api","text":"hello dev only"}'
```

Expected:
- Bob receives `type: "room_message"` for `room: "dev"`
- Alice does not receive it
- Watcher does not receive it

## 7. Error Path
Unknown DM target:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/messages/dm" `
  -Headers @{ "X-API-Key" = "dev-api-key" } `
  -ContentType "application/json" `
  -Body '{"from":"api","to":"nobody","text":"test"}'
```

Expected:
- HTTP `404`
- Body contains `User 'nobody' not found`

## 8. Pass Criteria
- No server crash
- All expected recipients match behavior above
- Error responses return correct status and message
