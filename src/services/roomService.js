/** Room system */
import { Room } from '../models/Room.js';

export function getRooms() {
    const rooms = Room.find();
    return rooms;
}

/** Join room helper */
export async function joinRoom(ws, room) {
    const createdRoom = null;

    const findedRoom = await Room.findOne({ name: room });
    if (!findedRoom) {
        createdRoom = await Room.create({ name: room });
    }

    createdRoom.members.push({ username: ws.username, joinedAt: Date.now() });
    
    await createdRoom.save();

    return createdRoom;
   
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

