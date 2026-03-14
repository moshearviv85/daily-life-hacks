import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("No GEMINI_API_KEY found in .env")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
response = requests.get(url)

if response.status_code == 200:
    models = response.json().get('models', [])
    print(f"Found {len(models)} models:")
    for model in models:
        print(f" - {model['name']} (version: {model.get('version', 'N/A')})")
        print(f"   Features: {', '.join(model.get('supportedGenerationMethods', []))}")
else:
    print(f"Error {response.status_code}: {response.text}")
