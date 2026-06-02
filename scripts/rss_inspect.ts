import { prisma } from "../src/lib/prisma";

async function main() {
  const recent = await prisma.campaign.findMany({
    where: { rssItemGuid: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { sends: true, brand: { select: { id: true, name: true, fromEmail: true, fromName: true } } },
  });

  for (const c of recent) {
    console.log("─".repeat(80));
    console.log(`Campaign: ${c.id}  status=${c.status}  sentAt=${c.sentAt}`);
    console.log(`  name="${c.name}"`);
    console.log(`  subject="${c.subject?.slice(0, 80)}"`);
    console.log(`  brand=${c.brand.name}  fromEmail=${c.brand.fromEmail}  fromName=${c.brand.fromName}`);
    console.log(`  htmlText length=${c.htmlText?.length}`);
    console.log(`  rssItemGuid=${c.rssItemGuid}`);
    console.log(`  CampaignSends (${c.sends.length}):`);
    for (const s of c.sends) {
      console.log(`    - ${s.subscriberEmail}  status=${s.status}  sentAt=${s.sentAt}`);
    }
  }

  const feeds = await prisma.rssFeed.findMany({ include: { brand: { select: { name: true } } } });
  console.log("─".repeat(80));
  console.log("RSS Feeds:");
  for (const f of feeds) {
    console.log(`  id=${f.id}  brand=${f.brand.name} active=${f.isActive} digest=${f.digestMode} autoSend=${f.autoSend} lists=${(f.listIds || []).length} lastCheckedAt=${f.lastCheckedAt}`);
  }

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
