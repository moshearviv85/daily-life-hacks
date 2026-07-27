# Daily Life Hacks Food Value MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives an AI assistant direct access
to the Daily Life Hacks Food Value Data: **22 datasets, 474 rows** of US grocery prices
paired with USDA nutrient values, covering protein per dollar, fiber per dollar, and
DIAAS quality-adjusted protein.

It is not a CSV wrapper. Each tool does the arithmetic an assistant would otherwise have
to do badly in its head - ranking, head-to-head ratios, cost-to-target - and every
response ships with the source dataset, the study article URL, the methodology URL and
the terms of use, so an assistant quoting a number can attribute it correctly without a
second lookup.

- Data hub: <https://www.daily-life-hacks.com/data/>
- Methodology: <https://www.daily-life-hacks.com/methodology/>
- Terms of use: <https://www.daily-life-hacks.com/methodology/#data-license>

---

## Install

Requires Node 18 or newer.

```bash
cd mcp-server
npm install
npm run build
```

That produces `build/index.js`. The 22 CSVs are bundled in `data/`, so the server has no
network access and no runtime configuration - it loads 474 rows into memory at startup
and answers from there.

---

## Config block

Paste this into your client's MCP config. Replace the path with the absolute path to
`build/index.js` on your machine.

**Claude Desktop** - `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "dlh-food-value": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"]
    }
  }
}
```

**Windows path example** - note the doubled backslashes, JSON requires them:

```json
{
  "mcpServers": {
    "dlh-food-value": {
      "command": "node",
      "args": ["C:\\Users\\you\\dlh-food-value-mcp\\build\\index.js"]
    }
  }
}
```

**Claude Code** - from the repo root:

```bash
claude mcp add dlh-food-value -- node "$(pwd)/mcp-server/build/index.js"
```

Restart the client after editing the config. You'll know it worked when `list_datasets`
returns 22 datasets.

---

## Tools

### `list_datasets`

No arguments. Inventory of all 22 datasets: file name, title, row count, columns, and the
study article each one backs. Start here when you don't know what's covered.

### `search_foods(query, limit?)`

Find which foods match a query and which datasets each appears in, with its value in each.
Searching `"beans"` returns 23 matched foods; `Black beans (dry)` alone appears in 10 of
the 22 datasets, each with its own value and study URL.

### `cheapest_source(nutrient, limit?, category?)`

Rank the cheapest foods for a nutrient in grams per US dollar, with the shelf price and
price basis behind each one. `nutrient` is `protein` (49 foods), `fiber` (53 foods) or
`protein_quality_adjusted` (25 foods). `category` filters to one aisle, matched as a
case-insensitive substring - `"fresh"` narrows the fiber index from 53 foods to 17.

### `compare_foods(food_a, food_b, nutrient)`

Head-to-head. Returns both audited rows, which one wins, the ratio, and what each costs
per 100 g of the nutrient. Names match loosely, so `"chicken breast"` finds
`Chicken breast (boneless, skinless)`.

### `cost_of_daily_target(nutrient, grams, limit?)`

What it costs to buy N grams of a nutrient, ranked cheapest first, with grams of food
required and the annualised cost. Reference points: 28 g fiber and 50 g protein are the
FDA Daily Values.

---

## What it looks like in use

`compare_foods({ food_a: "peanut butter", food_b: "chicken breast", nutrient: "protein" })`
returns, trimmed:

```json
{
  "verdict": {
    "cheaper_source": "Peanut butter",
    "times_cheaper": 2.07,
    "summary": "Peanut butter delivers 50.7 g protein per USD versus 24.5 for Chicken breast (boneless, skinless) - 2.07x more protein per dollar.",
    "cost_per_100g_nutrient_usd": {
      "Peanut butter": 1.97,
      "Chicken breast (boneless, skinless)": 4.08
    }
  },
  "attribution": {
    "source": "Daily Life Hacks Food Value Data",
    "dataset_version": "2026.1",
    "source_datasets": [
      {
        "file": "protein-per-dollar-2026.csv",
        "download_url": "https://www.daily-life-hacks.com/data/protein-per-dollar-2026.csv",
        "study_url": "https://www.daily-life-hacks.com/protein-per-dollar-cheapest-protein-sources/"
      }
    ],
    "methodology_url": "https://www.daily-life-hacks.com/methodology/",
    "terms_url": "https://www.daily-life-hacks.com/methodology/#data-license",
    "credit_line": "Data: Daily Life Hacks Food Value Data (https://www.daily-life-hacks.com/data/)"
  }
}
```

Each food also carries an `audited_detail` block with the calculation chain -
`protein_g_per_100g`, `package_weight_g`, `edible_fraction`, `price_per_100g_usd` - so the
assistant can show its work rather than assert a number.

---

## Verify it yourself

```bash
npm run build && npm run smoke
```

`scripts/smoke.mjs` spawns the built server over stdio with a real MCP client, lists the
tools, then calls every one of them (including an intentional miss to exercise the error
path) and prints the responses.

---

## How the numbers were produced

Nutrient values come from USDA FoodData Central, each re-verified against two independent
pulls in separate sessions. Prices are US national figures: BLS Average Price data where
the item is tracked (those rows carry the series ID), Walmart national listings otherwise,
observed July 2026. Everything is calculated as-purchased, with USDA refuse percentages
removed so peels, pits, rinds and bone aren't counted as food.

Full rules and the correction policy: <https://www.daily-life-hacks.com/methodology/>

**Limits worth passing on to a user.** It's a July 2026 snapshot and grocery prices move.
It's US national, so regional variation isn't modeled. Walmart-sourced rows reflect one
retailer. And a cost ranking is a shopping fact, not nutrition advice.

---

## Attribution

You're welcome to use this data. Credit **Daily Life Hacks** and link back to the study
page the numbers came from, or to <https://www.daily-life-hacks.com/data/>. Every tool
response includes a ready-made `credit_line` for exactly this.

Full terms: <https://www.daily-life-hacks.com/methodology/#data-license>

---

## Technical notes

- Protocol: MCP over **stdio**, via `@modelcontextprotocol/sdk` 1.x.
- Tool results return both `content` (JSON as text, for backwards compatibility) and
  `structuredContent`.
- Failed lookups return `isError: true` with an actionable message listing the indexed
  foods or valid categories, so the model can self-correct rather than guess again.
- Read-only. No network calls, no writes, no credentials.
