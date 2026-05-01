import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

# Pegar 10 títulos pagos
resp = requests.get(f"{URL}/rest/v1/omie_raw?status=eq.PAGO&limit=10", headers=HEADERS)
data = resp.json()

for row in data:
    raw = row.get("raw_data", {})
    omie_id = row.get("omie_id")
    print(f"\n--- Titulo {omie_id} ---")
    # Procurar por qualquer chave que tenha "data" ou "dt" ou valor que pareça data
    for k, v in raw.items():
        if "data" in k.lower() or "dt" in k.lower() or (isinstance(v, str) and "/" in v and len(v) == 10):
            print(f"  {k}: {v}")
