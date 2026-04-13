import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import { headers } from "next/headers";
import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin } from "./rate-limit";
import { verifyTotpCode, matchRecoveryCode } from "./totp";

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
                totp: { label: "Code", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Get client IP from request headers
                const headersList = await headers();
                const ip =
                    headersList.get("cf-connecting-ip") ||
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
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        password: true,
                        totpEnabled: true,
                        totpSecret: true,
                        recoveryCodes: true,
                    },
                });

                if (!user) {
                    recordFailedAttempt(ip);
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) {
                    recordFailedAttempt(ip);
                    return null;
                }

                // ── 2FA check ────────────────────────────────────────────────
                // Determine if 2FA is required for this login
                const needsTwoFactor = user.totpEnabled;
                if (!needsTwoFactor) {
                    // Check global policy: if "required" and user hasn't set up 2FA,
                    // still allow login so they can reach the setup page.
                    const policySetting = await prisma.setting.findUnique({
                        where: { key: "twoFactor.policy" },
                    });
                    const policy = policySetting?.value ?? "optional";
                    if (policy === "required" && !user.totpEnabled) {
                        // Let them in — they'll be forced to set up 2FA on the settings page.
                        // (enforced via middleware or settings page redirect is out of scope here)
                    }
                }

                if (needsTwoFactor) {
                    const totpCode = credentials.totp?.trim();

                    if (!totpCode) {
                        // Signal the login form to show the 2FA step
                        throw new Error("2FA_REQUIRED");
                    }

                    // Try TOTP code first
                    const totpOk = user.totpSecret
                        ? verifyTotpCode(totpCode, user.totpSecret)
                        : false;

                    if (!totpOk) {
                        // Try recovery code
                        const recoveryIdx = await matchRecoveryCode(totpCode, user.recoveryCodes);
                        if (recoveryIdx === -1) {
                            recordFailedAttempt(ip);
                            throw new Error("Invalid authentication code.");
                        }
                        // Consume the recovery code (remove it from the array)
                        const updatedCodes = user.recoveryCodes.filter((_, i) => i !== recoveryIdx);
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { recoveryCodes: updatedCodes },
                        });
                    }
                }
                // ─────────────────────────────────────────────────────────────

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
