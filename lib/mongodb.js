import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Configure mongoose connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false,
  connectTimeoutMS: 10000, // Reduce timeout to 10 seconds
  socketTimeoutMS: 45000, // Socket timeout
  family: 4 // Use IPv4, skip trying IPv6
};

// Cache the mongoose connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      ...options,
      bufferCommands: false,
    };

    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e;
  }
}

export default dbConnect; 