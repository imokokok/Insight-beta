export interface APIDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  paths: Record<string, APIPath>;
  components: {
    schemas: Record<string, Schema>;
    responses: Record<string, Response>;
  };
}

export interface APIPath {
  get?: APIOperation;
  post?: APIOperation;
  put?: APIOperation;
  delete?: APIOperation;
  patch?: APIOperation;
}

export interface APIOperation {
  summary: string;
  description: string;
  tags: string[];
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses: Record<string, APIResponse>;
  security?: SecurityRequirement[];
}

export interface APIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description: string;
  required: boolean;
  schema: Schema;
  type?: string;
  enum?: string[];
}

export interface APIRequestBody {
  description: string;
  required: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
}

export interface APIResponse {
  description: string;
  content?: Record<string, MediaType>;
}

export interface Schema {
  type: "object" | "array" | "string" | "number" | "boolean" | "integer";
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  enum?: string[];
  format?: string;
  description?: string;
  example?: unknown;
}

export interface Response {
  description: string;
  schema?: Schema;
}

export interface SecurityRequirement {
  [key: string]: string[];
}

export class APIDocGenerator {
  private doc: APIDocumentation;

  constructor(config: {
    title: string;
    version: string;
    description: string;
    baseUrl: string;
  }) {
    this.doc = {
      ...config,
      paths: {},
      components: {
        schemas: {},
        responses: {},
      },
    };
  }

  addPath(path: string, methods: APIPath): void {
    this.doc.paths[path] = methods;
  }

  addSchema(name: string, schema: Schema): void {
    this.doc.components.schemas[name] = schema;
  }

  addResponse(name: string, response: Response): void {
    this.doc.components.responses[name] = response;
  }

  generateOpenAPISpec(): APIDocumentation {
    return this.doc;
  }

  generateHTML(): string {
    const spec = this.generateOpenAPISpec();
    const specJson = JSON.stringify(spec, null, 2);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.doc.title} - API Documentation</title>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .redoc-wrap {
      height: 100vh;
    }
  </style>
</head>
<body>
  <redoc spec-url="data:application/json;base64,${btoa(specJson)}"></redoc>
</body>
</html>
    `;
  }

  generateMarkdown(): string {
    const lines: string[] = [];

    lines.push(`# ${this.doc.title}`);
    lines.push(`\n**Version:** ${this.doc.version}`);
    lines.push(`\n${this.doc.description}\n`);
    lines.push(`**Base URL:** \`${this.doc.baseUrl}\`\n`);
    lines.push("---\n");

    for (const [path, methods] of Object.entries(this.doc.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const methodUpper = method.toUpperCase();
        lines.push(`## ${methodUpper} ${path}`);
        lines.push(`\n**${operation.summary}**\n`);
        lines.push(operation.description + "\n");

        if (operation.tags && operation.tags.length > 0) {
          lines.push(`**Tags:** ${operation.tags.join(", ")}\n`);
        }

        if (operation.parameters && operation.parameters.length > 0) {
          lines.push("### Parameters\n");
          lines.push("| Name | In | Type | Required | Description |");
          lines.push("|------|----|----|----------|------------|");

          for (const param of operation.parameters) {
            const required = param.required ? "Yes" : "No";
            const type = param.schema.type || "unknown";
            lines.push(`| \`${param.name}\` | ${param.in} | ${type} | ${required} | ${param.description} |`);
          }
          lines.push("");
        }

        if (operation.requestBody) {
          lines.push("### Request Body\n");
          lines.push(`**Required:** ${operation.requestBody.required ? "Yes" : "No"}\n`);
          lines.push(operation.requestBody.description + "\n");

          for (const [contentType, media] of Object.entries(operation.requestBody.content)) {
            lines.push(`**Content-Type:** ${contentType}\n`);
            if (media.schema) {
              lines.push("```json");
              lines.push(JSON.stringify(media.schema.example || {}, null, 2));
              lines.push("```");
            }
            lines.push("");
          }
        }

        if (operation.responses) {
          lines.push("### Responses\n");

          for (const [statusCode, response] of Object.entries(operation.responses)) {
            lines.push(`#### ${statusCode}\n`);
            lines.push(response.description + "\n");

            if (response.content) {
              for (const [contentType, media] of Object.entries(response.content)) {
                lines.push(`**Content-Type:** ${contentType}\n`);
                if (media.schema) {
                  lines.push("```json");
                  lines.push(JSON.stringify(media.schema.example || {}, null, 2));
                  lines.push("```");
                }
                lines.push("");
              }
            }
          }
        }

        lines.push("---\n");
      }
    }

