import { authenticator } from "@otplib/preset-default";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";

authenticator.options = { window: 1 }; // allow ±30s clock skew

export function generateTotpSecret(): string {
    return authenticator.generateSecret();
}

export function generateTotpUri(email: string, secret: string): string {
    return authenticator.keyuri(email, "DakSend", secret);
}

export async function generateQRCodeDataUrl(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, { margin: 1, width: 200 });
}

export function verifyTotpCode(token: string, secret: string): boolean {
    try {
        return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
    } catch {
        return false;
    }
}

export function generateRecoveryCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
        const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
        // Format as XXXXX-XXXXX for readability
        return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((c) => bcrypt.hash(normalizeCode(c), 10)));
}

/** Returns the index of the matching hashed code, or -1 if none match. */
export async function matchRecoveryCode(
    input: string,
    hashed: string[]
): Promise<number> {
    const normalized = normalizeCode(input);
    for (let i = 0; i < hashed.length; i++) {
        if (await bcrypt.compare(normalized, hashed[i])) return i;
    }
    return -1;
}

function normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[\s-]/g, "");
}
