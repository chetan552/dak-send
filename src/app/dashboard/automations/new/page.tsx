import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewAutomationForm } from "@/components/automation/new-automation-form";

export default async function NewAutomationPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role || "user";

    const brandsWhere: any = role === "admin"
        ? {}
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({
        where: brandsWhere,
        include: { lists: { select: { id: true, name: true } } },
    });

    return <NewAutomationForm brands={brands} />;
}
