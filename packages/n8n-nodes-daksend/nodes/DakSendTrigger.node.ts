import type {
    IHookFunctions,
    IWebhookFunctions,
    IDataObject,
    INodeType,
    INodeTypeDescription,
    IWebhookResponseData,
} from "n8n-workflow";

async function dakSendRequest(
    this: IHookFunctions | IWebhookFunctions,
    method: string,
    endpoint: string,
    body?: IDataObject,
    qs?: IDataObject
): Promise<IDataObject> {
    const credentials = await this.getCredentials("dakSendApi");
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, "");

    return this.helpers.request({
        method,
        url: `${baseUrl}/api/v1${endpoint}`,
        headers: {
            "x-api-key": credentials.apiKey as string,
            "Content-Type": "application/json",
        },
        body,
        qs,
        json: true,
    }) as Promise<IDataObject>;
}

export class DakSendTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: "DakSend Trigger",
        name: "dakSendTrigger",
        icon: "file:daksend.svg",
        group: ["trigger"],
        version: 1,
        description: "Receive events from DakSend (subscribe, unsubscribe, open, click, bounce, complaint)",
        defaults: { name: "DakSend Trigger" },
        inputs: [],
        outputs: ["main"],
        credentials: [{ name: "dakSendApi", required: true }],
        webhooks: [
            {
                name: "default",
                httpMethod: "POST",
                responseMode: "onReceived",
                path: "webhook",
            },
        ],
        properties: [
            {
                displayName: "Brand ID",
                name: "brandId",
                type: "string",
                default: "",
                required: true,
                description: "The DakSend brand to receive events from",
            },
            {
                displayName: "Trigger On",
                name: "events",
                type: "multiOptions",
                options: [
                    { name: "Subscribe", value: "subscribe" },
                    { name: "Unsubscribe", value: "unsubscribe" },
                    { name: "Open", value: "open" },
                    { name: "Click", value: "click" },
                    { name: "Bounce", value: "bounce" },
                    { name: "Complaint", value: "complaint" },
                ],
                default: ["subscribe", "unsubscribe"],
                required: true,
            },
            {
                displayName: "Webhook Name",
                name: "webhookName",
                type: "string",
                default: "n8n trigger",
                description: "Label for this webhook in DakSend",
            },
        ],
    };

    // Called when n8n activates the workflow — registers the webhook in DakSend
    webhookMethods = {
        default: {
            async checkExists(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData("node");
                const webhookId = webhookData.webhookId as string | undefined;
                if (!webhookId) return false;

                try {
                    await dakSendRequest.call(this, "GET", `/webhooks/${webhookId}`);
                    return true;
                } catch {
                    return false;
                }
            },

            async create(this: IHookFunctions): Promise<boolean> {
                const webhookUrl = this.getNodeWebhookUrl("default") as string;
                const brandId = this.getNodeParameter("brandId") as string;
                const events = this.getNodeParameter("events") as string[];
                const webhookName = this.getNodeParameter("webhookName", "n8n trigger") as string;

                const response = await dakSendRequest.call(this, "POST", "/webhooks", {
                    name: webhookName,
                    url: webhookUrl,
                    events,
                    brandId,
                });

                const data = response.data as IDataObject;
                const webhookData = this.getWorkflowStaticData("node");
                webhookData.webhookId = data.id as string;
                webhookData.webhookSecret = data.secret as string;

                return true;
            },

            async delete(this: IHookFunctions): Promise<boolean> {
                const webhookData = this.getWorkflowStaticData("node");
                const webhookId = webhookData.webhookId as string | undefined;
                if (!webhookId) return true;

                try {
                    await dakSendRequest.call(this, "DELETE", `/webhooks/${webhookId}`);
                } catch {
                    // Already deleted — ignore
                }

                delete webhookData.webhookId;
                delete webhookData.webhookSecret;
                return true;
            },
        },
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const req = this.getRequestObject();
        const body = this.getBodyData() as IDataObject;

        // Optional: verify HMAC signature
        const webhookData = this.getWorkflowStaticData("node");
        const secret = webhookData.webhookSecret as string | undefined;

        if (secret) {
            const crypto = await import("crypto");
            const signature = req.headers["x-webhook-signature"] as string | undefined;
            if (signature) {
                const hmac = crypto.createHmac("sha256", secret);
                hmac.update(JSON.stringify(body));
                const expected = `sha256=${hmac.digest("hex")}`;
                if (signature !== expected) {
                    return { noWebhookResponse: true };
                }
            }
        }

        return {
            workflowData: [this.helpers.returnJsonArray([body])],
        };
    }
}
