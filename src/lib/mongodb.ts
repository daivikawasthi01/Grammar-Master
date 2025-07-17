import mongoose from 'mongoose';

// Ensure the environment variable exists
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('⚠️ Please define the MONGODB_URI environment variable in your .env.local file');
}

// Define a global cache for the MongoDB connection to prevent reconnecting
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
    // Return existing connection if available
    if (cached.conn) return cached.conn;

    // Otherwise, create a new connection
    if (!cached.promise) {
        const options = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, options).then((mongooseInstance) => {
            return mongooseInstance;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn;
}

export default dbConnect;
