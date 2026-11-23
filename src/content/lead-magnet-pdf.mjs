/**
 * Small WinAnsi PDF writer for the two lead magnets. No timestamps, so the
 * bytes stay stable. Degree signs are the only non-ASCII character allowed.
 */
import {
  FRIDGE_LIFE_SECTIONS,
  SMOKE_POINT_NOTES,
  SMOKE_POINT_PATH,
  SMOKE_POINT_ROWS,
} from "./lead-magnet-data.mjs";

export function encodePdfText(text) {
  let out = "";
  for (const ch of String(text)) {
    if (ch === "\\" || ch === "(" || ch === ")") out += `\\${ch}`;
    else if (ch === "°") out += "\\260";
    else if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126) out += ch;
    else throw new Error(`Cannot encode ${JSON.stringify(ch)} from ${JSON.stringify(text)}`);
  }
  return `(${out})`;
}

export function decodePdfLiterals(pdf) {
  const raw = Buffer.isBuffer(pdf) ? pdf.toString("latin1") : String(pdf);
  const parts = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
    let body = match[0].slice(1, -1);
    body = body.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(Number.parseInt(oct, 8)));
    body = body.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
    parts.push(body.replaceAll("\u00B0", "°"));
  }
  return parts.join("\n");
}

function wrap(text, size, width) {
  const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function paint(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Count 0 /Kids [] >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const kids = [];
  for (const stream of pages) {
    const bytes = Buffer.from(stream, "latin1");
    const contentId = add(`<< /Length ${bytes.length} >>\nstream\n${stream}\nendstream`);
    const pageId = add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
    kids.push(`${pageId} 0 R`);
  }
  objects[1] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(" ")}] >>`;

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

function layout(blocks) {
  const pages = [];
  let commands = [];
  let y = 752;

  const flush = () => {
    pages.push(commands.join("\n"));
    commands = [];
    y = 752;
  };

  const ensure = (height) => {
    if (y - height < 40) flush();
  };

  const textAt = (line, x, size, bold) => {
    const font = bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y.toFixed(2)} Tm ${encodePdfText(line)} Tj ET`);
  };

  for (const block of blocks) {
    if (block.type === "gap") {
      ensure(block.n);
      y -= block.n;
      continue;
    }
    if (block.type === "rule") {
      ensure(8);
      commands.push(`0.6 w 36 ${y.toFixed(2)} m 576 ${y.toFixed(2)} l S`);
      y -= 8;
      continue;
    }
    if (block.type === "row") {
      const size = block.size || 8;
      const leading = size + 2.5;
      const wrapped = block.cells.map((cell) => wrap(cell.text, size, cell.width));
      const height = Math.max(...wrapped.map((lines) => lines.length)) * leading;
      ensure(height + 1);
      wrapped.forEach((lines, index) => {
        const cell = block.cells[index];
        lines.forEach((line, lineIndex) => {
          const saved = y;
          y -= lineIndex * leading;
          textAt(line, cell.x, size, Boolean(cell.bold));
          y = saved;
        });
      });
      y -= height;
      continue;
    }

    const size = block.size || 10;
    const leading = size + 3;
    const lines = wrap(block.text, size, block.width || 530);
    ensure(lines.length * leading);
    for (const line of lines) {
      textAt(line, block.x || 36, size, Boolean(block.bold));
      y -= leading;
    }
  }
  if (commands.length) pages.push(commands.join("\n"));
  return paint(pages);
}

function oilCells(oil, point, source, bold = false) {
  return [
    { text: oil, x: 36, width: 250, bold },
    { text: point, x: 292, width: 90, bold },
    { text: source, x: 386, width: 186, bold },
  ];
}

export function buildSmokePointPdf() {
  const blocks = [
    { text: "Smoke Point Chart", size: 18, bold: true },
    {
      text: `22 lab readings copied from ${SMOKE_POINT_PATH}. Avocado and butter stay Not listed, the same as that table.`,
      size: 9,
    },
    { type: "gap", n: 6 },
    { type: "row", cells: oilCells("Oil", "Smoke point", "Where it comes from", true), size: 8 },
    { type: "rule" },
  ];
  for (const row of SMOKE_POINT_ROWS) {
    blocks.push({ type: "row", cells: oilCells(row.oil, row.point, row.source), size: 7.5 });
  }
  blocks.push({ type: "gap", n: 8 });
  blocks.push({ text: "Lab notes, from the same page", size: 11, bold: true });
  for (const note of SMOKE_POINT_NOTES) {
    blocks.push({ text: note, size: 8 });
  }
  blocks.push({
    text: "Refined numbers are not the cold-pressed bottle. The page's second table is the unrefined one.",
    size: 8,
  });
  return layout(blocks);
}

function pairCells(left, right, bold = false) {
  return [
    { text: left, x: 36, width: 340, bold },
    { text: right, x: 384, width: 190, bold },
  ];
}

export function buildFridgeLifePdf() {
  const blocks = [
    { text: "Fridge Life Card", size: 18, bold: true },
    {
      text: "Every line is copied from a page already on daily-life-hacks.com. The path under each heading is that page.",
      size: 9,
    },
    { type: "gap", n: 4 },
  ];
  for (const section of FRIDGE_LIFE_SECTIONS) {
    blocks.push({ text: section.title, size: 12, bold: true });
    blocks.push({ text: section.path, size: 8 });
    if (section.rows.length) {
      blocks.push({ type: "row", cells: pairCells("Item", "Fridge life", true), size: 8 });
      for (const [label, value] of section.rows) {
        blocks.push({ type: "row", cells: pairCells(label, value), size: 8 });
      }
    }
    for (const note of section.notes) {
      blocks.push({ text: note, size: 8 });
    }
    blocks.push({ type: "gap", n: 6 });
  }
  return layout(blocks);
}
