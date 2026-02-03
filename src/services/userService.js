const onlineUsers = new Set();


export function addOnlineUser(username) {
    onlineUsers.add(username);
}

export function removeInlineUser(username) {
    onlineUsers.delete(username);
}

export function getOnlineUsers() {
    return [...onlineUsers];
}
