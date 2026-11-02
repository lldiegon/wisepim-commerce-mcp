# WISEPIM Commerce Reference MCP
Three offline, read-only tools for ecommerce product data. Runs locally with Node.js 22 or later. No credentials, telemetry, project access or outbound requests.

## Tools

- `lookup_hs_heading` — EU CN 2026 chapters and four-digit headings by code or English keywords. Candidates for review, without duty calculation or binding classification. Example: `{"query":"6109"}`
- `marketplace_requirements` — Published WISEPIM field checklists across 12 marketplaces and commerce channels. Verify category-specific requirements with the channel before submitting. Example: `{"marketplace":"amazon"}`
- `check_green_claims` — Screens copy in English, Dutch, German and French for phrases relevant to EU Directive 2024/825. Findings need human review. Example: `{"text":"Eco-friendly shoes","language":"en"}`

## Install
With Node.js 22 or later and npm installed, paste this configuration into your stdio MCP client. The first launch downloads the versioned package from GitHub Releases.

```json
{
  "mcpServers": {
    "wisepim-commerce": {
      "command": "npx",
      "args": [
        "--yes",
        "--package",
        "https://github.com/lldiegon/wisepim-commerce-mcp/releases/download/v1.0.0/wisepim-commerce-mcp-1.0.0.tgz",
        "wisepim-commerce-mcp"
      ]
    }
  }
}
```

Bundle-compatible clients can also open the **.mcpb** file from [Releases](https://github.com/lldiegon/wisepim-commerce-mcp/releases).

## Sources
- [WISEPIM HS reference](https://wisepim.com/hs-codes). English chapter and heading descriptions adapted from the EU Combined Nomenclature 2026, © European Union, [Implementing Regulation (EU) 2025/1926](https://eur-lex.europa.eu/eli/reg_impl/2025/1926/oj).
- [WISEPIM channel requirements](https://wisepim.com/channel-requirements). English field checklists packaged on 2 November 2026.
- WISEPIM phrase scanner and [Directive (EU) 2024/825](https://eur-lex.europa.eu/eli/dir/2024/825/oj). Screening covers textual signals only. It cannot establish legal compliance.

Registry name: io.github.lldiegon/wisepim-commerce-mcp
