import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewFormForm } from "@/components/forms/new-form-form";

export default async function NewFormPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role || "user";

    const where = role === "admin"
        ? {}
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({
        where,
        include: {
            lists: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    return <NewFormForm brands={brands} />;
}
