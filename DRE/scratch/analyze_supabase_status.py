import os
import json
import requests
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# Verificar distribuição de status na tabela de alocações
url = f"{SUPABASE_URL}/rest/v1/omie_cp_allocations?select=status_titulo"

print(f"--- Analisando distribuição de status no Supabase (omie_cp_allocations) ---")
try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        stats = Counter([r['status_titulo'] for r in data])
        print(json.dumps(stats, indent=2))
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
