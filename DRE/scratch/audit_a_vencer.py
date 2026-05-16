import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# Buscar 3 títulos "A VENCER" no Supabase
url = f"{SUPABASE_URL}/rest/v1/omie_cp_allocations?status_titulo=eq.A VENCER&select=codigo_lancamento_omie,valor_alocado,competencia,status_titulo,empresa_nome&limit=3"

print(f"--- Auditando 3 lançamentos 'A VENCER' no Supabase ---")
try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
