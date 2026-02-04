import { WebSocketServer } from "ws";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { joinRoom, leaveRoom } from "./services/roomService.js";
import { addOnlineUser, removeInlineUser, getOnlineUsers } from "./services/userService.js";
import { saveHistory, getChatHistory } from "./services/messageService.js";
import { broadcastExcept, broadcastAll, broadcastRoom } from "./core/wsHelper.js";

function resolvePort(rawPort, fallback) {
    const port = Number.parseInt(rawPort ?? "", 10);
    return Number.isFinite(port) ? port : fallback;
}

export function startWsGateway({ port = 8080 } = {}) {
    const wss = new WebSocketServer({ port });

    wss.on("connection", (ws) => {
        console.log("Client connected");

        ws.isAlive = true;
        ws.currentRoom = null;

        // Ask for username
        ws.send(
            JSON.stringify({
                type: "request_username",
            })
        );

        ws.on("pong", () => (ws.isAlive = true));

        ws.on("message", (data) => {
            let msg;
            try {
                msg = JSON.parse(data);
            } catch {
                ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
                return;
            }

            // ---------------------------------
            // 1️⃣ SET USERNAME
            // ---------------------------------
            if (msg.type === "set_username") {
                ws.username = msg.username || "Anonymous";
                addOnlineUser(ws.username);

                // Send chat history
                ws.send(
                    JSON.stringify({
                        type: "chat_history",
                        history: getChatHistory(),
                    })
                );

                // Send online list to everyone
                broadcastAll(wss, {
                    type: "online_users",
                    users: getOnlineUsers(),
                });

                // Welcome new user
                broadcastExcept(wss, ws, {
                    type: "user_joined",
                    username: ws.username,
                });

                return;
            }

            if (!ws.username) {
                ws.send(JSON.stringify({ type: "error", message: "Set username first" }));
                return;
            }

            // ---------------------------------
            // 2️⃣ TYPING INDICATORS
            // ---------------------------------
            if (msg.type === "typing") {
                broadcastExcept(wss, ws, {
                    type: "user_typing",
                    username: ws.username,
                    status: msg.status, // true = typing, false = stopped
                });
                return;
            }

            // ---------------------------------
            // 3️⃣ PRIVATE MESSAGE
            // ---------------------------------
            if (msg.type === "dm") {
                const target = [...wss.clients].find((c) => c.username === msg.to);

                if (!target) {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            message: `User '${msg.to}' not found`,
                        })
                    );
                    return;
                }

                target.send(
                    JSON.stringify({
                        type: "dm",
                        from: ws.username,
                        text: msg.text,
                    })
                );

                return;
            }

            // ---------------------------------
            // 4️⃣ ROOM JOIN
            // ---------------------------------
            if (msg.type === "join") {
                leaveRoom(ws);

                ws.currentRoom = null;

                const room = joinRoom(ws, msg.room);

                ws.currentRoom = room;

                ws.send(
                    JSON.stringify({
                        type: "joined_room",
                        room: msg.room,
                    })
                );

                return;
            }

            // ---------------------------------
            // 5️⃣ ROOM MESSAGE
            // ---------------------------------
            if (msg.type === "room_message") {
                const obj = {
                    type: "room_message",
                    from: ws.username,
                    room: ws.currentRoom,
                    text: msg.text,
                    time: Date.now(),
                };

                saveHistory(obj);
                broadcastRoom(ws.currentRoom, obj, ws);
                return;
            }

            // ---------------------------------
            // 6️⃣ GLOBAL BROADCAST CHAT
            // ---------------------------------
            if (msg.type === "chat") {
                const obj = {
                    type: "chat",
                    from: ws.username,
                    text: msg.text,
                    time: Date.now(),
                };

                saveHistory(obj);
                broadcastExcept(wss, ws, obj);
            }
        });

        ws.on("close", () => {
            if (ws.username) {
                removeInlineUser(ws.username);

                // Notify everyone
                broadcastAll(wss, {
                    type: "online_users",
                    users: getOnlineUsers(),
                });

                broadcastAll(wss, {
                    type: "user_left",
                    username: ws.username,
                });
            }

            leaveRoom(ws);
        });
    });

    /** Keep alive */
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => clearInterval(pingInterval));

    console.log(`WebSocket server running at ws://localhost:${port}`);
    return wss;
}

const isMain =
    process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
    const port = resolvePort(process.env.WS_PORT, 8080);
    startWsGateway({ port });
}
