import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'Untitled Document',
        required: true,
        trim: true
    },
    text: {
        type: String,
        default: '',
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'Work', 'archived'],
        default: 'created'
    },
    language: {
        type: String,
        default: 'American English'
    },
    version: {
        type: Number,
        default: () => Date.now(),
        required: true
    },
    lastSaved: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    optimisticConcurrency: true
});

// Add index for faster document lookups
documentSchema.index({ _id: 1, version: 1 });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Don't include password by default in queries
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    plan: {
        type: String,
        enum: ['free', 'premium', 'business'],
        default: 'free'
    },
    prompts: {
        type: Number,
        default: 0
    },
    documents: [documentSchema],
    trashs: [documentSchema]
}, { timestamps: true });

// Add index for email
userSchema.index({ email: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;