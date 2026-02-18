import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/server.js";
import { registerChatApi } from "../src/chat-api.js";

async function buildProtectedApp(authenticate) {
    const app = createApp({
        logger: false,
        requireApiKey: true,
        authenticate,
    });
    const wss = { clients: new Set() };
    registerChatApi(app, () => wss);
    await app.ready();
    return app;
}

test("API rejects requests without X-API-Key", async () => {
    const app = await buildProtectedApp(async () => null);
    const response = await app.inject({
        method: "GET",
        url: "/api/health",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "API_KEY_REQUIRED");
    await app.close();
});

test("API rejects invalid API key", async () => {
    const app = await buildProtectedApp(async () => null);
    const response = await app.inject({
        method: "GET",
        url: "/api/health",
        headers: { "x-api-key": "bad-key" },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "INVALID_API_KEY");
    await app.close();
});

test("API accepts valid API key", async () => {
    const app = await buildProtectedApp(async (apiKey) => {
        if (apiKey !== "good-key") return null;
        return {
            tenant: { id: "t1", name: "tenant-a" },
            project: { id: "p1", name: "project-a" },
        };
    });

    const response = await app.inject({
        method: "GET",
        url: "/api/health",
        headers: { "x-api-key": "good-key" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, "ok");
    await app.close();
});

test("API can issue short-lived ws token", async () => {
    const app = await buildProtectedApp(async (apiKey) => {
        if (apiKey !== "good-key") return null;
        return {
            tenant: { id: "t1", name: "tenant-a" },
            project: { id: "p1", name: "project-a", allowedOrigins: ["*"] },
        };
    });

    const response = await app.inject({
        method: "POST",
        url: "/api/auth/ws-token",
        headers: { "x-api-key": "good-key" },
        payload: { username: "alice", expiresIn: "5m" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.tokenType, "Bearer");
    assert.ok(typeof body.token === "string" && body.token.length > 20);

    await app.close();
});
