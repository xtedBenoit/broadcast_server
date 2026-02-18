import { WS_TYPES } from "../core/wsTypes.js";
import { removeInlineUser, getOnlineUsers } from "../services/userService.js";
import { leaveRoom } from "../services/roomService.js";
import { broadcastAll } from "../core/wsHelper.js";
import { handleMessage } from "./messageHandlers.js";

export function attachConnectionHandlers(wss) {
    wss.on("connection", (ws) => {
        console.log("Client connected");

        ws.isAlive = true;
        ws.currentRoom = null;
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", async (data) => {
            let msg;
            try {
                msg = JSON.parse(data);
            } catch {
                ws.send(JSON.stringify({ type: WS_TYPES.ERROR, message: "Invalid JSON" }));
                return;
            }

            await handleMessage({ wss, ws, msg });
        });

        ws.on("close", async () => {
            if (ws.username) {
                removeInlineUser(ws.tenantId, ws.username);

                // Notify everyone
                broadcastAll(wss, {
                    type: WS_TYPES.ONLINE_USERS,
                    users: getOnlineUsers(ws.tenantId),
                }, ws.tenantId);

                broadcastAll(wss, {
                    type: WS_TYPES.USER_LEFT,
                    username: ws.username,
                }, ws.tenantId);
            }

            await leaveRoom(ws);
        });
    });
}
