"""Extract full ip2location demo page data via AdsPower CDP."""
import time
import re
from playwright.sync_api import sync_playwright

CDP_WS = "ws://127.0.0.1:38034/devtools/browser/24099bf3-9e8d-40bc-b2cf-32cf141aa30f"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP_WS)
    ctx = browser.contexts[0]
    pages = ctx.pages

    real_page = None
    for pg in pages:
        if pg.url.startswith("http") and "adspower" not in pg.url and "devtools" not in pg.url:
            real_page = pg
            break
    if real_page is None:
        real_page = ctx.new_page()

    real_page.goto("https://www.ip2location.com/demo", wait_until="domcontentloaded", timeout=30000)
    time.sleep(4)

    body = real_page.locator("body").inner_text()

    fields = [
        "IP Address", "Country", "Region", "City", "Latitude", "Longitude",
        "ISP", "Domain", "Net Speed", "IDD Code", "Area Code", "Weather Station",
        "Mobile Country Code", "Mobile Network Code", "Mobile Brand", "Elevation",
        "Usage Type", "Address Type", "Category", "ASN", "AS Name",
        "Anonymous Proxy", "Proxy Country", "Proxy Region", "Proxy City",
        "Proxy ISP", "Proxy Domain", "Proxy Usage Type", "Proxy Type",
        "Proxy ASN", "Threat", "Last Seen", "Provider", "Fraud Score",
    ]

    print("\n========== ALL FIELDS FROM ip2location.com/demo ==========")
    for kw in fields:
        pattern = re.compile(rf"^\s*{re.escape(kw)}\s+(.+?)$", re.MULTILINE)
        m = pattern.search(body)
        if m:
            val = m.group(1).strip()
            if len(val) > 100:
                val = val[:100] + "..."
            print(f"  {kw:25s}: {val}")
    print("===========================================================\n")

    fs_match = re.search(r"Fraud Score\s+(\d+)", body)
    if fs_match:
        fs = int(fs_match.group(1))
        print(f"[*] EXTRACTED Fraud Score = {fs}")
        if fs > 34:
            print(f"[!] Score > 34 — proxy refresh recommended")
        else:
            print(f"[+] Score <= 34 — proxy is clean to use")
    else:
        print("[!] Could not parse Fraud Score from page")
