#!/usr/bin/env node
/**
 * Smoke test: spawns the built server over stdio using a real MCP client,
 * lists the tools, then calls every one of them and prints the responses.
 *
 *   npm run build && npm run smoke
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CALLS = [
  ["list_datasets", {}],
  ["search_foods", { query: "beans", limit: 4 }],
  ["cheapest_source", { nutrient: "protein", limit: 5 }],
  ["cheapest_source", { nutrient: "fiber", limit: 5, category: "fresh" }],
  ["compare_foods", { food_a: "peanut butter", food_b: "chicken breast", nutrient: "protein" }],
  ["compare_foods", { food_a: "pinto beans", food_b: "eggs", nutrient: "protein_quality_adjusted" }],
  ["cost_of_daily_target", { nutrient: "protein", grams: 50, limit: 5 }],
  ["cost_of_daily_target", { nutrient: "fiber", grams: 28, limit: 5 }],
  ["search_foods", { query: "unobtainium", limit: 3 }], // error path
];

const rule = (s) => console.log("\n" + "=".repeat(78) + `\n${s}\n` + "=".repeat(78));

const client = new Client({ name: "dlh-smoke-test", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(ROOT, "build", "index.js")],
  stderr: "pipe",
});

await client.connect(transport);
rule("CONNECTED");
console.log("server:", JSON.stringify(client.getServerVersion()));
console.log("capabilities:", JSON.stringify(client.getServerCapabilities()));

const { tools } = await client.listTools();
rule(`tools/list -> ${tools.length} tools`);
for (const t of tools) {
  console.log(`- ${t.name}  (${t.title})`);
  console.log(`  inputSchema.required: ${JSON.stringify(t.inputSchema.required ?? [])}`);
  console.log(`  inputSchema.properties: ${Object.keys(t.inputSchema.properties ?? {}).join(", ") || "(none)"}`);
}

for (const [name, args] of CALLS) {
  rule(`tools/call ${name}  ${JSON.stringify(args)}`);
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) {
    console.log("isError: true");
    console.log(res.content[0].text);
  } else {
    console.log(res.content[0].text);
  }
}

rule("DONE");
await client.close();
