import fastify from "fastify";
import { connectMongo } from "./config/db.js";
import { attachWsGatewayToServer } from "./ws-gateway.js";
import { registerChatApi } from "./chat-api.js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { buildApiKeyAuth } from "./middlewares/apiKeyAuth.js";
import { authenticateApiKey, ensureDefaultTenantProject } from "./services/authService.js";

export function createApp({
    logger = true,
    requireApiKey = false,
    authenticate = authenticateApiKey,
} = {}) {
    const app = fastify({ logger });

    app.addHook("onRequest", async (request) => {
        request.log.info(
            { requestId: request.id, method: request.method, url: request.url },
            "request_in"
        );
    });

    app.addHook("onResponse", async (request, reply) => {
        request.log.info(
            {
                requestId: request.id,
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
            },
            "request_out"
        );
    });

    app.setNotFoundHandler(async (request, reply) => {
        return reply.code(404).send({
            error: {
                code: "NOT_FOUND",
                message: `Route ${request.method} ${request.url} not found`,
                details: null,
            },
        });
    });

    app.setErrorHandler(async (error, _request, reply) => {
        const statusCode =
            Number.isInteger(error.statusCode) && error.statusCode >= 400
                ? error.statusCode
                : 500;

        const code = statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
        const message = statusCode >= 500 ? "Internal server error" : error.message;

        return reply.code(statusCode).send({
            error: {
                code,
                message,
                details: null,
            },
        });
    });

    app.addHook(
        "onRequest",
        buildApiKeyAuth({
            enabled: requireApiKey,
            authenticate,
        })
    );

    return app;
}

export async function startServer({
    host = process.env.HOST ?? "localhost",
    port = process.env.PORT,
    mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/broadcast_server",
    connectDb = true,
    logger = true,
    requireApiKey = true,
} = {}) {
    const app = createApp({ logger, requireApiKey });
    const parsedPort = Number.parseInt(String(port ?? ""), 10);
    const resolvedPort = Number.isFinite(parsedPort) ? parsedPort : 3000;

    if (connectDb && mongoUri) {
        await connectMongo(mongoUri);
        const bootstrap = await ensureDefaultTenantProject();
        if (bootstrap) {
            app.log.info(
                {
                    tenant: bootstrap.tenant.name,
                    project: bootstrap.project.name,
                    apiKey: bootstrap.project.apiKey,
                },
                "default_project_ready"
            );
        }
    }

    let wss = null;
    registerChatApi(app, () => wss);

    const address = await app.listen({ port: resolvedPort, host });
    wss = attachWsGatewayToServer(app.server, { path: "/ws" });

    app.log.info({ address }, "server_started");
    app.log.info(
        { endpoint: `ws://${host}:${resolvedPort}/ws` },
        "websocket_endpoint_ready"
    );

    return { app, wss, address };
}

const isMain =
    process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
    startServer().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
