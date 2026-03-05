import { SESv2Client, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-sesv2";
import { prisma } from "./prisma";

export const getSESClient = async () => {
    // Try to get from DB first
    let config: Record<string, string> = {};
    try {
        const settings = await (prisma as any).setting.findMany();
        config = settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
    } catch (e) {
        console.error("Failed to fetch SES settings from DB", e);
    }

    const region = config.AWS_REGION || process.env.AWS_REGION || "us-east-1";
    const accessKeyId = config.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = config.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
        console.warn("AWS SES credentials are not fully configured.");
    }

    return new SESv2Client({
        region,
        credentials: {
            accessKeyId: accessKeyId || "",
            secretAccessKey: secretAccessKey || "",
        },
    });
};

export const sendEmail = async (params: SendEmailCommandInput) => {
    const client = await getSESClient();
    const command = new SendEmailCommand(params);
    return await client.send(command);
};
