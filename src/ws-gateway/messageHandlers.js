import { WS_TYPES } from "../core/wsTypes.js";
import { joinRoom, leaveRoom } from "../services/roomService.js";
import { addOnlineUser, getOnlineUsers, getUsersForRoom } from "../services/userService.js";
import { saveHistory, getChatHistory } from "../services/messageService.js";
import { broadcastExcept, broadcastAll, broadcastRoom } from "../core/wsHelper.js";

export async function handleMessage({ wss, ws, msg }) {
    // ---------------------------------
    // 1️⃣ SET USERNAME
    // ---------------------------------
    if (msg.type === WS_TYPES.SET_USERNAME) {
        ws.username = msg.username || "Anonymous";
        addOnlineUser(ws.username);

        if(ws.currentRoom) {
            ws.send(
            JSON.stringify({
                type: WS_TYPES.CHAT_HISTORY,
                history: getChatHistory(),
            })
        );
        }


        // Send online list to everyone
        let users = [];
        try {
            users = await getUsersForRoom(ws.currentRoom);
        } catch {
            users = getOnlineUsers();
        }

        broadcastAll(wss, {
            type: WS_TYPES.ONLINE_USERS,
            users,
        });

        // Welcome new user in room if available, otherwise broadcast
        if (ws.currentRoom) {
            broadcastRoom(ws.currentRoom, {
                type: WS_TYPES.USER_JOINED,
                username: ws.username,
            }, ws);
        } else {
            broadcastExcept(wss, ws, {
                type: WS_TYPES.USER_JOINED,
                username: ws.username,
            });
        }

        return true;
    }

    if (!ws.username) {
        ws.send(JSON.stringify({ type: WS_TYPES.ERROR, message: "Set username first" }));
        return true;
    }

    // ---------------------------------
    // 2️⃣ TYPING INDICATORS
    // ---------------------------------
    if (msg.type === WS_TYPES.TYPING) {
        broadcastExcept(wss, ws, {
            type: WS_TYPES.USER_TYPING,
            username: ws.username,
            status: msg.status, // true = typing, false = stopped
        });
        return true;
    }

    // ---------------------------------
    // 3️⃣ PRIVATE MESSAGE
    // ---------------------------------
    if (msg.type === WS_TYPES.DM) {
        const target = [...wss.clients].find((c) => c.username === msg.to);

        if (!target) {
            ws.send(
                JSON.stringify({
                    type: WS_TYPES.ERROR,
                    message: `User '${msg.to}' not found`,
                })
            );
            return true;
        }

        target.send(
            JSON.stringify({
                type: WS_TYPES.DM,
                from: ws.username,
                text: msg.text,
            })
        );

        return true;
    }

    // ---------------------------------
    // 4️⃣ ROOM JOIN
    // ---------------------------------
    if (msg.type === WS_TYPES.JOIN) {
        await leaveRoom(ws);
        ws.currentRoom = null;

        const room = await joinRoom(ws, msg.room);
        ws.currentRoom = room?.name ?? msg.room;

        ws.send(
            JSON.stringify({
                type: WS_TYPES.JOINED_ROOM,
                room: ws.currentRoom,
            })
        );

        return true;
    }

    // ---------------------------------
    // 5️⃣ ROOM MESSAGE
    // ---------------------------------
    if (msg.type === WS_TYPES.ROOM_MESSAGE) {
        const obj = {
            type: WS_TYPES.ROOM_MESSAGE,
            from: ws.username,
            room: ws.currentRoom,
            text: msg.text,
            time: Date.now(),
        };

        saveHistory(obj);
        if (ws.currentRoom) {
            broadcastRoom(ws.currentRoom, obj, ws);
        } else {
            broadcastExcept(wss, ws, obj);
        }
        return true;
    }

    // ---------------------------------
    // 6️⃣ GLOBAL BROADCAST CHAT
    // ---------------------------------
    if (msg.type === WS_TYPES.CHAT) {
        const obj = {
            type: WS_TYPES.CHAT,
            from: ws.username,
            text: msg.text,
            time: Date.now(),
        };

        saveHistory(obj);
        broadcastExcept(wss, ws, obj);
        return true;
    }

    return false;
}
