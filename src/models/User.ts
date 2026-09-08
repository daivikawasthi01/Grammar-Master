import User from '@/app/db/schema';

// Re-export canonical User model to eliminate schema collision across mongoose.models.User
export default User;
