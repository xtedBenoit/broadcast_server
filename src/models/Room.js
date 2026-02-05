import mongoose from "mongoose";
const { Schema } = mongoose;

const roomSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    members: { type: [Object], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { collection: "rooms", timestamps: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
