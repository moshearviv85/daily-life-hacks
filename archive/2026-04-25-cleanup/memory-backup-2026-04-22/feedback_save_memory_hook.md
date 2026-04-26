---
name: Save Memory Hook
description: הוק שמזריק תזכורת לקלוד לשמור לזיכרון כשהמשתמש כותב "שמור"
type: feedback
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
# Save Memory Hook

**Rule:** כשהמשתמש כותב "שמור" — חובה להשתמש ב-Write tool לפני כל תגובה אחרת.

**Why:** קלוד אמר "שמור" בלי לעשות כלום בפועל. זה גרם לאובדן קונטקסט בין התכתבויות.

**How to apply:** הוק ב-`settings.json` מריץ `C:\Users\offic\.claude\hooks\save-memory-reminder.py` שמזריק הוראה מפורשת לקונטקסט. אם ההוק לא פעיל — עדיין חובה לבצע Write tool ידנית לפני התגובה.

**קבצים רלוונטיים:**
- `C:\Users\offic\.claude\hooks\save-memory-reminder.py` — סקריפט ההוק
- `C:\Users\offic\.claude\settings.json` — הגדרת ה-UserPromptSubmit hook
