// Languages that can be assigned to a brand as the default target for AI
// translation. Keep the list curated — translation quality on niche languages
// from the underlying LLM tends to be uneven, and the dropdown shouldn't be
// a 200-entry wall.
export interface BrandLanguage {
    code: string; // BCP-47 base tag
    label: string; // Shown in the UI
    nativeName: string; // What translated copy should sound like
}

export const BRAND_LANGUAGES: BrandLanguage[] = [
    { code: "en", label: "English", nativeName: "English" },
    { code: "es", label: "Spanish", nativeName: "Español" },
    { code: "fr", label: "French", nativeName: "Français" },
    { code: "de", label: "German", nativeName: "Deutsch" },
    { code: "it", label: "Italian", nativeName: "Italiano" },
    { code: "pt", label: "Portuguese", nativeName: "Português" },
    { code: "pt-BR", label: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
    { code: "nl", label: "Dutch", nativeName: "Nederlands" },
    { code: "sv", label: "Swedish", nativeName: "Svenska" },
    { code: "no", label: "Norwegian", nativeName: "Norsk" },
    { code: "da", label: "Danish", nativeName: "Dansk" },
    { code: "fi", label: "Finnish", nativeName: "Suomi" },
    { code: "pl", label: "Polish", nativeName: "Polski" },
    { code: "ru", label: "Russian", nativeName: "Русский" },
    { code: "uk", label: "Ukrainian", nativeName: "Українська" },
    { code: "tr", label: "Turkish", nativeName: "Türkçe" },
    { code: "ar", label: "Arabic", nativeName: "العربية" },
    { code: "he", label: "Hebrew", nativeName: "עברית" },
    { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
    { code: "bn", label: "Bengali", nativeName: "বাংলা" },
    { code: "ta", label: "Tamil", nativeName: "தமிழ்" },
    { code: "te", label: "Telugu", nativeName: "తెలుగు" },
    { code: "mr", label: "Marathi", nativeName: "मराठी" },
    { code: "ml", label: "Malayalam", nativeName: "മലയാളം" },
    { code: "kn", label: "Kannada", nativeName: "ಕನ್ನಡ" },
    { code: "gu", label: "Gujarati", nativeName: "ગુજરાતી" },
    { code: "pa", label: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
    { code: "ur", label: "Urdu", nativeName: "اردو" },
    { code: "zh-CN", label: "Chinese (Simplified)", nativeName: "简体中文" },
    { code: "zh-TW", label: "Chinese (Traditional)", nativeName: "繁體中文" },
    { code: "ja", label: "Japanese", nativeName: "日本語" },
    { code: "ko", label: "Korean", nativeName: "한국어" },
    { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
    { code: "th", label: "Thai", nativeName: "ไทย" },
    { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
    { code: "ms", label: "Malay", nativeName: "Bahasa Melayu" },
    { code: "fil", label: "Filipino", nativeName: "Filipino" },
    { code: "sw", label: "Swahili", nativeName: "Kiswahili" },
    { code: "el", label: "Greek", nativeName: "Ελληνικά" },
    { code: "cs", label: "Czech", nativeName: "Čeština" },
    { code: "ro", label: "Romanian", nativeName: "Română" },
    { code: "hu", label: "Hungarian", nativeName: "Magyar" },
];

const BY_CODE = new Map(BRAND_LANGUAGES.map((l) => [l.code, l]));

export function getBrandLanguage(code: string | null | undefined): BrandLanguage | null {
    if (!code) return null;
    return BY_CODE.get(code) || null;
}

export function isSupportedLanguageCode(code: string): boolean {
    return BY_CODE.has(code);
}
