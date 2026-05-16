import os
import requests
import json
from dotenv import load_dotenv
from pathlib import Path

env_path = Path("d:/DRE-V30 - LANÇAMENTOS FALHOS/.env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_records():
    url = f"{SUPABASE_URL}/rest/v1/omie_financas_unificado?empresa_nome=ilike.*Mar%20Brasil*&tipo_registro=eq.PAGAR&limit=1"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code != 200:
        print(f"Erro: {resp.text}")
        return

    data = resp.json()
    for m in data:
        print(json.dumps(m['raw_data'], indent=2))

if __name__ == "__main__":
    check_records()
