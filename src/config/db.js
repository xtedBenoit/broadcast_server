import mongoose from "mongoose";


export async function connectMongo(uri) {
    if (!uri) return;
    try {
        await mongoose.connect(uri);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    }
}