import socket
import os
import platform
import subprocess

def check_diagnostics():
    print("=== Pinterest Architect 2026: Diagnostic Report ===")
    
    # 1. בדיקת תקשורת פנימית (מה שהאייג'נט צריך)
    print("\n[1] בודק תקשורת Localhost...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect(("127.0.0.1", 80)) # בדיקה כללית
        print("V תקשורת בסיסית תקינה.")
    except Exception as e:
        print(f"X תקשורת Localhost חסומה! ייתכן שה-Firewall מונע מהאייג'נט לדבר עם המערכת.")
    finally:
        s.close()

    # 2. בדיקת הרשאות כתיבה בתיקיית הפרויקט
    print("\n[2] בודק הרשאות בתיקייה המקומית...")
    test_file = "test_permission.tmp"
    try:
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        print("V יש הרשאות כתיבה מלאות בתיקייה.")
    except Exception as e:
        print(f"X אין הרשאת כתיבה! המחשב חוסם שינויים בתיקייה.")

    # 3. בדיקת מצב חומת האש (Windows Firewall)
    print("\n[3] בודק סטטוס Firewall...")
    try:
        output = subprocess.check_output("netsh advfirewall show currentprofile", shell=True).decode('utf-8', errors='ignore')
        if "ON" in output.upper():
            print("! חומת האש פעילה. וודא ש-VS Code ברשימת החריגים.")
        else:
            print("V חומת האש כבויה.")
    except:
        print("X לא ניתן לגשת להגדרות הפיירוול. ייתכן שאין הרשאות Admin.")

    # 4. בדיקת פורטים נפוצים של VS Code
    print("\n[4] בודק פורטים פתוחים להזרקת פקודות...")
    ports_to_check = [58575, 58576, 51221] # הפורטים שראינו בלוגים שלך
    for port in ports_to_check:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', port))
        if result == 0:
            print(f"V פורט {port} פתוח.")
        else:
            print(f"! פורט {port} סגור או בשימוש.")
        sock.close()

if __name__ == "__main__":
    check_diagnostics()