/** NEW: Save online users & chat history */
const chatHistory = [];
const roomHistory = new Map();

const MAX_HISTORY = 100;

const shouldUseDb = () => Boolean(process.env.MONGO_URI);

const normalizeMessage = (msgObj) => ({
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

export async function getRoomMessages(room) {
    if (!shouldUseDb()) return [];

    const { default: Message } = await import("../models/Message.js");
    return Message.find({ room }).sort({ timestamp: 1 }).exec();
}

export function getRoomHistory(room) {
    return roomHistory.get(room) || [];
}

export function saveHistory(msgObj) {
    if (msgObj.type === "room_message" || msgObj.type === "chat") {
        // Persist to DB if configured
        saveMessage(msgObj);
    }

    chatHistory.push(msgObj);
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

    if (msgObj.room) {
        const roomMessages = roomHistory.get(msgObj.room) || [];
        roomMessages.push(msgObj);
        if (roomMessages.length > MAX_HISTORY) roomMessages.shift();
        roomHistory.set(msgObj.room, roomMessages);
    }
}

export function getChatHistory() {
    return chatHistory;
}
