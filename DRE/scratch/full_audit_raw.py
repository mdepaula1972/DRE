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

# Selecionar 3 registros com todos os campos
url = f"{SUPABASE_URL}/rest/v1/omie_raw?select=*&limit=3"

print(f"--- Auditoria de 3 lançamentos (Full Columns) ---")
try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        for i, r in enumerate(data):
            print(f"\n========================================")
            print(f"LANÇAMENTO #{i+1} - ID Omie: {r['omie_id']}")
            print(f"========================================")
            print(f"EMPRESA: {r['empresa_nome']}")
            print(f"STATUS: {r['status']}")
            print(f"VALOR TOTAL: R$ {r['valor_total']}")
            print(f"VALOR ALOCADO (DEPTO): R$ {r['valor_alocado']}")
            print(f"DATA REGISTRO: {r['data_registro']}")
            print(f"DATA VENCIMENTO: {r['data_vencimento']}")
            print(f"DATA PAGAMENTO: {r['data_pagamento']}")
            print(f"CATEGORIA: {r['categoria_codigo']}")
            print(f"PROJETO: {r['projeto_nome']}")
            print(f"DEPARTAMENTO: {r['departamento_nome']} ({r['departamento_codigo']})")
            print(f"Nº DOCUMENTO: {r['numero_documento']}")
            print(f"\n--- RAW DATA (JSON ORIGINAL OMIE) ---")
            # Mostrar apenas o essencial do raw_data para não poluir demais
            raw = r['raw_data']
            print(json.dumps(raw, indent=2, ensure_ascii=False))
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
