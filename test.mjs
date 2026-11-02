import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const client = new Client({ name: "smoke-test", version: "1" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/server.cjs"] }));
try {
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint));
  async function call(name, args) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError);
    return JSON.parse(result.content[0].text);
  }
  assert.equal((await call("lookup_hs_heading", {query: "6109"})).matches[0].code, "6109");
  assert.ok((await call("marketplace_requirements", {marketplace: "amazon"})).fields.length);
  assert.ok((await call("check_green_claims", {text: "Eco-friendly shoes"})).total);
  assert.equal((await call("check_green_claims", {text: "Blue cotton shirt"})).total, 0);
  console.log("Verified discovery and all three tools over stdio.");
} finally { await client.close(); }
