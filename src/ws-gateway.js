import { WebSocketServer } from "ws";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { attachConnectionHandlers } from "./ws-gateway/connection.js";
import { startKeepAlive } from "./ws-gateway/keepAlive.js";
import { resolvePort } from "./ws-gateway/utils.js";
import { connectMongo } from "./config/db.js";
import { authenticateApiKey } from "./services/authService.js";
import { verifyWsToken } from "./services/tokenService.js";

function isOriginAllowed(origin, allowedOrigins = ["*"]) {
    if (!origin) return true; // non-browser clients
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return false;
    if (allowedOrigins.includes("*")) return true;
    return allowedOrigins.includes(origin);
}

export function startWsGateway({ port = 8080 } = {}) {
    const wss = new WebSocketServer({ port });

    attachConnectionHandlers(wss);

    const stopKeepAlive = startKeepAlive(wss);
    wss.on("close", stopKeepAlive);

    console.log(`WebSocket server running at ws://localhost:${port}`);
    return wss;
}

export function attachWsGatewayToServer(server, { path = "/ws" } = {}) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        void (async () => {
            const host = request.headers.host || "localhost";
            const parsedUrl = new URL(request.url || "/", `http://${host}`);
            const { pathname } = parsedUrl;

            if (pathname !== path) {
                socket.destroy();
                return;
            }

            const headerApiKey = request.headers["x-api-key"];
            const apiKey = Array.isArray(headerApiKey)
                ? headerApiKey[0]
                : headerApiKey || parsedUrl.searchParams.get("apiKey");
            const origin = request.headers.origin;
            const authorization = request.headers.authorization;
            const bearerToken =
                typeof authorization === "string" && authorization.startsWith("Bearer ")
                    ? authorization.slice("Bearer ".length)
                    : null;
            const token = parsedUrl.searchParams.get("token") || bearerToken;

            let auth = null;
            if (token) {
                const claims = verifyWsToken(token);
                if (claims?.tenantId && claims?.projectId) {
                    auth = {
                        tenant: { id: claims.tenantId },
                        project: {
                            id: claims.projectId,
                            allowedOrigins: claims.allowedOrigins ?? ["*"],
                        },
                        identity: { username: claims.username ?? null },
                    };
                }
            }

            if (!auth) {
                auth = await authenticateApiKey(apiKey);
            }
            if (!auth) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }
            if (!isOriginAllowed(origin, auth.project.allowedOrigins)) {
                socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.tenantId = auth.tenant.id;
                ws.projectId = auth.project.id;
                ws.identity = auth.identity ?? null;
                wss.emit("connection", ws, request);
            });
        })().catch(() => {
            socket.destroy();
        });
    });

    attachConnectionHandlers(wss);

    const stopKeepAlive = startKeepAlive(wss);
    wss.on("close", stopKeepAlive);

    return wss;
}

const isMain =
    process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
    const port = resolvePort(process.env.WS_PORT, 8080);
    const mongoUri =
        process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/broadcast_server";
    connectMongo(mongoUri).then(() => startWsGateway({ port }));
}
