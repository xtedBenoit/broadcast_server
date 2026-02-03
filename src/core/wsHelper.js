import { getRooms } from '../services/roomService.js';

const rooms = getRooms();

/** Broadcast helpers */
export function broadcastExcept(wss, sender, obj) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (c !== sender && c.readyState === c.OPEN) {
            c.send(msg);
        }
    });
}

export function broadcastAll(wss, obj) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (c.readyState === c.OPEN) c.send(msg);
    });
}

export function broadcastRoom(room, obj, except = null) {
    if (!rooms.has(room)) return;

    const msg = JSON.stringify(obj);
    rooms.get(room).forEach(c => {
        if (c !== except && c.readyState === c.OPEN) c.send(msg);
    });
}

