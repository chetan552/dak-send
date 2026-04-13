import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import { headers } from "next/headers";
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin } from "./rate-limit";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Get client IP from request headers
                const headersList = await headers();
                const ip =
                    headersList.get("cf-connecting-ip") ||       // Cloudflare real IP
                    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
                    "unknown";

                // Check rate limit before touching the database
                const { allowed, retryAfterSeconds } = checkRateLimit(ip);
                if (!allowed) {
                    console.warn(`Login blocked for IP ${ip} — too many failed attempts. Retry after ${retryAfterSeconds}s`);
                    throw new Error(`Too many failed attempts. Try again in ${Math.ceil((retryAfterSeconds || 900) / 60)} minutes.`);
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    recordFailedAttempt(ip);
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password,
                );

                if (!isPasswordValid) {
                    recordFailedAttempt(ip);
                    return null;
                }

                // Successful login — clear any tracked failures for this IP
                recordSuccessfulLogin(ip);

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token) {
                session.user = {
                    ...session.user,
                    id: token.sub as string,
                    role: token.role as string,
                };
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
