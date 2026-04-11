import type { ICredentialType, INodeProperties } from "n8n-workflow";

export class DakSendApi implements ICredentialType {
    name = "dakSendApi";
    displayName = "DakSend API";
    documentationUrl = "https://github.com/your-org/dak-send";

    properties: INodeProperties[] = [
        {
            displayName: "Base URL",
            name: "baseUrl",
            type: "string",
            default: "http://localhost:3000",
            placeholder: "https://your-daksend-instance.com",
            description: "The base URL of your DakSend instance",
        },
        {
            displayName: "API Key",
            name: "apiKey",
            type: "string",
            typeOptions: { password: true },
            default: "",
            description: "Your DakSend API key (set in Settings → API Key)",
        },
    ];
}
