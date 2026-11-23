import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFridgeLifePdf, buildSmokePointPdf } from "../src/content/lead-magnet-pdf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "downloads");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "smoke-point-chart.pdf"), buildSmokePointPdf());
fs.writeFileSync(path.join(dir, "fridge-life-card.pdf"), buildFridgeLifePdf());
console.log("wrote smoke-point-chart.pdf and fridge-life-card.pdf");
