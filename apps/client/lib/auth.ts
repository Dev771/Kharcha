import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { apiClient } from './api-client';

const authConfig = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const result = await apiClient<{
            accessToken: string;
            user: {
              id: string;
              email: string;
              name: string;
              avatarUrl: string | null;
            };
          }>('/auth/login', {
            method: 'POST',
            body: {
              email: credentials.email,
              password: credentials.password,
            },
          });

          return {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            image: result.user.avatarUrl,
            accessToken: result.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],

  trustHost: true,

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/register');

      if (isOnAuth) return true;
      if (!isLoggedIn) return false;
      return true;
    },

    async signIn({ user, account }) {
      // For OAuth providers, create/find user in NestJS and get a JWT
      if (account?.provider === 'google' && user.email) {
        try {
          const result = await apiClient<{
            accessToken: string;
            user: { id: string };
          }>('/auth/oauth', {
            method: 'POST',
            body: {
              email: user.email,
              name: user.name || user.email.split('@')[0],
              image: user.image,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });

          // Attach the NestJS JWT and user ID to the user object
          // These will be picked up by the jwt callback
          (user as any).accessToken = result.accessToken;
          (user as any).id = result.user.id;
        } catch (err) {
          console.error('[auth] OAuth sync failed:', err);
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.userId = (user as any).id || user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session as any).accessToken = token.accessToken;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

export const handlers: typeof authConfig.handlers = authConfig.handlers;
export const signIn: typeof authConfig.signIn = authConfig.signIn;
export const signOut: typeof authConfig.signOut = authConfig.signOut;
export const auth: typeof authConfig.auth = authConfig.auth;
