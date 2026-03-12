# Publer Import Checklist

Use this when you upgrade Publer and import the next runway file.

## File To Upload
- `pipeline-data/pins-publer-final.csv`

## Before Import
1. Confirm the Publer workspace timezone is set to the U.S. market timezone you want to use.
2. Keep the current plan simple: 5 pins per day only.
3. Do not upload older files like `pins-export.csv` or `pins-publer-test4.csv`.

## Import Steps
1. Open the bulk CSV import flow in Publer.
2. Upload `pipeline-data/pins-publer-final.csv`.
3. If Publer asks for column mapping, map these fields:
   - `Date - Intl. format or prompt` -> schedule date
   - `Text` -> pin description/caption
   - `Link(s) - Separated by comma for FB carousels` -> destination URL
   - `Media URL(s) - Separated by comma` -> media URL
   - `Title - For the video, pin, PDF ..` -> pin title
   - `Alt text(s) - Separated by ||` -> alt text
   - `Pin board, FB album, or Google category` -> board

## Quick Validation
1. Check the first 5 scheduled rows before finalizing import.
2. Confirm dates begin on `2026-03-12`.
3. Confirm the scheduled times look naturally spread across the day.
4. Confirm boards are populated.
5. Confirm image previews load.

## What To Send Back
- Whether Publer accepted the CSV as-is or asked for mapping.
- Whether the timezone looked correct.
- If anything looked broken, send the exact field Publer complained about.
