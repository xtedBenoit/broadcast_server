import { WebSocketServer } from 'ws';

import { joinRoom, leaveRoom } from './services/roomService.js';

import { addOnlineUser, removeInlineUser, getOnlineUsers } from './services/userService.js';

import { saveHistory, getChatHistory } from './services/messageService.js';

import { broadcastExcept, broadcastAll, broadcastRoom } from './core/wsHelper.js';

const wss = new WebSocketServer({ port: 8080 });



wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.isAlive = true;
    ws.currentRoom = null;

    // Ask for username
    ws.send(JSON.stringify({
        type: "request_username"
    }));

    ws.on("pong", () => ws.isAlive = true);

    ws.on("message", (data) => {
        let msg;
        try { msg = JSON.parse(data); }
        catch { 
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
            ws.send(JSON.stringify({
                type: "chat_history",
                history: getChatHistory()
            }));

            // Send online list to everyone
            broadcastAll(wss,{
                type: "online_users",
                users: getOnlineUsers()
            });

            // Welcome new user
            broadcastExcept(wss,ws, {
                type: "user_joined",
                username: ws.username
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
                status: msg.status   // true = typing, false = stopped
            });
            return;
        }

        // ---------------------------------
        // 3️⃣ PRIVATE MESSAGE
        // ---------------------------------
        if (msg.type === "dm") {
            const target = [...wss.clients].find(c => c.username === msg.to);

            if (!target) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: `User '${msg.to}' not found`
                }));
                return;
            }

            target.send(JSON.stringify({
                type: "dm",
                from: ws.username,
                text: msg.text
            }));

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

            ws.send(JSON.stringify({
                type: "joined_room",
                room: msg.room
            }));

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
                time: Date.now()
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
                time: Date.now()
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
                users: getOnlineUsers()
            });

            broadcastAll(wss, {
                type: "user_left",
                username: ws.username
            });
        }

        leaveRoom(ws);
    });
});

/** Keep alive */
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

console.log("WebSocket server running at ws://localhost:8080");
