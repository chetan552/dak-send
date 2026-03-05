import { getSignupFormBySlug, incrementFormViews } from "@/app/actions/signup-form";
import { notFound } from "next/navigation";
import { PublicSignupForm } from "@/components/forms/public-signup-form";

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const form = await getSignupFormBySlug(slug);

    if (!form || form.status !== "active") return notFound();

    // Increment views
    await incrementFormViews(form.id);

    const config = {
        headline: "Join our newsletter",
        description: "Get the latest updates delivered to your inbox.",
        buttonText: "Subscribe",
        successMessage: "Thanks for subscribing! Check your inbox to confirm.",
        bgColor: "#ffffff",
        accentColor: "#4f46e5",
        textColor: "#111827",
        collectName: true,
        showBranding: true,
        redirectUrl: "",
        ...((form.config as any) || {}),
    };

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>{config.headline} — {form.brand?.name || "Newsletter"}</title>
                <meta name="description" content={config.description} />
            </head>
            <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <div
                    style={{
                        backgroundColor: config.bgColor,
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px 20px",
                    }}
                >
                    <PublicSignupForm form={form} config={config} />
                </div>
            </body>
        </html>
    );
}
