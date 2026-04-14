import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TagsClient } from "./tags-client";

export default async function TagsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = session.user.id;
    const role = session.user.role || "user";

    const brandsWhere: any = role === "admin"
        ? {}
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({
        where: brandsWhere,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return <TagsClient brands={brands} />;
}
