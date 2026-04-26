import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, '..', 'src', 'data', 'articles');
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

// Start from today and go backwards
let currentDate = new Date('2026-02-28T00:00:00Z');

let count = 0;
// Sort files randomly so the categories get mixed dates instead of all 'A's clustered together
const shuffledFiles = files.sort(() => Math.random() - 0.5);

for (const file of shuffledFiles) {
    const filePath = path.join(articlesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.match(/^date:\s*\d{4}-\d{2}-\d{2}/m)) {
        const yyyy = currentDate.getUTCFullYear();
        const mm = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getUTCDate()).padStart(2, '0');
        const newDate = `${yyyy}-${mm}-${dd}`;

        content = content.replace(/^date:\s*\d{4}-\d{2}-\d{2}/m, `date: ${newDate}`);
        fs.writeFileSync(filePath, content, 'utf-8');

        // Subtract 1 or 2 days randomly to spread them out, ensuring they are always unique
        const daysToSubtract = Math.floor(Math.random() * 2) + 1;
        currentDate.setUTCDate(currentDate.getUTCDate() - daysToSubtract);
        count++;
    }
}

console.log(`Updated dates in ${count} files.`);
