/**
 * Read recipe article frontmatter without a YAML dependency.
 * Ingredient lines and ingredientsGrams are what the nutrition check needs.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function unquote(value) {
  const text = String(value ?? "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return text;
}

export function parseArticleFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return null;
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return null;
  const lines = markdown.slice(3, end).split("\n");
  const data = {};
  let index = 0;
  while (index < lines.length) {
    const match = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2];
    if (rest === "") {
      const items = [];
      let cursor = index + 1;
      if (cursor < lines.length && /^\s*-\s+\w+:/.test(lines[cursor])) {
        while (cursor < lines.length && /^\s*-\s+/.test(lines[cursor])) {
          const item = {};
          let fieldLine = lines[cursor].replace(/^\s*-\s+/, "");
          const first = fieldLine.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
          if (first) item[first[1]] = coerce(unquote(first[2]));
          cursor += 1;
          while (cursor < lines.length && /^\s{2,}\S/.test(lines[cursor]) && !/^\s*-\s+/.test(lines[cursor])) {
            const field = lines[cursor].trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
            if (field) item[field[1]] = coerce(unquote(field[2]));
            cursor += 1;
          }
          items.push(item);
        }
        data[key] = items;
        index = cursor;
        continue;
      }
      while (cursor < lines.length && /^\s*-\s+/.test(lines[cursor])) {
        let value = lines[cursor].replace(/^\s*-\s+/, "");
        cursor += 1;
        while (
          cursor < lines.length
          && /^\s+\S/.test(lines[cursor])
          && !/^\s*-\s+/.test(lines[cursor])
          && !/^[A-Za-z0-9_]+:/.test(lines[cursor])
        ) {
          value += ` ${lines[cursor].trim()}`;
          cursor += 1;
        }
        items.push(unquote(value));
      }
      if (items.length) {
        data[key] = items;
        index = cursor;
        continue;
      }
    }
    data[key] = coerce(unquote(rest));
    index += 1;
  }
  return data;
}

function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function isRecipeArticle(data) {
  if (!data) return false;
  const ingredients = Array.isArray(data.ingredients) && data.ingredients.length;
  const steps = Array.isArray(data.steps) && data.steps.length;
  if (data.category === "recipes") return Boolean(ingredients && steps);
  return Boolean(ingredients && steps && String(data.recipeCategory || "").trim());
}

export function loadRecipeArticles(articlesDir) {
  const recipes = [];
  for (const name of readdirSync(articlesDir).filter((file) => file.endsWith(".md")).sort()) {
    const path = join(articlesDir, name);
    const markdown = readFileSync(path, "utf8");
    const data = parseArticleFrontmatter(markdown);
    if (!isRecipeArticle(data)) continue;
    recipes.push({
      id: name.replace(/\.md$/, ""),
      path,
      markdown,
      data,
    });
  }
  return recipes;
}

export function yamlQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
