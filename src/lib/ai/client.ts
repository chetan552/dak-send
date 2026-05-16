import { getAiAvailability } from "./config";

const BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL_DEFAULT || "deepseek-chat";
const REASONER_MODEL = process.env.DEEPSEEK_MODEL_REASONER || "deepseek-reasoner";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatOptions {
    brandId?: string | null;
    model?: "default" | "reasoner";
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
}

export class AiUnavailableError extends Error {
    constructor(public reason: "disabled_globally" | "disabled_for_brand" | "no_api_key") {
        super(`AI unavailable: ${reason}`);
    }
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const availability = await getAiAvailability(opts.brandId);
    if (!availability.available) throw new AiUnavailableError(availability.reason);

    const model = opts.model === "reasoner" ? REASONER_MODEL : DEFAULT_MODEL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);

    try {
        const res = await fetch(`${BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${availability.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.maxTokens ?? 1024,
                ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`);
        }

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("DeepSeek returned no content");
        return content;
    } finally {
        clearTimeout(timeout);
    }
}

export async function chatJson<T>(messages: ChatMessage[], opts: ChatOptions = {}): Promise<T> {
    const raw = await chat(messages, { ...opts, jsonMode: true });
    try {
        return JSON.parse(raw) as T;
    } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as T;
        throw new Error("DeepSeek returned non-JSON content");
    }
}
