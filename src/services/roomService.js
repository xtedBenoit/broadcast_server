import Room from "../models/Room.js";

/** Join room helper */
export async function joinRoom(ws, room) {
    const existingRoom = await Room.findOne({ tenantId: ws.tenantId, name: room });
    const activeRoom =
        existingRoom ?? (await Room.create({ tenantId: ws.tenantId, name: room }));

    const alreadyMember = activeRoom.members.some((m) => m.username === ws.username);
    if (!alreadyMember) {
        activeRoom.members.push({ username: ws.username, joinedAt: Date.now() });
    }
    await activeRoom.save();

    return activeRoom;
}

/** Leave room helper */
export async function leaveRoom(ws) {
    if (!ws.currentRoom) return;

    const room = await Room.findOne({ tenantId: ws.tenantId, name: ws.currentRoom });
    if (room) {
        room.members = room.members.filter((m) => m.username !== ws.username);
        await room.save();
    }
    
}

