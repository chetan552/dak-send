import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaveTemplateForm } from "@/components/template/save-template-form";
import { getTemplateById } from "@/app/actions/templates";
import { notFound, redirect } from "next/navigation";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return redirect("/login");

    const resolvedParams = await params;
    const template = await getTemplateById(resolvedParams.id).catch(() => null);

    if (!template || !template.isCustom) {
        return notFound();
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    
    if (role !== "admin" && template.userId !== userId) {
        return notFound();
    }

    return <SaveTemplateForm initialData={template} />;
}
