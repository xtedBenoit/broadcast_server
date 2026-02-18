/** Broadcast helpers */
export function broadcastExcept(wss, sender, obj, tenantId = null) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (tenantId && c.tenantId !== tenantId) return;
        if (c !== sender && c.readyState === c.OPEN) {
            c.send(msg);
        }
    });
}

export function broadcastAll(wss, obj, tenantId = null) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (tenantId && c.tenantId !== tenantId) return;
        if (c.readyState === c.OPEN) c.send(msg);
    });
}

export function broadcastRoom(wss, room, obj, except = null, tenantId = null) {
    const msg = JSON.stringify(obj);
    wss.clients.forEach(c => {
        if (tenantId && c.tenantId !== tenantId) return;
        if (c.currentRoom !== room) return;
        if (c !== except && c.readyState === c.OPEN) c.send(msg);
    });
}

