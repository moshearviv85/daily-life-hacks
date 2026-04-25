# Gemini Task: Fix Canonical URL in BaseLayout.astro

## Background
We're implementing a Pinterest Smart Routing system. Pinterest pins will link to versioned URLs like `/batch-cooking-for-beginners-weekly-guide-v1?board=healthy-recipes`. A Cloudflare Function (already built by Claude) intercepts these and serves the original article content.

**The SEO problem:** The current canonical URL includes query parameters and could include version suffixes, which creates duplicate content issues for Google.

## Your Task
Fix ONE line in `src/layouts/BaseLayout.astro`.

### Current Code (line 18):
```javascript
canonicalURL = Astro.url.href,
```

This passes through the full URL including query params (`?utm_content=v1`, `?board=xyz`), which tells Google these are separate pages. Bad for SEO.

### Replace With:
```javascript
canonicalURL = (() => {
  const base = new URL(Astro.url.pathname, Astro.site || Astro.url.origin);
  base.pathname = base.pathname.replace(/-v\d+\/?$/, '');
  if (base.pathname !== '/') base.pathname = base.pathname.replace(/\/$/, '');
  return base.href;
})(),
```

### What This Does:
1. **Strips query parameters** - Uses `Astro.url.pathname` (path only) instead of `Astro.url.href` (full URL with params)
2. **Strips version suffixes** - Removes `-v1`, `-v2`, etc. from the end of the path via regex
3. **Removes trailing slashes** - Clean URLs (except root `/`)
4. **Uses `Astro.site`** - Ensures the canonical always points to `https://www.daily-life-hacks.com` (configured in `astro.config.mjs`)

### Result:
| Input URL | Canonical Output |
|-----------|-----------------|
| `/batch-cooking-v1?board=xyz` | `https://www.daily-life-hacks.com/batch-cooking` |
| `/easy-breakfast?utm_content=v2` | `https://www.daily-life-hacks.com/easy-breakfast` |
| `/recipes/1` | `https://www.daily-life-hacks.com/recipes/1` |
| `/` | `https://www.daily-life-hacks.com/` |

## Important
- This is the ONLY file you need to change
- Do NOT touch any other files
- The canonical `<link>` tag is on line 30: `<link rel="canonical" href={canonicalURL} />` - that stays as is
- Follow the project's content rules in `CLAUDE.md` (no em dashes, contractions, etc.) if writing any text
