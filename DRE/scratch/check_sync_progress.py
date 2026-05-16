import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

for emp in ["Mar Brasil", "DZM"]:
    resp = requests.get(f"{URL}/rest/v1/omie_raw?empresa_nome=eq.{emp}&select=count", headers=HEADERS, params={"Prefer": "count=exact"})
    count = resp.headers.get("Content-Range", "0-0/0").split("/")[-1]
    print(f"{emp}: {count} registros")
