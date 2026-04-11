"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import dns from "dns/promises";

interface DnsCheckResult {
    domain: string;
    spf: { status: "pass" | "fail" | "warn"; record: string | null; message: string };
    dkim: { status: "pass" | "fail" | "warn"; record: string | null; message: string };
    dmarc: { status: "pass" | "fail" | "warn"; record: string | null; message: string };
    mx: { status: "pass" | "fail"; records: string[] };
}

export async function checkDeliverability(domain: string): Promise<DnsCheckResult> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const result: DnsCheckResult = {
        domain,
        spf: { status: "fail", record: null, message: "" },
        dkim: { status: "fail", record: null, message: "" },
        dmarc: { status: "fail", record: null, message: "" },
        mx: { status: "fail", records: [] },
    };

    // Check SPF
    try {
        const txtRecords = await dns.resolveTxt(domain);
        const spfRecord = txtRecords.flat().find(r => r.startsWith("v=spf1"));
        if (spfRecord) {
            result.spf = {
                status: spfRecord.includes("~all") || spfRecord.includes("-all") ? "pass" : "warn",
                record: spfRecord,
                message: spfRecord.includes("-all")
                    ? "SPF is configured with hard fail (-all) — excellent"
                    : spfRecord.includes("~all")
                        ? "SPF configured with soft fail (~all) — good, consider -all"
                        : "SPF record found but may be permissive",
            };
        } else {
            result.spf = { status: "fail", record: null, message: "No SPF record found. Add a TXT record with v=spf1." };
        }
    } catch {
        result.spf = { status: "fail", record: null, message: "Could not resolve DNS records for SPF check" };
    }

    // Check DKIM (common selectors)
    const dkimSelectors = ["default", "google", "amazonses", "s1", "s2", "selector1", "selector2", "k1", "dkim"];
    let dkimFound = false;
    for (const selector of dkimSelectors) {
        try {
            const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
            const dkimRecord = records.flat().join("");
            if (dkimRecord.includes("v=DKIM1") || dkimRecord.includes("p=")) {
                result.dkim = {
                    status: "pass",
                    record: `${selector}._domainkey.${domain}`,
                    message: `DKIM found with selector "${selector}"`,
                };
                dkimFound = true;
                break;
            }
        } catch {
            // Try next selector
        }
    }
    if (!dkimFound) {
        try {
            const cnameRecords = await dns.resolveCname(`amazonses._domainkey.${domain}`);
            if (cnameRecords.length > 0) {
                result.dkim = {
                    status: "pass",
                    record: `amazonses._domainkey.${domain} → ${cnameRecords[0]}`,
                    message: "DKIM found via Amazon SES CNAME",
                };
                dkimFound = true;
            }
        } catch { }
    }
    if (!dkimFound) {
        result.dkim = {
            status: "warn",
            record: null,
            message: "No DKIM record found with common selectors. May use a custom selector.",
        };
    }

    // Check DMARC
    try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
        const dmarcRecord = dmarcRecords.flat().find(r => r.startsWith("v=DMARC1"));
        if (dmarcRecord) {
            const policy = dmarcRecord.match(/p=(\w+)/)?.[1] || "none";
            result.dmarc = {
                status: policy === "reject" || policy === "quarantine" ? "pass" : "warn",
                record: dmarcRecord,
                message: policy === "reject"
                    ? "DMARC policy is reject — maximum protection"
                    : policy === "quarantine"
                        ? "DMARC policy is quarantine — good, consider reject"
                        : "DMARC policy is none — consider quarantine or reject",
            };
        } else {
            result.dmarc = { status: "fail", record: null, message: "No DMARC record found. Add a TXT record at _dmarc." + domain };
        }
    } catch {
        result.dmarc = { status: "fail", record: null, message: "Could not resolve DMARC record" };
    }

    // Check MX records
    try {
        const mxRecords = await dns.resolveMx(domain);
        if (mxRecords.length > 0) {
            result.mx = {
                status: "pass",
                records: mxRecords.sort((a, b) => a.priority - b.priority).map(r => `${r.priority} ${r.exchange}`),
            };
        } else {
            result.mx = { status: "fail", records: [] };
        }
    } catch {
        result.mx = { status: "fail", records: [] };
    }

    return result;
}

export async function checkBrandDeliverability(brandId: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const brand = await prisma.brand.findFirst({ where: { id: brandId } });
    if (!brand || !brand.fromEmail) throw new Error("Brand not found or no sender email");

    const domain = brand.fromEmail.split("@")[1];
    return await checkDeliverability(domain);
}
