const onlineUsers = new Set();
import Room from "../models/Room.js";
import User from "../models/User.js";


export function addOnlineUser(username) {
    onlineUsers.add(username);
}

export function removeInlineUser(username) {
    onlineUsers.delete(username);
}

export function getOnlineUsers() {
    return [...onlineUsers];
}

export async function getUsersForRoom(room) {
    const roomData = await Room.findOne({ name: room }).exec();
    if(!roomData) return [];

    const usernames = roomData.members.map(m => m.username);
    const users = await User.find({ username: { $in: usernames } }).exec();
    return users;
}

export async function welcomeNewUserInRoom(ws) {
    if (!ws.currentRoom) return;
    const room = await Room.findOne({ name: ws.currentRoom });
    if (!room) return;
    const usernames = room.members.map(m => m.username);
    const users = await User.find({ username: { $in: usernames } }).exec();
    return users;
}
