import requests
import urllib.parse

def test_query(q):
    encoded = urllib.parse.quote_plus(q)
    url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={encoded}&hl=en&gl=us"
    print(f"URL: {url}")
    try:
        resp = requests.get(url, timeout=10)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

test_query("easy high fiber breakfast ideas for gut health")
test_query("easy high fiber breakfast ideas for gut health for")
test_query("easy high fiber breakfast ideas for gut ")
test_query("high fiber meals for constipation relief")
test_query("fiber")
