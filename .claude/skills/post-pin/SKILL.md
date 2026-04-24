---
name: post-pin
description: Post a Pinterest pin via the Pinterest API or the auto-poster. Side-effect skill. Only invoke manually with /post-pin when the user explicitly asks to post a pin.
disable-model-invocation: true
---

# Post Pin — Side-Effect Skill

This skill is **manually invoked only**. Claude should NOT auto-invoke it based on context matching, because it has an external side effect (posts to Pinterest).

## When to Run

Only when the user explicitly types `/post-pin` or explicitly asks "post the next pin", "post pin X", etc.

## Flow

1. **Check queue state.** Query `pipeline-data/pipeline.db` (table: `pins`) for the next PENDING pin in the current 2-hour window.
2. **Verify image exists.** `ls public/images/pins/{slug}_v{variant}.jpg` must show the file.
3. **Verify article is live.** Check that `https://www.daily-life-hacks.com/{slug}` returns 200 (article was published).
4. **Refresh Pinterest token if stale.** Token lifetime is ~60 days. Refresh via the demo app at `https://www.daily-life-hacks.com/api/pinterest-demo` (password `testkey123`).
5. **POST to Pinterest.**
   - Endpoint: Pinterest API v5 `/pins` with Bearer token.
   - Board ID: from `pins.board` column mapped to one of the 3 active boards.
   - Media: upload image first, get media_id, then create pin.
6. **Update DB.** Set `status=POSTED`, `posted_at=now()`, `pinterest_pin_id=<response_id>`.

## Known Hazards

- **NULL `scheduled_time`** will jump queue. Check before posting.
- **Error 2786 "Unable to reach URL"** is transient. Retry 3 times before giving up.
- **D1 `mark_posted` timeout** has caused duplicates before (fix in commit `143951d`: 3 retries, 30s timeout). If the current script doesn't have this, STOP and ask before proceeding.

## Do Not Post If

- The article referenced by the pin is not live (404).
- The image file does not exist locally.
- The pin's `status` is already `POSTED`.
- More than 8 pins have been posted today (max daily cap).

## After Posting

Log the post to `.claude/logs/pins-posted.log` with timestamp, pin_id, pinterest_pin_id.

## Why This Is a Manual Skill

Posting is an external action visible to the world. The user must be the one to trigger it. Automated posting has previously caused duplicate pins due to mark_posted timeouts; the mandatory manual gate ensures the user sees each post.
