import WebSocket from "ws";

function resolveInt(rawValue, fallback) {
    const value = Number.parseInt(rawValue ?? "", 10);
    return Number.isFinite(value) ? value : fallback;
}

function resolveFloat(rawValue, fallback) {
    const value = Number.parseFloat(rawValue ?? "");
    return Number.isFinite(value) ? value : fallback;
}

export function startClients({
    url = "ws://localhost:8080",
    count = 1,
    baseName = "client",
    room = null,
    message = null,
    intervalMs = 0,
} = {}) {
    const resolvedCount = Math.max(1, resolveInt(count, 1));
    const resolvedInterval = Math.max(0, resolveFloat(intervalMs, 0));

    const clients = [];

    for (let i = 1; i <= resolvedCount; i += 1) {
        const username = resolvedCount === 1 ? baseName : `${baseName}-${i}`;
        const ws = new WebSocket(url);

        ws.on("open", () => {
            ws.send(JSON.stringify({ type: "set_username", username }));

            if (room) {
                ws.send(JSON.stringify({ type: "join", room }));
            }

            if (message && resolvedInterval > 0) {
                setInterval(() => {
                    const payload = room
                        ? { type: "room_message", text: message }
                        : { type: "chat", text: message };
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
            const details = err && err.message ? err.message : String(err);
            console.error(`[${username}] error`, details);
        });

        clients.push(ws);
    }

    return clients;
}

if (process.env.WS_AUTO_START === "true") {
    startClients({
        url: process.env.WS_URL ?? "ws://localhost:8080",
        count: resolveInt(process.env.WS_COUNT, 1),
        baseName: process.env.WS_NAME ?? "client",
        room: process.env.WS_ROOM ?? null,
        message: process.env.WS_MESSAGE ?? null,
        intervalMs: resolveFloat(process.env.WS_INTERVAL, 0),
    });
}
