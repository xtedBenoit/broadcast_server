import mongoose from 'mongoose';
const { Schema } = mongoose;
const userSchemma = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'users' }, { timestamps: true });

export const User = mongoose.model('User', userSchemma);