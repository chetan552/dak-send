"use client";

import { useState } from "react";
import { Monitor, Smartphone, Mail } from "lucide-react";

const CLIENTS = [
    {
        id: "gmail",
        name: "Gmail",
        icon: "",
        wrapper: (html: string) => `
            <div style="font-family:'Google Sans',Roboto,Arial,sans-serif;max-width:100%;margin:0 auto;">
                <div style="background:#f6f8fc;padding:16px 16px 0;">
                    <div style="background:#fff;border-radius:8px 8px 0 0;padding:12px 16px;border-bottom:1px solid #e0e0e0;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                            <div style="width:32px;height:32px;border-radius:50%;background:#1a73e8;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:14px;flex-shrink:0;">N</div>
                            <div style="min-width:0;">
                                <div style="font-size:13px;font-weight:600;color:#202124;">Newsletter</div>
                                <div style="font-size:11px;color:#5f6368;">to me</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="background:#f6f8fc;padding:0 16px 16px;">
                    <div style="background:#fff;border-radius:0 0 8px 8px;padding:16px;overflow:hidden;font-size:14px;line-height:1.5;color:#202124;">
                        ${html}
                    </div>
                </div>
            </div>`,
    },
    {
        id: "outlook",
        name: "Outlook",
        icon: "",
        wrapper: (html: string) => `
            <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:100%;margin:0 auto;">
                <div style="background:#f3f3f3;padding:12px;">
                    <div style="background:#0078d4;color:white;padding:8px 16px;font-size:13px;font-weight:600;border-radius:4px 4px 0 0;">
                        ✉️ Newsletter — Inbox
                    </div>
                    <div style="background:white;padding:16px;border:1px solid #e1e1e1;border-top:none;">
                        <div style="border-bottom:1px solid #e1e1e1;padding-bottom:10px;margin-bottom:12px;">
                            <div style="font-size:14px;font-weight:600;color:#252423;">Newsletter</div>
                            <div style="font-size:12px;color:#605e5c;">To: you@example.com</div>
                        </div>
                        <div style="font-size:14px;line-height:1.5;color:#252423;word-break:break-word;">
                            ${html}
                        </div>
                    </div>
                </div>
            </div>`,
    },
    {
        id: "apple",
        name: "Apple Mail",
        icon: "",
        wrapper: (html: string) => `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:100%;margin:0 auto;">
                <div style="background:#f5f5f7;padding:12px;">
                    <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                        <div style="padding:14px 16px;border-bottom:1px solid #e5e5ea;">
                            <div style="font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:2px;">Newsletter</div>
                            <div style="font-size:12px;color:#86868b;">To: you@example.com</div>
                        </div>
                        <div style="padding:16px;font-size:14px;line-height:1.6;color:#1d1d1f;word-break:break-word;">
                            ${html}
                        </div>
                    </div>
                </div>
            </div>`,
    },
];

interface EmailPreviewProps {
    html: string;
    subject?: string;
}

export function EmailPreview({ html, subject }: EmailPreviewProps) {
    const [activeClient, setActiveClient] = useState("gmail");
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

    const client = CLIENTS.find(c => c.id === activeClient) || CLIENTS[0];
    const wrappedHtml = client.wrapper(html);

    const isMobile = viewMode === "mobile";
    const iframeHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:16px;background:#fafafa;}
img{max-width:100%!important;height:auto!important;}
table{max-width:100%!important;width:100%!important;}
td,th{word-break:break-word!important;overflow-wrap:break-word!important;}
*{box-sizing:border-box!important;}
div,td,th,p,h1,h2,h3,h4,h5,h6,span,a{word-break:break-word!important;overflow-wrap:break-word!important;}
${isMobile ? `
/* Force all fixed-width elements to be fluid in mobile preview */
body *[width]{max-width:100%!important;}
table[width]{width:100%!important;}
td[width]{width:auto!important;}
h1,h2,h3{font-size:clamp(16px,5vw,24px)!important;max-width:100%!important;}
p,span,div,td{max-width:100%!important;}
img{width:auto!important;max-width:100%!important;}
.container,#container,[class*="container"]{width:100%!important;max-width:100%!important;}
` : ''}
</style>
</head><body>${wrappedHtml}</body></html>`;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Client tabs */}
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                    {CLIENTS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveClient(c.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeClient === c.id
                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                }`}
                        >
                            <span>{c.icon}</span> {c.name}
                        </button>
                    ))}
                </div>

                {/* Device toggle */}
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode("desktop")}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === "desktop" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""}`}
                    >
                        <Monitor className={`w-4 h-4 ${viewMode === "desktop" ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`} />
                    </button>
                    <button
                        onClick={() => setViewMode("mobile")}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === "mobile" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""}`}
                    >
                        <Smartphone className={`w-4 h-4 ${viewMode === "mobile" ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`} />
                    </button>
                </div>
            </div>

            {/* Preview frame */}
            <div className="flex justify-center">
                <div
                    className={`relative border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white transition-all duration-300 ${viewMode === "mobile"
                        ? "w-[375px] rounded-[2.5rem] shadow-[0_0_0_8px_#27272a,0_0_0_10px_#3f3f46] ring-1 ring-zinc-600"
                        : "w-full max-w-[720px] rounded-xl shadow-sm"
                        }`}
                >
                    {/* Browser chrome / status bar */}
                    {viewMode === "mobile" ? (
                        <div className="flex items-center justify-center px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <div className="w-20 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                            <div className="flex-1 mx-3 px-2 py-0.5 rounded bg-white/60 dark:bg-zinc-700 text-[10px] text-zinc-400 text-center font-mono truncate flex items-center justify-center gap-1">
                                <Mail className="w-3 h-3" /> {client.name} — {subject || "Email Preview"}
                            </div>
                        </div>
                    )}

                    <iframe
                        srcDoc={iframeHtml}
                        className="w-full border-0"
                        style={{ height: viewMode === "mobile" ? "667px" : "500px" }}
                        sandbox="allow-same-origin"
                        title={`${client.name} preview`}
                    />

                    {/* Mobile home bar */}
                    {viewMode === "mobile" && (
                        <div className="flex items-center justify-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                            <div className="w-28 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
