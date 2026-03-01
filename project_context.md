# Daily Life Hacks (DLH) - Project Context & AI Handoff
*Last Updated: March 2026*

## 🎯 Purpose of this Document
This file serves as the **Single Source of Truth** for the project's current state, architecture, and immediate next steps. 
**If you are an AI assistant (Claude, Gemini, etc.) reading this file on a new machine:** Please read this entire document to orient yourself before executing commands or making structural changes. Always update this document when significant milestones are achieved or architectural decisions change.

---

## 🏗️ Project Overview & Tech Stack
- **Project Name:** Daily Life Hacks (`dlh-fresh`)
- **Framework:** [Astro](https://astro.build) (Static Site Generation/Hybrid)
- **Styling:** Tailwind CSS (Vanilla CSS also utilized where necessary)
- **Primary Language:** TypeScript / JavaScript / HTML
- **Hosting & Deployment:** Cloudflare Pages (Auto-deployed from GitHub `main` branch)
- **Core Functionality:** A content site (Nutrition, Recipes, Tips) monetized heavily through Pinterest affiliate marketing and eventually products (Etsy, etc.).

---

## ✅ Recently Completed Tasks
1. **Newsletter Popup (`NewsletterPopup.astro`):** 
   - Converted display logic to occur once per browser session using `sessionStorage.getItem("newsletter_popup_shown")`.
   - Removed the previous 7-day suppression limit (`localStorage`).
2. **Base Configuration:** 
   - Set up and pushed the full project repository to GitHub.

---

## 🚀 Immediate Next Pending Task (Priority: High)
**Advanced Pinterest URL Routing & Tracking Setup via Cloudflare Pages Functions**

**The Problem:** Pinterest penalizes spam if identical links are continually posted. However, using query parameters (like `?pin=1`) works but risks exposing ugly URLs or being caught by smarter algorithms. Furthermore, Google SEO is compromised by duplicate content if not handled correctly.
**The Goal:** Build a "Smart Router" that allows clean URL variations in Pinterest (e.g., `/tips/batch-cooking-v1`, `/tips/batch-cooking-v2`) which all secretly feed from the base Astro page (`/tips/batch-cooking`), without changing the visible URL for the user, yet updating canonical tags for Google. Also, adding the capability to redirect specific variations to external sites (like Etsy) later, tracking clicks seamlessly.

### Implementation Architecture Plan (Approved by User):
1. **Cloudflare Routing Interceptor (`functions/[[path]].js`):**
   - Create a global catcher function in Cloudflare Pages.
   - If someone visits a Pinterest variation (e.g., `/tips/batch-cooking-v1?board=xyz`), the function will query a mapping datastore (Cloudflare KV or dictionary).
   - If mapped as internal content, the function transparently responds with the HTML from `/tips/batch-cooking`.
   - If mapped as an external link (e.g., Etsy), it fires a redirect.
2. **`BaseLayout.astro` Canonical Update:**
   - Must modify the canonical `<link rel="canonical" href={...} />` to explicitly use `new URL(Astro.url.pathname, Astro.site).href` (stripping parameters / suffix variations) so Google only indexes the pure base path.
3. **Advanced Tracking & Analytics:**
   - Intercepted requests in the Cloudflare Function will parse query parameters (`board`, `campaign`, etc.) and log them into **Cloudflare D1** (SQL database) or Cloudflare Analytics Engine.
   - **Grafana Integration:** We will connect Grafana directly to the Cloudflare D1 instance to visualize real-time tracking tables (Clicks by URL variation, boards, campaigns) without building complex internal dashboards.

---

## 🛠️ Instructions for the AI Assistant
1. **Rule #1:** When working on this specific repository (`dlh-fresh`), prioritize clean aesthetics and performance as per standard Astro conventions. Do not use generic styling.
2. **Rule #2:** If modifying endpoints, ensure the logic aligns with Cloudflare Pages Functions syntax. 
3. **Rule #3:** If completing the "Immediate Next Pending Task", proceed by creating the `functions/[[path]].js` logic and modifying the `canonicalURL` in `BaseLayout.astro` as planned.

---
**End of File.**
