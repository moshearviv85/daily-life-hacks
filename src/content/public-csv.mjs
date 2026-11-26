import { readFileSync } from "node:fs";
import { join } from "node:path";

/** RFC-4180-ish reader for files under public/. Quoted commas stay inside the field. */
export function readPublicCsv(relativePath) {
  const text = readFileSync(join(process.cwd(), "public", relativePath), "utf8").replace(/^\uFEFF/, "");
  const table = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) table.push(row);
      row = [];
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) table.push(row);
  }
  const headers = table[0].map((header) => header.trim());
  return table.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}
