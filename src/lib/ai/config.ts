import { prisma } from "@/lib/prisma";
export type { LlmProviderId } from "./providers";
export { LLM_PROVIDER_OPTIONS } from "./providers";
import type { LlmProviderId } from "./providers";

const GLOBAL_FLAG = "AI_ENABLED";
const PROVIDER_KEY = "LLM_PROVIDER";
const BRAND_FLAG_PREFIX = "BRAND_AI_ENABLED:";

export interface LlmProviderConfig {
    id: LlmProviderId;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
    /** Optional model for reasoning-heavy tasks (e.g. pre-send review). Falls back to defaultModel when null. */
    reasonerModel: string | null;
}

interface ProviderTemplate {
    id: LlmProviderId;
    label: string;
    baseUrl: string;
    apiKeySetting: string;          // Setting key holding the API key
    modelSetting: string;           // Setting key holding the user-overridden model
    defaultModelFallback: string;   // Used when modelSetting is unset
    reasonerSetting: string | null; // null = no reasoner model exposed
    reasonerFallback: string | null;
}

const PROVIDER_TEMPLATES: Record<LlmProviderId, ProviderTemplate> = {
    openai: {
        id: "openai",
        label: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKeySetting: "OPENAI_API_KEY",
        modelSetting: "OPENAI_MODEL",
        defaultModelFallback: "gpt-4o-mini",
        reasonerSetting: "OPENAI_REASONER_MODEL",
        reasonerFallback: null, // OpenAI defaults to the same model unless user opts in
    },
    deepseek: {
        id: "deepseek",
        label: "DeepSeek",
        baseUrl: "https://api.deepseek.com",
        apiKeySetting: "DEEPSEEK_API_KEY",
        modelSetting: "DEEPSEEK_MODEL",
        defaultModelFallback: "deepseek-chat",
        reasonerSetting: "DEEPSEEK_REASONER_MODEL",
        reasonerFallback: "deepseek-reasoner",
    },
    openrouter: {
        id: "openrouter",
        label: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKeySetting: "OPENROUTER_API_KEY",
        modelSetting: "OPENROUTER_MODEL",
        defaultModelFallback: "openai/gpt-4o-mini",
        reasonerSetting: "OPENROUTER_REASONER_MODEL",
        reasonerFallback: null,
    },
    groq: {
        id: "groq",
        label: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKeySetting: "GROQ_API_KEY",
        modelSetting: "GROQ_MODEL",
        defaultModelFallback: "llama-3.1-70b-versatile",
        reasonerSetting: null,
        reasonerFallback: null,
    },
    custom: {
        id: "custom",
        label: "Custom (self-hosted, LiteLLM, Azure OpenAI, etc.)",
        baseUrl: "", // resolved at runtime from AI_CUSTOM_BASE_URL
        apiKeySetting: "AI_CUSTOM_API_KEY",
        modelSetting: "AI_CUSTOM_MODEL",
        defaultModelFallback: "gpt-4o-mini",
        reasonerSetting: null,
        reasonerFallback: null,
    },
};

export type AiAvailability =
    | { available: true; provider: LlmProviderConfig }
    | { available: false; reason: "disabled_globally" | "disabled_for_brand" | "no_api_key" | "no_base_url" };

async function readSettings(keys: string[]) {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    return rows.reduce<Record<string, string>>((acc, r) => ({ ...acc, [r.key]: r.value }), {});
}

function readEnv(key: string): string {
    return process.env[key] || "";
}

/**
 * Pick the active provider. Honors the explicit `LLM_PROVIDER` setting first.
 * Legacy installs (DeepSeek-only era) that never set `LLM_PROVIDER` but do have
 * `DEEPSEEK_API_KEY` are migrated implicitly so AI keeps working.
 */
function resolveProviderId(settings: Record<string, string>): LlmProviderId {
    const raw = (settings[PROVIDER_KEY] || readEnv(PROVIDER_KEY)) as LlmProviderId | "";
    if (raw && raw in PROVIDER_TEMPLATES) return raw as LlmProviderId;

    // Migration path: pre-existing DeepSeek install with no LLM_PROVIDER set
    const hasDeepseekKey = (settings.DEEPSEEK_API_KEY || readEnv("DEEPSEEK_API_KEY")) !== "";
    if (hasDeepseekKey) return "deepseek";

    return "openai";
}

function buildProviderConfig(id: LlmProviderId, settings: Record<string, string>): { config: LlmProviderConfig | null; reason?: "no_api_key" | "no_base_url" } {
    const template = PROVIDER_TEMPLATES[id];
    const apiKey = settings[template.apiKeySetting] || readEnv(template.apiKeySetting);
    if (!apiKey) return { config: null, reason: "no_api_key" };

    let baseUrl = template.baseUrl;
    if (id === "custom") {
        baseUrl = (settings.AI_CUSTOM_BASE_URL || readEnv("AI_CUSTOM_BASE_URL")).trim().replace(/\/$/, "");
        if (!baseUrl) return { config: null, reason: "no_base_url" };
    }

    const defaultModel = (settings[template.modelSetting] || readEnv(template.modelSetting) || template.defaultModelFallback).trim();
    const reasonerModel = template.reasonerSetting
        ? (settings[template.reasonerSetting] || readEnv(template.reasonerSetting) || template.reasonerFallback || null)
        : template.reasonerFallback;

    return {
        config: {
            id,
            baseUrl,
            apiKey,
            defaultModel,
            reasonerModel: reasonerModel ? reasonerModel.trim() : null,
        },
    };
}

export async function getAiAvailability(brandId?: string | null): Promise<AiAvailability> {
    const baseKeys = [
        GLOBAL_FLAG,
        PROVIDER_KEY,
        "AI_CUSTOM_BASE_URL",
        ...Object.values(PROVIDER_TEMPLATES).flatMap((t) =>
            [t.apiKeySetting, t.modelSetting, t.reasonerSetting].filter((k): k is string => Boolean(k)),
        ),
    ];
    if (brandId) baseKeys.push(`${BRAND_FLAG_PREFIX}${brandId}`);
    const settings = await readSettings(baseKeys);

    if (settings[GLOBAL_FLAG] !== "true") return { available: false, reason: "disabled_globally" };
    if (brandId && settings[`${BRAND_FLAG_PREFIX}${brandId}`] === "false") {
        return { available: false, reason: "disabled_for_brand" };
    }

    const providerId = resolveProviderId(settings);
    const { config, reason } = buildProviderConfig(providerId, settings);
    if (!config) return { available: false, reason: reason || "no_api_key" };
    return { available: true, provider: config };
}

export async function isAiEnabledGlobal(): Promise<boolean> {
    const s = await readSettings([GLOBAL_FLAG]);
    return s[GLOBAL_FLAG] === "true";
}

export async function isAiEnabledForBrand(brandId: string): Promise<boolean> {
    const s = await readSettings([GLOBAL_FLAG, `${BRAND_FLAG_PREFIX}${brandId}`]);
    if (s[GLOBAL_FLAG] !== "true") return false;
    return s[`${BRAND_FLAG_PREFIX}${brandId}`] !== "false";
}

export async function setBrandAiEnabled(brandId: string, enabled: boolean) {
    const key = `${BRAND_FLAG_PREFIX}${brandId}`;
    await prisma.setting.upsert({
        where: { key },
        update: { value: enabled ? "true" : "false" },
        create: { key, value: enabled ? "true" : "false" },
    });
}

export type { ProviderTemplate };
