/**
 * Static chart for the dried-bean week planner.
 * Bars are the study cost of the dry pounds. The pound count is the label,
 * because every bean in the chart uses the same 6-cups-per-pound yield.
 */
import { householdWeeks, formatMoney } from "./bean-week-math.js";
import { loadBeanWeekPrices } from "./bean-week-prices.js";

const SERIES = [
  { key: "pinto", label: "Pinto, BLS July 2026", color: "#F29B30" },
  { key: "black", label: "Black beans, BLS July 2026", color: "#2F3542" },
  { key: "brownLentils", label: "Brown lentils, Walmart bag", color: "#8C5A2B" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function beanWeekChartSvg(prices = loadBeanWeekPrices()) {
  const rows = householdWeeks(prices);
  const maxCost = 7;
  const barX = 310;
  const barMax = 640;
  const barH = 26;
  const barGap = 8;
  const groupGap = 28;
  const top = 176;
  const groupHeight = SERIES.length * (barH + barGap) - barGap;

  const bars = [];
  rows.forEach((row, groupIndex) => {
    const groupY = top + groupIndex * (groupHeight + groupGap);
    const labelY = groupY + groupHeight / 2;
    bars.push(
      `<text x="286" y="${labelY}" text-anchor="end" dominant-baseline="middle" font-size="18" font-weight="700" fill="#2F3542">${escapeXml(`${row.people} people`)}</text>`,
      `<text x="286" y="${labelY + 22}" text-anchor="end" dominant-baseline="middle" font-size="15" fill="#697386">${escapeXml(row.poundsLabel)} dry</text>`,
    );
    SERIES.forEach((series, seriesIndex) => {
      const cost = row.dry[series.key];
      const y = groupY + seriesIndex * (barH + barGap);
      const width = Math.max(2, (cost / maxCost) * barMax);
      bars.push(
        `<rect x="${barX}" y="${y}" width="${width.toFixed(1)}" height="${barH}" rx="4" fill="${series.color}"></rect>`,
        `<text x="${(barX + width + 10).toFixed(1)}" y="${y + barH / 2}" dominant-baseline="middle" font-size="15" font-weight="700" fill="#2F3542">${escapeXml(formatMoney(cost))}</text>`,
      );
    });
  });

  const legend = SERIES.map((series, index) => {
    const x = 48 + index * 280;
    return `<rect x="${x}" y="118" width="18" height="18" rx="3" fill="${series.color}"></rect><text x="${x + 26}" y="132" font-size="15" fill="#2F3542">${escapeXml(series.label)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img">
  <rect width="1200" height="720" fill="#ffffff"></rect>
  <text x="48" y="58" font-family="Inter, sans-serif" font-size="32" font-weight="700" fill="#2F3542">Dry pounds and July 2026 cost for a week</text>
  <text x="48" y="92" font-family="Inter, sans-serif" font-size="18" fill="#697386">Half a cup cooked per person, every day for 7 days</text>
  <g font-family="Inter, sans-serif">${legend}</g>
  <g font-family="Inter, sans-serif">${bars.join("")}</g>
  <text x="48" y="650" font-family="Inter, sans-serif" font-size="14" fill="#697386">1 pound dry is about 6 cups cooked, and about 2 cups dry. Bean Institute and University of Nebraska-Lincoln.</text>
  <text x="48" y="674" font-family="Inter, sans-serif" font-size="14" fill="#697386">Pinto and black prices are the BLS US average for July 2026. Brown lentils are the audited Walmart 16 oz bag in the same study.</text>
</svg>`;
}
