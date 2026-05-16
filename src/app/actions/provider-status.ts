"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProvider } from "@/lib/email-provider/factory";
import type { ProviderStatus } from "@/lib/email-provider/types";

export type { ProviderStatus } from "@/lib/email-provider/types";

export async function getProviderStatus(): Promise<ProviderStatus> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { level: "unconfigured", label: "Signed out", detail: "", provider: "ses" };
    }
    const provider = await getProvider();
    return provider.getStatus();
}
