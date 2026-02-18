import { WS_TYPES } from "./core/wsTypes.js";
import { broadcastAll, broadcastRoom } from "./core/wsHelper.js";
import { getOnlineUsers } from "./services/userService.js";
import { saveHistory } from "./services/messageService.js";
import { z } from "zod";
import { issueWsToken } from "./services/tokenService.js";
import {
    createProjectForTenant,
    listProjectsForTenant,
    revokeProject,
    rotateProjectApiKey,
    updateProjectAllowedOrigins,
} from "./services/projectAdminService.js";

function getConnectedClientCount(wss) {
    return wss ? wss.clients.size : 0;
}

function resolveTenantId(request) {
    return request.tenant?.id ?? null;
}

const nonEmptyString = z.string().trim().min(1);

const globalMessageBodySchema = z.object({
    from: nonEmptyString.optional().default("api"),
    text: nonEmptyString,
});

const roomMessageParamsSchema = z.object({
    room: nonEmptyString,
});

const roomMessageBodySchema = z.object({
    from: nonEmptyString.optional().default("api"),
    text: nonEmptyString,
});

const dmBodySchema = z.object({
    from: nonEmptyString.optional().default("api"),
    to: nonEmptyString,
    text: nonEmptyString,
});

const wsTokenBodySchema = z.object({
    username: nonEmptyString.optional(),
    expiresIn: nonEmptyString.optional(),
});

const allowedOriginsSchema = z.array(nonEmptyString).min(1);

const createProjectBodySchema = z.object({
    name: nonEmptyString,
    allowedOrigins: allowedOriginsSchema.optional().default(["*"]),
});

const projectIdParamsSchema = z.object({
    projectId: nonEmptyString,
});

const updateOriginsBodySchema = z.object({
    allowedOrigins: allowedOriginsSchema,
});

function sendApiError(reply, statusCode, code, message, details = null) {
    return reply.code(statusCode).send({
        error: {
            code,
            message,
            details,
        },
    });
}

function parseOrReply(reply, schema, payload) {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        sendApiError(reply, 400, "VALIDATION_ERROR", "Invalid request payload", {
            issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        });
        return null;
    }

    return parsed.data;
}

function getGatewayOrReply(reply, getWss) {
    const wss = getWss();
    if (!wss) {
        sendApiError(
            reply,
            503,
            "WEBSOCKET_UNAVAILABLE",
            "WebSocket gateway unavailable"
        );
        return null;
    }

    return wss;
}

