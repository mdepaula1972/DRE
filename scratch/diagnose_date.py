import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = { "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}" }
url = f"{SUPABASE_URL}/rest/v1/omie_raw?omie_id=eq.11432667238&select=data_registro,data_vencimento,data_pagamento,raw_data"

resp = requests.get(url, headers=headers).json()
if resp:
    r = resp[0]
    raw = r['raw_data']
    print(f"Data Registro (Tabela): {r['data_registro']}")
    print(f"Data Vencimento (Tabela): {r['data_vencimento']}")
    print(f"Data Pagamento (Tabela): {r['data_pagamento']}")
    print("\n--- Datas no JSON Bruto Omie ---")
    print(f"info.dInc (Inclusão): {raw.get('info', {}).get('dInc')}")
    print(f"data_vencimento: {raw.get('data_vencimento')}")
    print(f"data_previsao: {raw.get('data_previsao')}")
    print(f"data_emissao: {raw.get('data_emissao')}")
    print(f"data_entrada (Registro): {raw.get('data_entrada')}")
