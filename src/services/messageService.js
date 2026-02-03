/** NEW: Save online users & chat history */
const chatHistory = [];  

const MAX_HISTORY = 100;

import Message from '../models/Message.js';

const saveMessage = (msgObj) => {
    Message.create({
        sender: msgObj.sender,
        room: msgObj.room || null,
        content: msgObj.content,
        type: msgObj.type,
        timestamp: msgObj.timestamp || Date.now()
    }).catch(err => {
        console.error("Error saving message to DB:", err);
    });
}

export function getRoomMessages(room) {
    return Message.find({ room }).sort({ timestamp: 1 }).exec();
}

export function getRoomHistory(room) {
    return stockedMessages[room] || [];
}

export function saveHistory(msgObj) {
    if(msgObj.type === "room_message" || msgObj.type === "chat") {
        // Stock room messages separately
        saveMessage(msgObj);
    }

    chatHistory.push(msgObj);
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
}

export function getChatHistory() {
    return chatHistory;
}