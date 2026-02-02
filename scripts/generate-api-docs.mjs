#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTE_DIR = path.join(__dirname, "../src/app/api");
const OUTPUT_DIR = path.join(__dirname, "../docs/generated");

function findRouteFiles(dir, basePath = "") {
  const routes = [];

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

function detectMethods(filePath) {
  const methods = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    if (/export\s+async\s+function\s+GET\s*\(/m.test(content)) methods.push("GET");
    if (/export\s+async\s+function\s+POST\s*\(/m.test(content)) methods.push("POST");
    if (/export\s+async\s+function\s+PUT\s*\(/m.test(content)) methods.push("PUT");
    if (/export\s+async\s+function\s+PATCH\s*\(/m.test(content)) methods.push("PATCH");
    if (/export\s+async\s+function\s+DELETE\s*\(/m.test(content)) methods.push("DELETE");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
  }

  return methods;
}

function categorizeRoute(routePath) {
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
  if (routePath.includes("/oracle/uma")) return "UMA";
  if (routePath.includes("/oracle/uma-users")) return "UMA Users";
  if (routePath.includes("/oracle/config-history")) return "Config History";
  if (routePath.includes("/admin")) return "Admin";
  if (routePath.includes("/export")) return "Export";
  if (routePath.includes("/reports")) return "Reports";
  if (routePath.includes("/health")) return "Health";
  if (routePath.includes("/events")) return "Events";
  if (routePath.includes("/comments")) return "Comments";
  if (routePath.includes("/docs")) return "Docs";
  if (routePath.includes("/graphql")) return "GraphQL";
  return "Other";
}

function generateMarkdown(routes) {
  const now = new Date().toISOString();
  let markdown = `# API 路由文档\n\n`;
  markdown += `> 自动生成于: ${now}\n\n`;
  markdown += `## 概述\n\n`;
  markdown += `本文档列出了所有可用的 API 路由。\n\n`;

  // 按类别分组
  const byCategory = {};
  for (const route of routes) {
    const category = categorizeRoute(route.routePath);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(route);
  }

  // 生成目录
  markdown += `## 目录\n\n`;
  for (const category of Object.keys(byCategory).sort()) {
    markdown += `- [${category}](#${category.toLowerCase().replace(/\s+/g, '-')})\n`;
  }
  markdown += `\n`;

  // 生成各部分内容
  for (const [category, categoryRoutes] of Object.entries(byCategory).sort()) {
    markdown += `## ${category}\n\n`;
    markdown += `| 方法 | 路径 | 文件 |\n`;
    markdown += `|------|------|------|\n`;

    for (const route of categoryRoutes.sort((a, b) => a.routePath.localeCompare(b.routePath))) {
      const methods = route.methods.join(", ") || "-";
      const fileName = path.relative(ROUTE_DIR, route.filePath);
      markdown += `| ${methods} | \`${route.routePath}\` | \`${fileName}\` |\n`;
    }
    markdown += `\n`;
  }

  // 统计信息
  markdown += `## 统计\n\n`;
  markdown += `- 总路由数: ${routes.length}\n`;
  markdown += `- 类别数: ${Object.keys(byCategory).length}\n\n`;

  return markdown;
}

function generateOpenAPISpec(routes) {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "OracleMonitor API",
      version: "1.0.0",
      description: "Universal Oracle Monitoring Platform API",
      contact: {
        name: "API Support",
        email: "api@oracle-monitor.foresight.build",
      },
    },
    servers: [
      {
        url: "/api",
        description: "Current server",
      },
    ],
    paths: {},
    tags: [],
  };

  const categories = new Set();

  for (const route of routes) {
    const category = categorizeRoute(route.routePath);
    categories.add(category);

    if (!spec.paths[route.routePath]) {
      spec.paths[route.routePath] = {};
    }

    for (const method of route.methods) {
      spec.paths[route.routePath][method.toLowerCase()] = {
        summary: `${method} ${route.routePath}`,
        description: `Endpoint for ${method} requests to ${route.routePath}`,
        tags: [category],
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
  }

  spec.tags = Array.from(categories).sort().map((name) => ({
    name,
    description: `${name} operations`,
  }));

  return spec;
}

function generateApiDocumentation() {
  console.log("🔍 Scanning API routes...\n");

  const routes = findRouteFiles(ROUTE_DIR);

  console.log(`📝 Found ${routes.length} API routes\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 生成 Markdown 文档
  const markdown = generateMarkdown(routes);
  const markdownPath = path.join(OUTPUT_DIR, "api-routes.md");
  fs.writeFileSync(markdownPath, markdown);
  console.log(`✅ Generated API documentation: ${markdownPath}\n`);

  // 生成 OpenAPI 规范
  const openApiSpec = generateOpenAPISpec(routes);
  const jsonPath = path.join(OUTPUT_DIR, "openapi.json");
  fs.writeFileSync(jsonPath, JSON.stringify(openApiSpec, null, 2));
  console.log(`✅ Generated OpenAPI spec: ${jsonPath}\n`);

  // 统计信息
  console.log("📊 Route Summary:");
  console.log("================\n");

  const categoryCount = {};
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

function main() {
  try {
    generateApiDocumentation();
  } catch (error) {
    console.error("Error generating API documentation:", error);
    process.exit(1);
  }
}

main();
