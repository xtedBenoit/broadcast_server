import { WS_TYPES } from "../core/wsTypes.js";
import { joinRoom, leaveRoom } from "../services/roomService.js";
import { addOnlineUser, getOnlineUsers, getUsersForRoom } from "../services/userService.js";
import { saveHistory, getChatHistory } from "../services/messageService.js";
import { broadcastExcept, broadcastAll, broadcastRoom } from "../core/wsHelper.js";

function sendError(ws, message) {
    ws.send(JSON.stringify({ type: WS_TYPES.ERROR, message }));
}

async function handleSetUsername({ wss, ws, msg }) {
    ws.username = msg.username || "Anonymous";
    addOnlineUser(ws.tenantId, ws.username);

    if (ws.currentRoom) {
        ws.send(
            JSON.stringify({
                type: WS_TYPES.CHAT_HISTORY,
                history: getChatHistory(ws.tenantId),
            })
        );
    }

    let users = [];
    try {
        users = await getUsersForRoom(ws.tenantId, ws.currentRoom);
    } catch {
        users = getOnlineUsers(ws.tenantId);
    }

    broadcastAll(wss, {
        type: WS_TYPES.ONLINE_USERS,
        users,
    }, ws.tenantId);

    if (ws.currentRoom) {
        broadcastRoom(
            wss,
            ws.currentRoom,
            {
                type: WS_TYPES.USER_JOINED,
                username: ws.username,
            },
            ws,
            ws.tenantId
        );
    } else {
        broadcastExcept(wss, ws, {
            type: WS_TYPES.USER_JOINED,
            username: ws.username,
        }, ws.tenantId);
    }
}

function handleTyping({ wss, ws, msg }) {
    broadcastExcept(wss, ws, {
        type: WS_TYPES.USER_TYPING,
        username: ws.username,
        status: msg.status, // true = typing, false = stopped
    }, ws.tenantId);
}

function handleDm({ wss, ws, msg }) {
    const target = [...wss.clients].find(
        (c) => c.username === msg.to && c.tenantId === ws.tenantId
    );

    if (!target) {
        sendError(ws, `User '${msg.to}' not found`);
        return;
    }

    target.send(
        JSON.stringify({
            type: WS_TYPES.DM,
            from: ws.username,
            text: msg.text,
        })
    );
}

async function handleJoin({ ws, msg }) {
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
}

function handleRoomMessage({ wss, ws, msg }) {
    const obj = {
        type: WS_TYPES.ROOM_MESSAGE,
        tenantId: ws.tenantId,
        from: ws.username,
        room: ws.currentRoom,
        text: msg.text,
        time: Date.now(),
    };

    saveHistory(obj);
    if (ws.currentRoom) {
        broadcastRoom(wss, ws.currentRoom, obj, ws, ws.tenantId);
    } else {
        broadcastExcept(wss, ws, obj, ws.tenantId);
    }
}

function handleChat({ wss, ws, msg }) {
    const obj = {
        type: WS_TYPES.CHAT,
        tenantId: ws.tenantId,
        from: ws.username,
        text: msg.text,
        time: Date.now(),
    };

    saveHistory(obj);
    broadcastExcept(wss, ws, obj, ws.tenantId);
}

export async function handleMessage({ wss, ws, msg }) {
    if (msg.type !== WS_TYPES.SET_USERNAME && !ws.username) {
        sendError(ws, "Set username first");
        return true;
    }

    switch (msg.type) {
        case WS_TYPES.SET_USERNAME:
            await handleSetUsername({ wss, ws, msg });
            return true;
        case WS_TYPES.TYPING:
            handleTyping({ wss, ws, msg });
            return true;
        case WS_TYPES.DM:
            handleDm({ wss, ws, msg });
            return true;
        case WS_TYPES.JOIN:
            await handleJoin({ ws, msg });
            return true;
        case WS_TYPES.ROOM_MESSAGE:
            handleRoomMessage({ wss, ws, msg });
            return true;
        case WS_TYPES.CHAT:
            handleChat({ wss, ws, msg });
            return true;
        default:
            return false;
    }
}
