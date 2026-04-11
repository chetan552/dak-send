import type {
    IExecuteFunctions,
    IDataObject,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions,
    INodePropertyOptions,
} from "n8n-workflow";
import { NodeOperationError } from "n8n-workflow";

async function dakSendRequest(
    this: IExecuteFunctions | ILoadOptionsFunctions,
    method: string,
    endpoint: string,
    body?: IDataObject,
    qs?: IDataObject
): Promise<IDataObject> {
    const credentials = await this.getCredentials("dakSendApi");
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, "");

    const options = {
        method,
        url: `${baseUrl}/api/v1${endpoint}`,
        headers: {
            "x-api-key": credentials.apiKey as string,
            "Content-Type": "application/json",
        },
        body,
        qs,
        json: true,
    };

    return this.helpers.request(options) as Promise<IDataObject>;
}

export class DakSend implements INodeType {
    description: INodeTypeDescription = {
        displayName: "DakSend",
        name: "dakSend",
        icon: "file:daksend.svg",
        group: ["output"],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: "Interact with DakSend email platform",
        defaults: { name: "DakSend" },
        inputs: ["main"],
        outputs: ["main"],
        credentials: [{ name: "dakSendApi", required: true }],
        requestDefaults: {
            baseURL: "={{$credentials.baseUrl}}/api/v1",
            headers: { "x-api-key": "={{$credentials.apiKey}}" },
        },
        properties: [
            // ── Resource picker ──────────────────────────────────────────────
            {
                displayName: "Resource",
                name: "resource",
                type: "options",
                noDataExpression: true,
                options: [
                    { name: "Subscriber", value: "subscriber" },
                    { name: "Campaign", value: "campaign" },
                    { name: "Email", value: "email" },
                ],
                default: "subscriber",
            },

            // ── Subscriber operations ────────────────────────────────────────
            {
                displayName: "Operation",
                name: "operation",
                type: "options",
                noDataExpression: true,
                displayOptions: { show: { resource: ["subscriber"] } },
                options: [
                    { name: "Get", value: "get", description: "Get a subscriber by email", action: "Get a subscriber" },
                    { name: "Get Many", value: "getMany", description: "List subscribers", action: "Get many subscribers" },
                    { name: "Create or Update", value: "upsert", description: "Add or update a subscriber", action: "Create or update a subscriber" },
                    { name: "Update", value: "update", description: "Update subscriber fields", action: "Update a subscriber" },
                    { name: "Delete", value: "delete", description: "Unsubscribe a subscriber", action: "Delete a subscriber" },
                ],
                default: "upsert",
            },

            // ── Campaign operations ──────────────────────────────────────────
            {
                displayName: "Operation",
                name: "operation",
                type: "options",
                noDataExpression: true,
                displayOptions: { show: { resource: ["campaign"] } },
                options: [
                    { name: "Get", value: "get", description: "Get a campaign by ID", action: "Get a campaign" },
                    { name: "Get Many", value: "getMany", description: "List campaigns", action: "Get many campaigns" },
                ],
                default: "getMany",
            },

            // ── Email operations ─────────────────────────────────────────────
            {
                displayName: "Operation",
                name: "operation",
                type: "options",
                noDataExpression: true,
                displayOptions: { show: { resource: ["email"] } },
                options: [
                    { name: "Send", value: "send", description: "Send a transactional email", action: "Send an email" },
                ],
                default: "send",
            },

            // ═══════════════════════════════════════════════════════════════
            // SUBSCRIBER fields
            // ═══════════════════════════════════════════════════════════════

            // email (get / update / delete)
            {
                displayName: "Email",
                name: "email",
                type: "string",
                placeholder: "name@email.com",
                displayOptions: {
                    show: {
                        resource: ["subscriber"],
                        operation: ["get", "update", "delete"],
                    },
                },
                default: "",
                required: true,
            },

            // List ID (get — optional filter)
            {
                displayName: "List ID",
                name: "listId",
                type: "string",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["get"] },
                },
                default: "",
                description: "Filter by list ID (optional, needed when the email exists in multiple lists)",
            },

