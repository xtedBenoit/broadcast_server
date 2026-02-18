import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/server.js";
import { registerChatApi } from "../src/chat-api.js";

function createClient({ username, room = null } = {}) {
    const sent = [];

    return {
        username,
        currentRoom: room,
        readyState: 1,
        OPEN: 1,
        send(payload) {
            sent.push(JSON.parse(payload));
        },
        sent,
    };
}

async function buildApp(clients = []) {
    const app = createApp({ logger: false });
    const wss = { clients: new Set(clients) };
    registerChatApi(app, () => wss);
    await app.ready();
    return app;
}

test("GET /api/health returns websocket state", async () => {
    const alice = createClient({ username: "alice" });
    const bob = createClient({ username: "bob" });
    const app = await buildApp([alice, bob]);

    const response = await app.inject({
        method: "GET",
        url: "/api/health",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.status, "ok");
    assert.equal(body.websocket.path, "/ws");
    assert.equal(body.websocket.clients, 2);

    await app.close();
});

test("POST /api/messages/global validates payload and broadcasts to all clients", async () => {
    const alice = createClient({ username: "alice" });
    const bob = createClient({ username: "bob" });
    const app = await buildApp([alice, bob]);

    const badRequest = await app.inject({
        method: "POST",
        url: "/api/messages/global",
        payload: { from: "api" },
    });

    assert.equal(badRequest.statusCode, 400);
    assert.equal(badRequest.json().error.code, "VALIDATION_ERROR");

    const response = await app.inject({
        method: "POST",
        url: "/api/messages/global",
        payload: { from: "api", text: "hello global" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().sent, true);
    assert.equal(alice.sent.length, 1);
    assert.equal(bob.sent.length, 1);
    assert.equal(alice.sent[0].type, "chat");
    assert.equal(alice.sent[0].text, "hello global");

    await app.close();
});

test("POST /api/messages/dm routes only to target user", async () => {
    const alice = createClient({ username: "alice" });
    const bob = createClient({ username: "bob" });
    const app = await buildApp([alice, bob]);

    const response = await app.inject({
        method: "POST",
        url: "/api/messages/dm",
        payload: { from: "api", to: "alice", text: "hello dm" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().sent, true);
    assert.equal(alice.sent.length, 1);
    assert.equal(bob.sent.length, 0);
    assert.equal(alice.sent[0].type, "dm");
    assert.equal(alice.sent[0].text, "hello dm");

    const missing = await app.inject({
        method: "POST",
        url: "/api/messages/dm",
        payload: { from: "api", to: "nobody", text: "x" },
    });

    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error.code, "USER_NOT_FOUND");

    await app.close();
});

test("POST /api/messages/room/:room isolates delivery by room", async () => {
    const alice = createClient({ username: "alice", room: "lobby" });
    const bob = createClient({ username: "bob", room: "dev" });
    const watcher = createClient({ username: "watcher", room: null });
    const app = await buildApp([alice, bob, watcher]);

    const lobby = await app.inject({
        method: "POST",
        url: "/api/messages/room/lobby",
        payload: { from: "api", text: "hello lobby" },
    });

    assert.equal(lobby.statusCode, 200);
    assert.equal(alice.sent.length, 1);
    assert.equal(bob.sent.length, 0);
    assert.equal(watcher.sent.length, 0);
    assert.equal(alice.sent[0].room, "lobby");

    const dev = await app.inject({
        method: "POST",
        url: "/api/messages/room/dev",
        payload: { from: "api", text: "hello dev" },
    });

    assert.equal(dev.statusCode, 200);
    assert.equal(bob.sent.length, 1);
    assert.equal(bob.sent[0].room, "dev");

    await app.close();
});
