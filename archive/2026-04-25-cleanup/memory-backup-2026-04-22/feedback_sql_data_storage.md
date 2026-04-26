---
name: SQL for All Pipeline Data
description: All pipeline data stored in SQLite — enables targeted model reads/writes per cell, prevents context loss
type: feedback
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
כל הדאטה של הפייפליין נשמר ב-SQLite (לא JSON/CSV).

**Why:** כשמודל צריך לקרוא או לכתוב דאטה, SQLite מאפשר לתת לו שאילתה ממוקדת — רק התא הספציפי שהוא צריך. ככה הקונטקסט לא הולך לאיבוד ואין הזיות מעומס מידע.

**How to apply:** סקריפטים חדשים משתמשים ב-SQLite (קובץ `pipeline-data/pipeline.db`). טבלאות נפרדות לכל ישות (topics, research, articles, images, pins). מיגרציה של pins.json/content-tracker.json ל-DB בהמשך.