    return lines.join("\n");
  }

  exportJSON(): string {
    return JSON.stringify(this.generateOpenAPISpec(), null, 2);
  }
}

export function generateOracleAPIDoc(): APIDocumentation {
  const generator = new APIDocGenerator({
    title: "Insight Oracle API",
    version: "1.0.0",
    description: "API for monitoring and managing UMA Optimistic Oracle assertions, disputes, and alerts.",
    baseUrl: "/api",
  });

  generator.addSchema("Assertion", {
    type: "object",
    properties: {
      id: { type: "string", description: "Unique assertion ID" },
      asserter: { type: "string", description: "Address of the asserter" },
      protocol: { type: "string", description: "Protocol name" },
      market: { type: "string", description: "Market identifier" },
      assertion: { type: "string", description: "Assertion text" },
      bondUsd: { type: "number", description: "Bond amount in USD" },
      assertedAt: { type: "string", format: "date-time", description: "Assertion timestamp" },
      livenessEndsAt: { type: "string", format: "date-time", description: "Liveness period end" },
      status: { type: "string", enum: ["Pending", "Disputed", "Resolved"], description: "Assertion status" },
    },
    required: ["id", "asserter", "protocol", "market", "assertion", "bondUsd", "assertedAt", "livenessEndsAt", "status"],
  });

  generator.addSchema("Dispute", {
    type: "object",
    properties: {
      id: { type: "string", description: "Unique dispute ID" },
      assertionId: { type: "string", description: "Associated assertion ID" },
      disputer: { type: "string", description: "Address of the disputer" },
      reason: { type: "string", description: "Dispute reason" },
      disputedAt: { type: "string", format: "date-time", description: "Dispute timestamp" },
      status: { type: "string", enum: ["Pending", "Resolved"], description: "Dispute status" },
    },
    required: ["id", "assertionId", "disputer", "reason", "disputedAt", "status"],
  });

  generator.addSchema("Alert", {
    type: "object",
    properties: {
      id: { type: "number", description: "Alert ID" },
      type: { type: "string", description: "Alert type" },
      severity: { type: "string", enum: ["info", "warning", "critical"], description: "Alert severity" },
      status: { type: "string", enum: ["Open", "Acknowledged", "Resolved"], description: "Alert status" },
      title: { type: "string", description: "Alert title" },
      message: { type: "string", description: "Alert message" },
      createdAt: { type: "string", format: "date-time", description: "Alert creation timestamp" },
    },
    required: ["id", "type", "severity", "status", "title", "message", "createdAt"],
  });

  generator.addSchema("Error", {
    type: "object",
    properties: {
      ok: { type: "boolean", example: false },
      error: { type: "string", description: "Error code" },
    },
    required: ["ok", "error"],
  });

  generator.addResponse("Success", {
    description: "Successful response",
    schema: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        data: { type: "object" },
      },
      required: ["ok"],
    },
  });

  generator.addResponse("Error", {
    description: "Error response",
    schema: {
      $ref: "#/components/schemas/Error",
    },
  });

  generator.addPath("/oracle/assertions", {
    get: {
      summary: "List Assertions",
      description: "Retrieve a paginated list of assertions with optional filters.",
      tags: ["Oracle"],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by assertion status",
          required: false,
          schema: { type: "string", enum: ["Pending", "Disputed", "Resolved"] },
        },
        {
          name: "chain",
          in: "query",
          description: "Filter by blockchain network",
          required: false,
          schema: { type: "string", enum: ["Polygon", "Arbitrum", "Optimism", "Local"] },
        },
        {
          name: "q",
          in: "query",
          description: "Search query for market/assertion/address",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "limit",
          in: "query",
          description: "Maximum number of results (1-100)",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
        {
          name: "cursor",
          in: "query",
          description: "Pagination cursor",
          required: false,
          schema: { type: "integer" },
        },
      ],
      responses: {
        "200": { $ref: "#/components/responses/Success" },
        "400": { $ref: "#/components/responses/Error" },
        "500": { $ref: "#/components/responses/Error" },
      },
    },
  });

  generator.addPath("/oracle/assertions/{id}", {
    get: {
      summary: "Get Assertion Details",
      description: "Retrieve detailed information about a specific assertion.",
      tags: ["Oracle"],
      parameters: [
        {
          name: "id",
          in: "path",
          description: "Assertion ID",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": { $ref: "#/components/responses/Success" },
        "404": { $ref: "#/components/responses/Error" },
        "500": { $ref: "#/components/responses/Error" },
      },
    },
  });

  generator.addPath("/oracle/disputes", {
    get: {
      summary: "List Disputes",
      description: "Retrieve a paginated list of disputes with optional filters.",
      tags: ["Oracle"],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by dispute status",
          required: false,
          schema: { type: "string", enum: ["Pending", "Resolved"] },
        },
        {
          name: "limit",
          in: "query",
          description: "Maximum number of results (1-100)",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
        {
          name: "cursor",
          in: "query",
          description: "Pagination cursor",
          required: false,
          schema: { type: "integer" },
        },
      ],
      responses: {
        "200": { $ref: "#/components/responses/Success" },
        "400": { $ref: "#/components/responses/Error" },
        "500": { $ref: "#/components/responses/Error" },
      },
    },
  });

  generator.addPath("/oracle/alerts", {
    get: {
      summary: "List Alerts",
      description: "Retrieve a paginated list of alerts with optional filters.",
      tags: ["Monitoring"],
      parameters: [
        {
          name: "status",
          in: "query",
          description: "Filter by alert status",
          required: false,
          schema: { type: "string", enum: ["Open", "Acknowledged", "Resolved"] },
        },
        {
          name: "severity",
          in: "query",
          description: "Filter by alert severity",
          required: false,
          schema: { type: "string", enum: ["info", "warning", "critical"] },
        },
        {
          name: "type",
          in: "query",
          description: "Filter by alert type",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "limit",
          in: "query",
          description: "Maximum number of results (1-100)",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
        },
        {
          name: "cursor",
          in: "query",
          description: "Pagination cursor",
          required: false,
          schema: { type: "integer" },
        },
      ],
      responses: {
        "200": { $ref: "#/components/responses/Success" },
        "400": { $ref: "#/components/responses/Error" },
        "500": { $ref: "#/components/responses/Error" },
      },
    },
  });

  generator.addPath("/oracle/sync", {
    post: {
      summary: "Trigger Oracle Sync",
      description: "Manually trigger a synchronization of on-chain events.",
      tags: ["Oracle"],
      security: [{ adminToken: [] }],
      requestBody: {
        description: "Optional sync parameters",
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                force: { type: "boolean", description: "Force full re-sync" },
              },
            },
          },
        },
      },
      responses: {
        "200": { $ref: "#/components/responses/Success" },
        "401": { $ref: "#/components/responses/Error" },
        "403": { $ref: "#/components/responses/Error" },
        "500": { $ref: "#/components/responses/Error" },
      },
    },
  });

  return generator.generateOpenAPISpec();
}