export function registerChatApi(
    app,
    getWss,
    deps = {
        createProjectForTenant,
        listProjectsForTenant,
        updateProjectAllowedOrigins,
        rotateProjectApiKey,
        revokeProject,
    }
) {
    app.get("/api/health", async () => {
        const wss = getWss();
        return {
            status: "ok",
            websocket: {
                path: "/ws",
                clients: getConnectedClientCount(wss),
            },
        };
    });

    app.get("/api/users/online", async (request) => {
        return { users: getOnlineUsers(resolveTenantId(request)) };
    });

    app.post("/api/auth/ws-token", async (request, reply) => {
        const body = parseOrReply(reply, wsTokenBodySchema, request.body ?? {});
        if (!body) return;
        if (!request.tenant || !request.project) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }

        const token = issueWsToken({
            tenantId: request.tenant.id,
            projectId: request.project.id,
            username: body.username,
            allowedOrigins: request.project.allowedOrigins ?? ["*"],
            expiresIn: body.expiresIn,
        });

        return {
            token,
            tokenType: "Bearer",
            expiresIn: body.expiresIn ?? process.env.WS_TOKEN_TTL ?? "30m",
        };
    });

    app.get("/api/admin/projects", async (request, reply) => {
        if (!request.tenant) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }
        const projects = await deps.listProjectsForTenant({
            tenantId: request.tenant.id,
        });
        return { projects };
    });

    app.post("/api/admin/projects", async (request, reply) => {
        if (!request.tenant) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }
        const body = parseOrReply(reply, createProjectBodySchema, request.body ?? {});
        if (!body) return;
        try {
            const project = await deps.createProjectForTenant({
                tenantId: request.tenant.id,
                name: body.name,
                allowedOrigins: body.allowedOrigins,
            });
            return reply.code(201).send({ project });
        } catch (error) {
            if (error?.code === 11000) {
                return sendApiError(
                    reply,
                    409,
                    "PROJECT_ALREADY_EXISTS",
                    "Project already exists for this tenant"
                );
            }
            throw error;
        }
    });

    app.patch("/api/admin/projects/:projectId/allowed-origins", async (request, reply) => {
        if (!request.tenant) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }
        const params = parseOrReply(reply, projectIdParamsSchema, request.params ?? {});
        if (!params) return;
        const body = parseOrReply(reply, updateOriginsBodySchema, request.body ?? {});
        if (!body) return;

        const project = await deps.updateProjectAllowedOrigins({
            tenantId: request.tenant.id,
            projectId: params.projectId,
            allowedOrigins: body.allowedOrigins,
        });
        if (!project) {
            return sendApiError(reply, 404, "PROJECT_NOT_FOUND", "Project not found");
        }
        return { project };
    });

    app.post("/api/admin/projects/:projectId/rotate-key", async (request, reply) => {
        if (!request.tenant) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }
        const params = parseOrReply(reply, projectIdParamsSchema, request.params ?? {});
        if (!params) return;

        const project = await deps.rotateProjectApiKey({
            tenantId: request.tenant.id,
            projectId: params.projectId,
        });
        if (!project) {
            return sendApiError(reply, 404, "PROJECT_NOT_FOUND", "Project not found");
        }
        return { project };
    });

    app.post("/api/admin/projects/:projectId/revoke", async (request, reply) => {
        if (!request.tenant) {
            return sendApiError(reply, 401, "UNAUTHORIZED", "Tenant context is missing");
        }
        const params = parseOrReply(reply, projectIdParamsSchema, request.params ?? {});
        if (!params) return;
        if (request.project?.id === params.projectId) {
            return sendApiError(
                reply,
                409,
                "CANNOT_REVOKE_CURRENT_PROJECT",
                "Current project cannot revoke itself"
            );
        }

        const project = await deps.revokeProject({
            tenantId: request.tenant.id,
            projectId: params.projectId,
        });
        if (!project) {
            return sendApiError(reply, 404, "PROJECT_NOT_FOUND", "Project not found");
        }
        return { project };
    });

    app.post("/api/messages/global", async (request, reply) => {
        const body = parseOrReply(reply, globalMessageBodySchema, request.body ?? {});
        if (!body) {
            return;
        }

        const wss = getGatewayOrReply(reply, getWss);
        if (!wss) {
            return;
        }

        const message = {
            type: WS_TYPES.CHAT,
            tenantId: resolveTenantId(request),
            from: body.from,
            text: body.text,
            time: Date.now(),
        };

        saveHistory(message);
        broadcastAll(wss, message, message.tenantId);

        return { sent: true, recipients: getConnectedClientCount(wss) };
    });

    app.post("/api/messages/room/:room", async (request, reply) => {
        const params = parseOrReply(reply, roomMessageParamsSchema, request.params ?? {});
        if (!params) {
            return;
        }

        const body = parseOrReply(reply, roomMessageBodySchema, request.body ?? {});
        if (!body) {
            return;
        }

        const wss = getGatewayOrReply(reply, getWss);
        if (!wss) {
            return;
        }

        const message = {
            type: WS_TYPES.ROOM_MESSAGE,
            tenantId: resolveTenantId(request),
            from: body.from,
            room: params.room,
            text: body.text,
            time: Date.now(),
        };

        saveHistory(message);
        broadcastRoom(wss, message.room, message, null, message.tenantId);

        return { sent: true, room: message.room };
    });

    app.post("/api/messages/dm", async (request, reply) => {
        const body = parseOrReply(reply, dmBodySchema, request.body ?? {});
        if (!body) {
            return;
        }

        const wss = getGatewayOrReply(reply, getWss);
        if (!wss) {
            return;
        }

        const tenantId = resolveTenantId(request);
        const target = [...wss.clients].find(
            (c) =>
                c.username === body.to &&
                (tenantId ? c.tenantId === tenantId : true)
        );
        if (!target) {
            return sendApiError(reply, 404, "USER_NOT_FOUND", `User '${body.to}' not found`);
        }

        target.send(
            JSON.stringify({
                type: WS_TYPES.DM,
                from: body.from,
                text: body.text,
            })
        );

        return { sent: true, to: body.to };
    });
}
