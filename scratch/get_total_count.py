import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Prefer": "count=exact" # Pedir a contagem exata
}

url = f"{SUPABASE_URL}/rest/v1/omie_raw?select=id&limit=1"

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        content_range = response.headers.get("Content-Range")
        if content_range:
            total = content_range.split("/")[-1]
            print(f"Total real de registros na omie_raw: {total}")
        else:
            print("Não foi possível obter a contagem total.")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
