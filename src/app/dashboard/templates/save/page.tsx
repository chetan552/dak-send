import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SaveTemplateForm } from "@/components/template/save-template-form";

export default async function SaveTemplatePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    return <SaveTemplateForm />;
}
