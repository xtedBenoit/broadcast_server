import mongoose from "mongoose";
const { Schema } = mongoose;

const messageSchema = new Schema({
    sender: { type: String, required: true },
    room: { type: String, required: false },
    type: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { collection: "messages", timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
