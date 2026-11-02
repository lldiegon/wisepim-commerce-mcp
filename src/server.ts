import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import headings from "../data/headings.json";
import markets from "../data/markets.json";
import { scanProductCopy, MAX_SCAN_LENGTH } from "./greenClaims";

const server = new McpServer({ name: "wisepim-commerce-mcp", version: "1.0.0" });
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const result = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });

server.registerTool("lookup_hs_heading", {
  description: "Find EU CN 2026 chapters and four-digit headings by exact code or English description keywords. Returns up to 25 candidates for review.",
  annotations, inputSchema: { query: z.string().trim().min(1).max(120) },
}, ({ query }) => {
  const words = query.toLowerCase().split(/\s+/);
  const matches = headings.filter(([code, label]) => /^\d+$/.test(query)
    ? code === query : words.every(word => label.toLowerCase().includes(word)));
  return result({ total: matches.length, matches: matches.slice(0, 25).map(([code, description]) => ({
    code, description, url: "https://wisepim.com/hs-codes/" + code,
  })), source: "EU Combined Nomenclature 2026, © European Union, Regulation (EU) 2025/1926" });
});

server.registerTool("marketplace_requirements", {
  description: "Read the WISEPIM listing-field checklist for one marketplace, including required fields, formats and examples.",
  annotations, inputSchema: { marketplace: z.enum(Object.keys(markets) as [keyof typeof markets, ...(keyof typeof markets)[]]) },
}, ({ marketplace }) => result(markets[marketplace]));

server.registerTool("check_green_claims", {
  description: "Flag environmental claims in product copy for human review under Directive (EU) 2024/825. Phrase matching cannot assess evidence or establish legal compliance.",
  annotations, inputSchema: { text: z.string().trim().min(1).max(MAX_SCAN_LENGTH), language: z.enum(["en", "nl", "de", "fr"]).default("en") },
}, ({ text, language }) => result({
  ...scanProductCopy({ title: "", description: text, bullets: "" }, language),
  source: "https://eur-lex.europa.eu/eli/dir/2024/825/oj",
  interpretation: "Review flagged phrases in context. An empty result cannot establish compliance.",
}));
server.connect(new StdioServerTransport()).catch(error => { console.error(error); process.exitCode = 1; });
