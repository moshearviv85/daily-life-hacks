const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'src', 'data', 'articles');

function getRandomDate() {
    const start = new Date('2026-01-01').getTime();
    const end = new Date('2026-02-28').getTime();
    const randomTime = start + Math.random() * (end - start);
    const randomDate = new Date(randomTime);
    const yyyy = randomDate.getFullYear();
    const mm = String(randomDate.getMonth() + 1).padStart(2, '0');
    const dd = String(randomDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const files = fs.readdirSync(articlesDir);

let count = 0;
files.forEach(file => {
    if (file.endsWith('.md')) {
        const filePath = path.join(articlesDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');

        // Check if the file has a date frontmatter
        if (content.match(/^date:\s*\d{4}-\d{2}-\d{2}/m)) {
            // Randomize the date
            const newDate = getRandomDate();
            content = content.replace(/^date:\s*\d{4}-\d{2}-\d{2}/m, `date: ${newDate}`);
            fs.writeFileSync(filePath, content, 'utf-8');
            count++;
        }
    }
});

console.log(`Updated dates in ${count} files.`);
