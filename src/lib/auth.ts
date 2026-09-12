import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthOptions } from 'next-auth';
import User from '@/app/db/schema';
import dbConnect from './mongodb';
import bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'writ-ai-build-secret-key-fallback',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();

        const user = await User.findOne({ email: credentials?.email }).select('+password');
        if (!user || !credentials?.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: user._id.toString(), email: user.email, name: user.name };
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user = token.user;
      return session;
    }
  }
};