            // upsert fields
            {
                displayName: "List ID",
                name: "listId",
                type: "string",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["upsert"] },
                },
                default: "",
                required: true,
                description: "The list to add the subscriber to",
            },
            {
                displayName: "Email",
                name: "email",
                type: "string",
                placeholder: "name@email.com",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["upsert"] },
                },
                default: "",
                required: true,
            },
            {
                displayName: "Name",
                name: "name",
                type: "string",
                displayOptions: {
                    show: {
                        resource: ["subscriber"],
                        operation: ["upsert", "update"],
                    },
                },
                default: "",
            },
            {
                displayName: "Status",
                name: "status",
                type: "options",
                options: [
                    { name: "Subscribed", value: "subscribed" },
                    { name: "Unsubscribed", value: "unsubscribed" },
                    { name: "Pending", value: "pending" },
                ],
                displayOptions: {
                    show: {
                        resource: ["subscriber"],
                        operation: ["upsert", "update"],
                    },
                },
                default: "subscribed",
            },
            {
                displayName: "Custom Fields",
                name: "customFields",
                type: "fixedCollection",
                typeOptions: { multipleValues: true },
                displayOptions: {
                    show: {
                        resource: ["subscriber"],
                        operation: ["upsert", "update"],
                    },
                },
                default: {},
                placeholder: "Add Custom Field",
                options: [
                    {
                        name: "field",
                        displayName: "Field",
                        values: [
                            { displayName: "Name", name: "name", type: "string", default: "" },
                            { displayName: "Value", name: "value", type: "string", default: "" },
                        ],
                    },
                ],
            },

            // getMany filters
            {
                displayName: "List ID",
                name: "listId",
                type: "string",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["getMany"] },
                },
                default: "",
                description: "Filter by list ID (leave empty for all)",
            },
            {
                displayName: "Status Filter",
                name: "status",
                type: "options",
                options: [
                    { name: "Any", value: "" },
                    { name: "Subscribed", value: "subscribed" },
                    { name: "Unsubscribed", value: "unsubscribed" },
                    { name: "Pending", value: "pending" },
                ],
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["getMany"] },
                },
                default: "",
            },
            {
                displayName: "Limit",
                name: "limit",
                type: "number",
                typeOptions: { minValue: 1, maxValue: 500 },
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["getMany"] },
                },
                default: 50,
            },
            {
                displayName: "Offset",
                name: "offset",
                type: "number",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["getMany"] },
                },
                default: 0,
            },

            // update: list ID for scoping
            {
                displayName: "List ID",
                name: "listId",
                type: "string",
                displayOptions: {
                    show: { resource: ["subscriber"], operation: ["update", "delete"] },
                },
                default: "",
                description: "Scope to a specific list (required when the email is in multiple lists)",
            },

            // ═══════════════════════════════════════════════════════════════
            // CAMPAIGN fields
            // ═══════════════════════════════════════════════════════════════

            {
                displayName: "Campaign ID",
                name: "campaignId",
                type: "string",
                displayOptions: {
                    show: { resource: ["campaign"], operation: ["get"] },
                },
                default: "",
                required: true,
            },
            {
                displayName: "Brand ID",
                name: "brandId",
                type: "string",
                displayOptions: {
                    show: { resource: ["campaign"], operation: ["getMany"] },
                },
                default: "",
                description: "Filter by brand (leave empty for all)",
            },
            {
                displayName: "Status Filter",
                name: "status",
                type: "options",
                options: [
                    { name: "Any", value: "" },
                    { name: "Draft", value: "draft" },
                    { name: "Scheduled", value: "scheduled" },
                    { name: "Sending", value: "sending" },
                    { name: "Sent", value: "sent" },
                ],
                displayOptions: {
                    show: { resource: ["campaign"], operation: ["getMany"] },
                },
                default: "",
            },
            {
                displayName: "Limit",
                name: "limit",
                type: "number",
                typeOptions: { minValue: 1, maxValue: 200 },
                displayOptions: {
                    show: { resource: ["campaign"], operation: ["getMany"] },
                },
                default: 50,
            },
            {
                displayName: "Offset",
                name: "offset",
                type: "number",
                displayOptions: {
                    show: { resource: ["campaign"], operation: ["getMany"] },
                },
                default: 0,
            },

            // ═══════════════════════════════════════════════════════════════
            // EMAIL (transactional send) fields
            // ═══════════════════════════════════════════════════════════════

            {
                displayName: "From",
                name: "from",
                type: "string",
                placeholder: "Sender Name <sender@example.com>",
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
                required: true,
            },
            {
                displayName: "To",
                name: "to",
                type: "string",
                placeholder: "recipient@example.com",
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
                required: true,
            },
            {
                displayName: "Subject",
                name: "subject",
                type: "string",
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
                required: true,
            },
            {
                displayName: "HTML Body",
                name: "html",
                type: "string",
                typeOptions: { rows: 8 },
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
            },
            {
                displayName: "Text Body",
                name: "text",
                type: "string",
                typeOptions: { rows: 4 },
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
            },
            {
                displayName: "Reply-To",
                name: "replyTo",
                type: "string",
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
            },
            {
                displayName: "Brand ID",
                name: "brandId",
                type: "string",
                displayOptions: {
                    show: { resource: ["email"], operation: ["send"] },
                },
                default: "",
                description: "Send from a specific brand's SES config (leave empty for default)",
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: IDataObject[] = [];

        for (let i = 0; i < items.length; i++) {
            const resource = this.getNodeParameter("resource", i) as string;
            const operation = this.getNodeParameter("operation", i) as string;

            let result: IDataObject = {};

            try {
                if (resource === "subscriber") {
                    if (operation === "get") {
                        const email = encodeURIComponent(this.getNodeParameter("email", i) as string);
                        const listId = this.getNodeParameter("listId", i, "") as string;
                        const qs: IDataObject = {};
                        if (listId) qs.listId = listId;
                        const res = await dakSendRequest.call(this, "GET", `/subscribers/${email}`, undefined, qs);
                        result = (res.data as IDataObject) ?? res;

                    } else if (operation === "getMany") {
                        const qs: IDataObject = {};
                        const listId = this.getNodeParameter("listId", i, "") as string;
                        const status = this.getNodeParameter("status", i, "") as string;
                        if (listId) qs.listId = listId;
                        if (status) qs.status = status;
                        qs.limit = this.getNodeParameter("limit", i, 50);
                        qs.offset = this.getNodeParameter("offset", i, 0);
                        const res = await dakSendRequest.call(this, "GET", "/subscribers", undefined, qs);
                        const list = res.data as IDataObject[];
                        returnData.push(...list.map(s => ({ json: s })).map(x => x));
                        continue;

                    } else if (operation === "upsert") {
                        const body: IDataObject = {
                            listId: this.getNodeParameter("listId", i) as string,
                            email: this.getNodeParameter("email", i) as string,
                            status: this.getNodeParameter("status", i, "subscribed") as string,
                        };
                        const name = this.getNodeParameter("name", i, "") as string;
                        if (name) body.name = name;
                        const cfCollection = this.getNodeParameter("customFields.field", i, []) as Array<{ name: string; value: string }>;
                        if (cfCollection.length > 0) {
                            body.customFields = Object.fromEntries(cfCollection.map(f => [f.name, f.value]));
                        }
                        const res = await dakSendRequest.call(this, "POST", "/subscribers", body);
                        result = (res.data as IDataObject) ?? res;

                    } else if (operation === "update") {
                        const email = encodeURIComponent(this.getNodeParameter("email", i) as string);
                        const listId = this.getNodeParameter("listId", i, "") as string;
                        const qs: IDataObject = {};
                        if (listId) qs.listId = listId;
                        const body: IDataObject = {};
                        const name = this.getNodeParameter("name", i, "") as string;
                        const status = this.getNodeParameter("status", i, "") as string;
                        if (name) body.name = name;
                        if (status) body.status = status;
                        const cfCollection = this.getNodeParameter("customFields.field", i, []) as Array<{ name: string; value: string }>;
                        if (cfCollection.length > 0) {
                            body.customFields = Object.fromEntries(cfCollection.map(f => [f.name, f.value]));
                        }
                        const res = await dakSendRequest.call(this, "PATCH", `/subscribers/${email}`, body, qs);
                        result = (res.data as IDataObject) ?? res;

                    } else if (operation === "delete") {
                        const email = encodeURIComponent(this.getNodeParameter("email", i) as string);
                        const listId = this.getNodeParameter("listId", i, "") as string;
                        const qs: IDataObject = {};
                        if (listId) qs.listId = listId;
                        const res = await dakSendRequest.call(this, "DELETE", `/subscribers/${email}`, undefined, qs);
                        result = (res.data as IDataObject) ?? res;
                    }

                } else if (resource === "campaign") {
                    if (operation === "get") {
                        const campaignId = this.getNodeParameter("campaignId", i) as string;
                        const res = await dakSendRequest.call(this, "GET", `/campaigns/${campaignId}`);
                        result = (res.data as IDataObject) ?? res;

                    } else if (operation === "getMany") {
                        const qs: IDataObject = {};
                        const brandId = this.getNodeParameter("brandId", i, "") as string;
                        const status = this.getNodeParameter("status", i, "") as string;
                        if (brandId) qs.brandId = brandId;
                        if (status) qs.status = status;
                        qs.limit = this.getNodeParameter("limit", i, 50);
                        qs.offset = this.getNodeParameter("offset", i, 0);
                        const res = await dakSendRequest.call(this, "GET", "/campaigns", undefined, qs);
                        const list = res.data as IDataObject[];
                        returnData.push(...list.map(s => ({ json: s })).map(x => x));
                        continue;
                    }

                } else if (resource === "email") {
                    if (operation === "send") {
                        const body: IDataObject = {
                            from: this.getNodeParameter("from", i) as string,
                            to: this.getNodeParameter("to", i) as string,
                            subject: this.getNodeParameter("subject", i) as string,
                        };
                        const html = this.getNodeParameter("html", i, "") as string;
                        const text = this.getNodeParameter("text", i, "") as string;
                        const replyTo = this.getNodeParameter("replyTo", i, "") as string;
                        const brandId = this.getNodeParameter("brandId", i, "") as string;
                        if (html) body.html = html;
                        if (text) body.text = text;
                        if (replyTo) body.replyTo = replyTo;
                        if (brandId) body.brandId = brandId;

                        const credentials = await this.getCredentials("dakSendApi");
                        const baseUrl = (credentials.baseUrl as string).replace(/\/$/, "");
                        result = await this.helpers.request({
                            method: "POST",
                            url: `${baseUrl}/api/send`,
                            headers: { "x-api-key": credentials.apiKey as string },
                            body,
                            json: true,
                        }) as IDataObject;
                    }
                }

                returnData.push({ json: result });

            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message } });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
            }
        }

        return [this.helpers.returnJsonArray(returnData)];
    }
}
