import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/server.js";
import { registerChatApi } from "../src/chat-api.js";

async function buildAdminApp(overrides = {}) {
    const app = createApp({
        logger: false,
        requireApiKey: true,
        authenticate: async (apiKey) => {
            if (apiKey !== "good-key") return null;
            return {
                tenant: { id: "tenant-1", name: "tenant-a" },
                project: {
                    id: "project-current",
                    name: "project-a",
                    allowedOrigins: ["*"],
                },
            };
        },
    });

    const deps = {
        createProjectForTenant: async ({ tenantId, name, allowedOrigins }) => ({
            id: "project-new",
            tenantId,
            name,
            allowedOrigins,
            status: "active",
            apiKey: "pk_test_new",
        }),
        listProjectsForTenant: async ({ tenantId }) => [
            {
                id: "project-current",
                tenantId,
                name: "project-a",
                allowedOrigins: ["*"],
                status: "active",
            },
        ],
        updateProjectAllowedOrigins: async ({ tenantId, projectId, allowedOrigins }) => ({
            id: projectId,
            tenantId,
            name: "project-a",
            allowedOrigins,
            status: "active",
        }),
        rotateProjectApiKey: async ({ tenantId, projectId }) => ({
            id: projectId,
            tenantId,
            name: "project-a",
            allowedOrigins: ["*"],
            status: "active",
            apiKey: "pk_rotated",
        }),
        revokeProject: async ({ tenantId, projectId }) => ({
            id: projectId,
            tenantId,
            name: "project-b",
            allowedOrigins: ["*"],
            status: "disabled",
        }),
        ...overrides,
    };

    registerChatApi(app, () => ({ clients: new Set() }), deps);
    await app.ready();
    return app;
}

test("admin can list projects in tenant scope", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "GET",
        url: "/api/admin/projects",
        headers: { "x-api-key": "good-key" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().projects.length, 1);
    await app.close();
});

test("admin can create a project", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "POST",
        url: "/api/admin/projects",
        headers: { "x-api-key": "good-key" },
        payload: {
            name: "project-b",
            allowedOrigins: ["https://app.example.com"],
        },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().project.apiKey, "pk_test_new");
    await app.close();
});

test("admin can update allowed origins", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/projects/project-current/allowed-origins",
        headers: { "x-api-key": "good-key" },
        payload: {
            allowedOrigins: ["https://app.example.com", "https://admin.example.com"],
        },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().project.allowedOrigins.length, 2);
    await app.close();
});

test("admin can rotate a project api key", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "POST",
        url: "/api/admin/projects/project-current/rotate-key",
        headers: { "x-api-key": "good-key" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().project.apiKey, "pk_rotated");
    await app.close();
});

test("admin cannot revoke current project key", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "POST",
        url: "/api/admin/projects/project-current/revoke",
        headers: { "x-api-key": "good-key" },
    });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "CANNOT_REVOKE_CURRENT_PROJECT");
    await app.close();
});

test("admin can revoke another project", async () => {
    const app = await buildAdminApp();
    const response = await app.inject({
        method: "POST",
        url: "/api/admin/projects/project-other/revoke",
        headers: { "x-api-key": "good-key" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().project.status, "disabled");
    await app.close();
});
