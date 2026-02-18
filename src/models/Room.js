import mongoose from "mongoose";
const { Schema } = mongoose;

const roomSchema = new Schema({
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    members: { type: [Object], default: [] },
    createdAt: { type: Date, default: Date.now }
}, { collection: "rooms", timestamps: true });

roomSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
