// Shared types and constants for signup forms
// Not a "use server" file, so it can export plain values

export const DEFAULT_FORM_CONFIG = {
    headline: "Join our newsletter",
    description: "Get the latest updates delivered to your inbox.",
    buttonText: "Subscribe",
    successMessage: "Thanks for subscribing! Check your inbox to confirm.",
    bgColor: "#ffffff",
    accentColor: "#4f46e5",
    textColor: "#111827",
    layout: "centered" as const,
    collectName: true,
    showBranding: true,
    customCss: "",
    fields: [] as { name: string; label: string; type: string; required: boolean }[],
    redirectUrl: "",
};

export type FormConfig = typeof DEFAULT_FORM_CONFIG;
