import { WebSocketServer } from "ws";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { attachConnectionHandlers } from "./ws-gateway/connection.js";
import { startKeepAlive } from "./ws-gateway/keepAlive.js";
import { resolvePort } from "./ws-gateway/utils.js";
import { connectMongo } from "./config/db.js";

export function startWsGateway({ port = 8080 } = {}) {
    const wss = new WebSocketServer({ port });

    attachConnectionHandlers(wss);

    const stopKeepAlive = startKeepAlive(wss);
    wss.on("close", stopKeepAlive);

    console.log(`WebSocket server running at ws://localhost:${port}`);
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
