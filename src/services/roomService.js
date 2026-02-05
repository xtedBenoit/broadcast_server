/** Room system */
import Room from "../models/Room.js";

export function getRooms() {
    const rooms = Room.find();
    return rooms;
}

/** Join room helper */
export async function joinRoom(ws, room) {
    const existingRoom = await Room.findOne({ name: room });
    const activeRoom = existingRoom ?? (await Room.create({ name: room }));

    activeRoom.members.push({ username: ws.username, joinedAt: Date.now() });
    await activeRoom.save();

    return activeRoom;
}

/** Leave room helper */
export async function leaveRoom(ws) {
    if (!ws.currentRoom) return;

    const room = await Room.findOne({ name: ws.currentRoom });
    if (room) {
        room.members = room.members.filter(m => m.username !== ws.username);
        await room.save();
    }
    
}

