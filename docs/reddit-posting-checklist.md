# Reddit Posting Checklist - Daily Life Hacks

Manual posting only. Do not automate from this repo.

## Post today (first 3, polished)

| # | Draft | Subreddit | Topic |
|---|-------|-----------|-------|
| 1 | `pipeline-data/reddit-drafts/01.md` | r/EatCheapAndHealthy | Fiber per dollar (53 foods) |
| 2 | `pipeline-data/reddit-drafts/02.md` | r/EatCheapAndHealthy | Protein per dollar (pintos vs breast vs eggs) |
| 3 | `pipeline-data/reddit-drafts/03.md` | r/mealprep | High fiber burrito bowl meal prep |

Post **01 and 02 on different days or spaced several hours apart** if both go in r/EatCheapAndHealthy. Do not drop identical energy twice in one morning.

Hold 04–10 until those three have 24h data.

## Before you hit submit

1. Paste **title + body only** from the draft (skip the `# Subreddit` header block).
2. Confirm the single soft link points at a live article on daily-life-hacks.com.
3. Keep the affiliation line casual and once: `I write at daily-life-hacks.com`
4. No em dashes, no supplements, no medical claims, no second links.
5. Open with a question or a useful table so the post stands alone if the link is ignored.

## Disclosure line (use once, casually)

> I write at daily-life-hacks.com.

Place it near the soft link, not as a footer sermon. If the sub is link-sensitive that day, post value-only and save the link for a reply if someone asks.

## After posting - update the log

File: `pipeline-data/reddit-log.csv`

For the matching row:

1. Fill `url` with the live Reddit post URL.
2. Confirm `link_used` matches what you actually pasted (or clear it if you posted no link).
3. Change notes from `status=draft_ready` to `status=posted`.
4. Leave `upvotes_24h` and `upvotes_7d` empty until those checkpoints.
5. At ~24h: fill `upvotes_24h`.
6. At ~7d: fill `upvotes_7d`.
7. Optional notes: removed/downvoted, strong comments, referral spike, email signup if known.

## Kill / double-down rules

- Double down on formats with ≥50 upvotes or a clear referral spike.
- Kill a format after two removals or two clear downvote failures.
- Never copy-paste the same body into a second sub.
