import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Define the cached type properly
let cached: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
} = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            retryReads: true,
            connectTimeoutMS: 10000,
        };

        try {
            cached.promise = mongoose.connect(MONGODB_URI, opts);
        } catch (error) {
            console.error('MongoDB initial connection error:', error);
            cached.promise = null;
            throw error;
        }
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (e) {
        cached.promise = null;
        console.error('MongoDB connection error:', e);
        throw new Error('Failed to connect to MongoDB');
    }
}

export default dbConnect; 