#!/bin/bash
# ==============================================
# Daily Life Hacks - Deploy Script
# Git init + push to GitHub + deploy to Cloudflare
# ==============================================

set -e

echo "========================================"
echo "  Daily Life Hacks - Deploy"
echo "========================================"

# --- CONFIG ---
REPO_NAME="daily-life-hacks"
GITHUB_USER="moshearviv85"

# --- STEP 1: Git Init ---
if [ ! -d ".git" ]; then
    echo ""
    echo "[1/5] Initializing git repository..."
    git init
    git branch -M main
else
    echo "[1/5] Git already initialized."
fi

# --- STEP 2: Create .env if API key exposed ---
if [ ! -f ".env" ]; then
    echo ""
    echo "[2/5] Creating .env file..."
    echo "# Google AI API Key" > .env
    echo "GEMINI_API_KEY=YOUR_KEY_HERE" >> .env
    echo "  .env created (already in .gitignore)"
else
    echo "[2/5] .env already exists."
fi

# --- STEP 3: Build site ---
echo ""
echo "[3/5] Building Astro site..."
npx astro build
echo "  Build successful!"

# --- STEP 4: Git add + commit ---
echo ""
echo "[4/5] Committing all files..."
git add -A
git commit -m "Initial deploy: 25 articles, full site

- Astro 5 + Tailwind v4
- 25 published articles (nutrition + recipes)
- SEO: sitemap, robots.txt, JSON-LD
- Dark mode, responsive design
- Pinterest save button integration"

# --- STEP 5: Push to GitHub ---
echo ""
echo "[5/5] Pushing to GitHub..."

if ! git remote | grep -q origin; then
    if [ -z "$GITHUB_USER" ]; then
        echo ""
        echo "ERROR: Set GITHUB_USER at the top of this script!"
        echo "  Then create a repo on GitHub named: $REPO_NAME"
        echo "  Then run this script again."
        exit 1
    fi
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

git push -u origin main

echo ""
echo "========================================"
echo "  Git push complete!"
echo "========================================"
echo ""
echo "NEXT STEPS:"
echo "  1. Go to https://dash.cloudflare.com"
echo "  2. Workers & Pages > Create > Pages > Connect to Git"
echo "  3. Select repo: $REPO_NAME"
echo "  4. Build settings:"
echo "       Framework: Astro"
echo "       Build command: npm run build"
echo "       Build output: dist"
echo "  5. Deploy!"
echo ""
echo "  After first Cloudflare setup, future deploys are automatic on git push."
echo ""
