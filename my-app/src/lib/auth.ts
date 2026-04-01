import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as unknown as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        // Ensure username exists
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });

        if (dbUser && !dbUser.username) {
          const emailPrefix = dbUser.email?.split('@')[0];
          // Simple username generation, could conflict but good enough for demo
          const newUsername = `${emailPrefix}-${Math.floor(Math.random() * 1000)}`;
          await prisma.user.update({
            where: { id: user.id },
            data: { username: newUsername },
          });
          session.user.username = newUsername;
        } else if (dbUser) {
           session.user.username = dbUser.username;
        }
      }
      return session;
    },
  },
};
