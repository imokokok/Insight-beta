#!/usr/bin/env node
import { generateAPIDoc } from "../src/lib/apiDocGenerator";
import { generateMarkdown } from "../src/lib/apiDocGenerator";
import { getAPIDocGenerator } from "../src/lib/apiDocGenerator";
import * as fs from "node:fs";
import * as path from "node:path";

const ROUTE_DIR = path.join(__dirname, "../src/app/api");
const DOCS_DIR = path.join(__dirname, "../docs");
const OUTPUT_DIR = path.join(__dirname, "../docs/generated");

interface RouteInfo {
  filePath: string;
  routePath: string;
  methods: string[];
}

function findRouteFiles(dir: string, basePath = ""): RouteInfo[] {
  const routes: RouteInfo[] = [];

  if (!fs.existsSync(dir)) {
    return routes;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!file.startsWith(".") && file !== "node_modules") {
        const routePart = file === "[id]" ? ":id" : file;
        routes.push(...findRouteFiles(fullPath, `${basePath}/${routePart}`));
      }
    } else if (file === "route.ts") {
      const routePath = basePath.replace("/oracle", "/oracle");
      const methods = detectMethods(fullPath);
      routes.push({
        filePath: fullPath,
        routePath: routePath || "/",
        methods,
      });
    }
  }

  return routes;
}

function detectMethods(filePath: string): string[] {
  const methods: string[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    if (/export\s+async\s+function\s+GET\s*\(/m.test(content)) methods.push("get");
    if (/export\s+async\s+function\s+POST\s*\(/m.test(content)) methods.push("post");
    if (/export\s+async\s+function\s+PUT\s*\(/m.test(content)) methods.push("put");
    if (/export\s+async\s+function\s+PATCH\s*\(/m.test(content)) methods.push("patch");
    if (/export\s+async\s+function\s+DELETE\s*\(/m.test(content)) methods.push("delete");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
  }

  return methods;
}

function parseRouteSegment(segment: string): string {
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `:${segment.slice(1, -1)}`;
  }
  return segment;
}

function buildRoutePath(parts: string[]): string {
  const pathParts = parts.filter(Boolean).map(parseRouteSegment);
  return pathParts.length > 0 ? `/${pathParts.join("/")}` : "/";
}

function categorizeRoute(routePath: string): string {
  if (routePath.includes("/oracle/assertions")) return "Assertions";
  if (routePath.includes("/oracle/disputes")) return "Disputes";
  if (routePath.includes("/oracle/alerts")) return "Alerts";
  if (routePath.includes("/oracle/analytics")) return "Analytics";
  if (routePath.includes("/oracle/audit")) return "Audit";
  if (routePath.includes("/oracle/status")) return "Status";
  if (routePath.includes("/oracle/sync")) return "Sync";
  if (routePath.includes("/oracle/config")) return "Config";
  if (routePath.includes("/oracle/charts")) return "Charts";
  if (routePath.includes("/oracle/incidents")) return "Incidents";
  if (routePath.includes("/oracle/instances")) return "Instances";
  if (routePath.includes("/oracle/leaderboard")) return "Leaderboard";
  if (routePath.includes("/oracle/risks")) return "Risks";
  if (routePath.includes("/oracle/stats")) return "Stats";
  if (routePath.includes("/oracle/ops-metrics")) return "Ops Metrics";
  if (routePath.includes("/oracle/sync-metrics")) return "Sync Metrics";
  if (routePath.includes("/admin")) return "Admin";
  if (routePath.includes("/export")) return "Export";
  if (routePath.includes("/reports")) return "Reports";
  if (routePath.includes("/health")) return "Health";
  if (routePath.includes("/events")) return "Events";
  if (routePath.includes("/comments")) return "Comments";
  if (routePath.includes("/docs")) return "Docs";
  return "Other";
}

function generateApiDocumentation(): void {
  console.log("🔍 Scanning API routes...\n");

  const routes = findRouteFiles(ROUTE_DIR);

  console.log(`📝 Found ${routes.length} API routes\n`);

  const generator = getAPIDocGenerator();

  generator.addTag("Oracle");
  generator.addTag("Admin");
  generator.addTag("Health");
  generator.addContact("Insight Team", "dev@insight.example");

  for (const route of routes) {
    const category = categorizeRoute(route.routePath);

    const operation: Record<string, import("../src/lib/apiDocGenerator").APIOperation> = {};

    for (const method of route.methods) {
      operation[method] = {
        summary: `${method.toUpperCase()} ${route.routePath}`,
        description: `Endpoint for ${method.toUpperCase()} requests to ${route.routePath}`,
        tags: [category],
        parameters: [],
        responses: {
          "200": {
            description: "Successful response",
          },
          "400": {
            description: "Bad request",
          },
          "500": {
            description: "Internal server error",
          },
        },
      };
    }

    if (Object.keys(operation).length > 0) {
      generator.addPath(route.routePath, operation);
    }
  }

  const markdown = generator.generateMarkdown({ includeExamples: true });

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const markdownPath = path.join(OUTPUT_DIR, "api-routes.md");
  fs.writeFileSync(markdownPath, markdown);
  console.log(`✅ Generated API documentation: ${markdownPath}\n`);

  const jsonSpec = generator.generateOpenAPISpec({ format: "json" });
  const jsonPath = path.join(OUTPUT_DIR, "openapi.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonSpec, null, 2));
  console.log(`✅ Generated OpenAPI spec: ${jsonPath}\n`);

  console.log("📊 Route Summary:");
  console.log("================\n");

  const categoryCount: Record<string, number> = {};
  for (const route of routes) {
    const category = categorizeRoute(route.routePath);
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  }

  for (const [category, count] of Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${category}: ${count} routes`);
  }

  console.log("\n✨ API documentation generation complete!");
}

function main(): void {
  try {
    generateApiDocumentation();
  } catch (error) {
    console.error("Error generating API documentation:", error);
    process.exit(1);
  }
}

main();
