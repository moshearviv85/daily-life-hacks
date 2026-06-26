import requests
import urllib.parse

def run_query(q):
    encoded = urllib.parse.quote_plus(q)
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={encoded}&hl=en&gl=us"
    print(f"URL: {url}")
    try:
        resp = requests.get(url, timeout=10)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_query("easy high fiber breakfast ideas for gut health")
    run_query("easy high fiber breakfast ideas for gut health for")
    run_query("easy high fiber breakfast ideas for gut ")
    run_query("high fiber meals for constipation relief")
    run_query("fiber")
