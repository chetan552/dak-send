import { getAiAvailability, type LlmProviderConfig } from "./config";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatOptions {
    brandId?: string | null;
    /** "default" uses provider.defaultModel; "reasoner" uses provider.reasonerModel if defined, otherwise falls back to default. */
    model?: "default" | "reasoner";
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
}

export class AiUnavailableError extends Error {
    constructor(public reason: "disabled_globally" | "disabled_for_brand" | "no_api_key" | "no_base_url") {
        super(`AI unavailable: ${reason}`);
    }
}

function pickModel(provider: LlmProviderConfig, choice: ChatOptions["model"]): string {
    if (choice === "reasoner" && provider.reasonerModel) return provider.reasonerModel;
    return provider.defaultModel;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const availability = await getAiAvailability(opts.brandId);
    if (!availability.available) throw new AiUnavailableError(availability.reason);

    const provider = availability.provider;
    const model = pickModel(provider, opts.model);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);

    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
        };
        // OpenRouter recommends a Referer + title so apps appear in their dashboard. Best-effort.
        if (provider.id === "openrouter") {
            headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://github.com/chetan552/dak-send";
            headers["X-Title"] = "DakSend";
        }

        // OpenAI's gpt-5 / o-series models reject `max_tokens` and require
        // `max_completion_tokens`. Newer OpenAI chat models accept both, so
        // for the openai provider we always send the new name. Other
        // OpenAI-compatible providers (DeepSeek, OpenRouter, Groq) still
        // expect the legacy `max_tokens`.
        const tokenLimit = opts.maxTokens ?? 1024;
        const tokenParam = provider.id === "openai"
            ? { max_completion_tokens: tokenLimit }
            : { max_tokens: tokenLimit };

        const res = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                model,
                messages,
                temperature: opts.temperature ?? 0.7,
                ...tokenParam,
                ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`${provider.id} ${res.status}: ${body.slice(0, 300)}`);
        }

        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error(`${provider.id} returned no content`);
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
        throw new Error("LLM returned non-JSON content");
    }
}
