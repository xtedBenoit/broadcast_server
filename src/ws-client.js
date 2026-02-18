import WebSocket from "ws";
import { WS_TYPES } from "./core/wsTypes.js";

function resolveInt(rawValue, fallback) {
    const value = Number.parseInt(rawValue ?? "", 10);
    return Number.isFinite(value) ? value : fallback;
}

function resolveFloat(rawValue, fallback) {
    const value = Number.parseFloat(rawValue ?? "");
    return Number.isFinite(value) ? value : fallback;
}

export function startClients({
    url = "ws://localhost:3000/ws",
    apiKey = process.env.API_KEY ?? process.env.DEFAULT_API_KEY ?? "dev-api-key",
    wsToken = process.env.WS_TOKEN ?? null,
    count = 1,
    type = "generic",
    baseName = "client",
    room = null,
    to = null,
    message = null,
    intervalMs = 0,
    typingIntervalMs = 0,
} = {}) {
    const resolvedCount = Math.max(1, resolveInt(count, 1));
    const resolvedInterval = Math.max(0, resolveFloat(intervalMs, 0));
    const resolvedTyping = Math.max(0, resolveFloat(typingIntervalMs, 0));
    const clientType = String(type || "generic").toLowerCase();

    const clients = [];

    for (let i = 1; i <= resolvedCount; i += 1) {
        const username = resolvedCount === 1 ? baseName : `${baseName}-${i}`;
        const wsUrl = new URL(url);
        if (wsToken) {
            wsUrl.searchParams.set("token", wsToken);
        }

        const headers = {};
        if (apiKey) {
            headers["x-api-key"] = apiKey;
        }

        const ws = new WebSocket(wsUrl.toString(), { headers });

        ws.on("open", () => {
            ws.send(JSON.stringify({ type: WS_TYPES.SET_USERNAME, username }));

            if (room) {
                ws.send(JSON.stringify({ type: WS_TYPES.JOIN, room }));
            }

            if (clientType === "dm") {
                if (!to) {
                    console.error(`[${username}] missing --to for DM`);
                } else if (message) {
                    ws.send(
                        JSON.stringify({
                            type: WS_TYPES.DM,
                            to,
                            text: message,
                        })
                    );
                }
            }

            if (resolvedTyping > 0) {
                setInterval(() => {
                    ws.send(
                        JSON.stringify({
                            type: WS_TYPES.TYPING,
                            status: true,
                        })
                    );
                    setTimeout(() => {
                        ws.send(
                            JSON.stringify({
                                type: WS_TYPES.TYPING,
                                status: false,
                            })
                        );
                    }, 300);
                }, resolvedTyping);
            }

            if (clientType !== "dm" && message && resolvedInterval > 0) {
                setInterval(() => {
                    const payload = room
                        ? { type: WS_TYPES.ROOM_MESSAGE, text: message }
                        : { type: WS_TYPES.CHAT, text: message };
                    ws.send(JSON.stringify(payload));
                }, resolvedInterval);
            }
        });

        ws.on("message", (data) => {
            try {
                const parsed = JSON.parse(data);
                console.log(`[${username}]`, parsed);
            } catch {
                console.log(`[${username}]`, data.toString());
            }
        });

        ws.on("close", (code, reason) => {
            const reasonText = reason ? reason.toString() : "";
            console.log(`[${username}] connection closed`, code, reasonText);
        });
        ws.on("error", (err) => {
            const details = err?.message ? err.message : String(err);
            console.error(`[${username}] error`, details);
        });

        clients.push(ws);
    }

    return clients;
}

if (process.env.WS_AUTO_START === "true") {
    startClients({
        url: process.env.WS_URL ?? "ws://localhost:3000/ws",
        apiKey: process.env.WS_API_KEY ?? process.env.API_KEY,
        wsToken: process.env.WS_TOKEN ?? null,
        count: resolveInt(process.env.WS_COUNT, 1),
        baseName: process.env.WS_NAME ?? "client",
        room: process.env.WS_ROOM ?? null,
        to: process.env.WS_TO ?? null,
        message: process.env.WS_MESSAGE ?? null,
        intervalMs: resolveFloat(process.env.WS_INTERVAL, 0),
        typingIntervalMs: resolveFloat(process.env.WS_TYPING_INTERVAL, 0),
    });
}
