---
name: Content Rules Enforcement — Mandatory Skill Use
description: Content work must use the correct writing skill and obey CLAUDE.md content rules or it will be rejected
type: feedback
originSessionId: cool-elgamal-bc4a54
---
כשעובדים על תוכן לאתר (כתבות, דפי נחיתה, תבניות אימייל, meal plans, lead magnets) חובה:

1. **להשתמש בסקיל הכתיבה הייעודי** (לא לכתוב "מהראש")
2. **לא להבטיח דברים שלא קיימים** באתר/בפרודקט — שום הבטחות שווא
3. **לא להכניס disclaimer לתוך כתבות** — יש דף `/disclaimer` ייעודי
4. **לא להשתמש במילים אסורות** (em dashes, emojis, medical claims absolutes, AI words) — הרשימה המלאה ב-CLAUDE.md
5. **ללכת לפי Content Rules ב-CLAUDE.md עד הפרט האחרון**

**Why:** ב-2026-04-16 סשן קודם יצר את `/free-meal-plan` + 3 תוכניות PDF + welcome email. המשתמש ביטל ומחק הכל כי:
- Claude לא עבד עם סקיל הכתיבה
- כתב הבטחות/שקרים שהפרו את כללי האיסורים
- העבודה נמחקה ב-revert (commit 3a32e3e) + redirects (6c66a35, b9ae540)

**How to apply:** לפני שמתחילים כל משימת תוכן — לוודא שהסקיל הנכון פעיל, לקרוא את Content Rules ו-Anti-AI-Detection Rules ב-CLAUDE.md, ולא לכתוב מילה לפני שזה בתוקף. אם אין סקיל מתאים או שהמשתמש לא אישר את התוכן בפירוש — לעצור ולשאול.
