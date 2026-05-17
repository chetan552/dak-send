export type LlmProviderId = "openai" | "deepseek" | "openrouter" | "groq" | "custom";

export const LLM_PROVIDER_OPTIONS: ReadonlyArray<{
    id: LlmProviderId;
    label: string;
    tagline: string;
    modelHint: string;
    privacyNote?: string;
}> = [
    { id: "openai", label: "OpenAI", tagline: "Native gpt-4o models. The default.", modelHint: "gpt-4o-mini" },
    { id: "openrouter", label: "OpenRouter", tagline: "One key, hundreds of models (Claude, Llama, Gemini).", modelHint: "openai/gpt-4o-mini" },
    { id: "groq", label: "Groq", tagline: "Very fast Llama / Mixtral inference.", modelHint: "llama-3.1-70b-versatile" },
    { id: "deepseek", label: "DeepSeek", tagline: "Cheap, includes a reasoner model.", modelHint: "deepseek-chat", privacyNote: "DeepSeek's API runs in China. Use the per-brand AI toggle for privacy-sensitive brands." },
    { id: "custom", label: "Custom", tagline: "Any OpenAI-compatible endpoint (Ollama, LiteLLM, Azure OpenAI).", modelHint: "your-model" },
];
