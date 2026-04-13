"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    generateTotpSecret,
    generateTotpUri,
    generateQRCodeDataUrl,
    verifyTotpCode,
    generateRecoveryCodes,
    hashRecoveryCodes,
    matchRecoveryCode,
} from "@/lib/totp";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Not authenticated");
    return session;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

/** Generate a new TOTP secret and return QR code + manual key. Does NOT enable 2FA yet. */
export async function initiate2FASetup() {
    const session = await requireSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!user) throw new Error("User not found");

    const secret = generateTotpSecret();
    const uri = generateTotpUri(user.email, secret);
    const qrCode = await generateQRCodeDataUrl(uri);

    // Store secret (not yet enabled — enable2FA confirms it)
    await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: secret, totpEnabled: false },
    });

    return { secret, qrCode };
}

/** Confirm setup: verify the code from the authenticator app, then mark 2FA enabled. */
export async function enable2FA(code: string) {
    const session = await requireSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true },
    });
    if (!user?.totpSecret) throw new Error("Start setup again — no pending secret found.");

    if (!verifyTotpCode(code, user.totpSecret)) {
        throw new Error("Incorrect code. Make sure your device clock is synced.");
    }

    const plainCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(plainCodes);

    await prisma.user.update({
        where: { id: userId },
        data: { totpEnabled: true, recoveryCodes: hashedCodes },
    });

    revalidatePath("/dashboard/settings");
    return { recoveryCodes: plainCodes };
}

// ─── Disable ──────────────────────────────────────────────────────────────────

/** Disable 2FA. Requires either a valid TOTP code or a recovery code + current password. */
export async function disable2FA(password: string, code: string) {
    const session = await requireSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, totpSecret: true, totpEnabled: true, recoveryCodes: true },
    });
    if (!user) throw new Error("User not found");
    if (!user.totpEnabled) throw new Error("2FA is not enabled");

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) throw new Error("Incorrect password");

    const totpOk = user.totpSecret ? verifyTotpCode(code, user.totpSecret) : false;
    const recoveryIdx = totpOk ? -1 : await matchRecoveryCode(code, user.recoveryCodes);

    if (!totpOk && recoveryIdx === -1) {
        throw new Error("Invalid authentication code");
    }

    await prisma.user.update({
        where: { id: userId },
        data: { totpEnabled: false, totpSecret: null, recoveryCodes: [] },
    });

    revalidatePath("/dashboard/settings");
}

// ─── Recovery codes ───────────────────────────────────────────────────────────

export async function regenerateRecoveryCodes(code: string) {
    const session = await requireSession();
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true, totpEnabled: true },
    });
    if (!user?.totpEnabled || !user.totpSecret) throw new Error("2FA is not enabled");
    if (!verifyTotpCode(code, user.totpSecret)) throw new Error("Invalid code");

    const plainCodes = generateRecoveryCodes();
    const hashedCodes = await hashRecoveryCodes(plainCodes);

    await prisma.user.update({
        where: { id: userId },
        data: { recoveryCodes: hashedCodes },
    });

    return { recoveryCodes: plainCodes };
}

// ─── Policy (admin only) ──────────────────────────────────────────────────────

export type TwoFactorPolicy = "off" | "optional" | "required";

export async function get2FAPolicy(): Promise<TwoFactorPolicy> {
    const setting = await prisma.setting.findUnique({ where: { key: "twoFactor.policy" } });
    return (setting?.value as TwoFactorPolicy) ?? "optional";
}

export async function set2FAPolicy(policy: TwoFactorPolicy) {
    const session = await requireSession();
    if (session.user.role !== "admin") throw new Error("Unauthorized");

    await prisma.setting.upsert({
        where: { key: "twoFactor.policy" },
        update: { value: policy },
        create: { key: "twoFactor.policy", value: policy },
    });

    revalidatePath("/dashboard/settings");
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function get2FAStatus() {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { totpEnabled: true, recoveryCodes: true },
    });
    return {
        enabled: user?.totpEnabled ?? false,
        recoveryCodesLeft: user?.recoveryCodes.length ?? 0,
    };
}
