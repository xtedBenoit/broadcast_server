/** NEW: Save online users & chat history */
const chatHistoryByTenant = new Map();
const roomHistoryByTenant = new Map();

const MAX_HISTORY = 100;

const shouldUseDb = () => Boolean(process.env.MONGO_URI);
const toTenantKey = (tenantId) => tenantId || "public";

function getOrCreateChatHistory(tenantId) {
    const key = toTenantKey(tenantId);
    if (!chatHistoryByTenant.has(key)) {
        chatHistoryByTenant.set(key, []);
    }
    return chatHistoryByTenant.get(key);
}

function getOrCreateRoomHistoryMap(tenantId) {
    const key = toTenantKey(tenantId);
    if (!roomHistoryByTenant.has(key)) {
        roomHistoryByTenant.set(key, new Map());
    }
    return roomHistoryByTenant.get(key);
}

const normalizeMessage = (msgObj) => ({
    tenantId: msgObj.tenantId ?? "public",
    sender: msgObj.sender ?? msgObj.from ?? "Unknown",
    room: msgObj.room || null,
    content: msgObj.content ?? msgObj.text ?? "",
    type: msgObj.type,
    timestamp: msgObj.timestamp || Date.now(),
});

const saveMessage = async (msgObj) => {
    if (!shouldUseDb()) return;

    try {
        const { default: Message } = await import("../models/Message.js");
        const normalized = normalizeMessage(msgObj);
        await Message.create(normalized);
    } catch (err) {
        console.error("Error saving message to DB:", err);
    }
};

export async function getRoomMessages(room, tenantId = null) {
    if (!shouldUseDb()) return [];

    const { default: Message } = await import("../models/Message.js");
    return Message.find({ tenantId: toTenantKey(tenantId), room }).sort({ timestamp: 1 }).exec();
}

export function getRoomHistory(room, tenantId = null) {
    const roomHistory = getOrCreateRoomHistoryMap(tenantId);
    return roomHistory.get(room) || [];
}

export function saveHistory(msgObj) {
    if (msgObj.type === "room_message" || msgObj.type === "chat") {
        // Persist to DB if configured
        saveMessage(msgObj);
    }

    const tenantId = msgObj.tenantId ?? null;
    const chatHistory = getOrCreateChatHistory(tenantId);
    chatHistory.push(msgObj);
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

    if (msgObj.room) {
        const roomHistory = getOrCreateRoomHistoryMap(tenantId);
        const roomMessages = roomHistory.get(msgObj.room) || [];
        roomMessages.push(msgObj);
        if (roomMessages.length > MAX_HISTORY) roomMessages.shift();
        roomHistory.set(msgObj.room, roomMessages);
    }
}

export function getChatHistory(tenantId = null) {
    return getOrCreateChatHistory(tenantId);
}
