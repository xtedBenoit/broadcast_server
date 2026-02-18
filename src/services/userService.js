const onlineUsersByTenant = new Map();
import Room from "../models/Room.js";
import User from "../models/User.js";


function toTenantKey(tenantId) {
    return tenantId || "public";
}

function getOrCreateTenantSet(tenantId) {
    const key = toTenantKey(tenantId);
    if (!onlineUsersByTenant.has(key)) {
        onlineUsersByTenant.set(key, new Set());
    }
    return onlineUsersByTenant.get(key);
}

export function addOnlineUser(tenantId, username) {
    getOrCreateTenantSet(tenantId).add(username);
}

export function removeInlineUser(tenantId, username) {
    const users = getOrCreateTenantSet(tenantId);
    users.delete(username);
}

export function getOnlineUsers(tenantId) {
    return [...getOrCreateTenantSet(tenantId)];
}

export async function getUsersForRoom(tenantId, room) {
    const roomData = await Room.findOne({ tenantId, name: room }).exec();
    if (!roomData) return [];

    // Only expose usernames to clients.
    return roomData.members.map((m) => m.username);
}

export async function welcomeNewUserInRoom(ws) {
    if (!ws.currentRoom) return;
    const room = await Room.findOne({ tenantId: ws.tenantId, name: ws.currentRoom });
    if (!room) return;
    const usernames = room.members.map((m) => m.username);
    const users = await User.find({ username: { $in: usernames } }).exec();
    return users;
}
