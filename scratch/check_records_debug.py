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
    # Buscando MOVIMENTOS vinculados ao título 7748370610
    url = f"{SUPABASE_URL}/rest/v1/omie_financas_unificado?raw_data->detalhes->>nCodTitulo=eq.7748370610"
    
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code != 200:
        print(f"Erro: {resp.text}")
        return

    data = resp.json()
    print(f"Total de registros encontrados para Mar Brasil: {len(data)}")
    
    matches = []
    for r in data:
        dates = [r.get('data_vencimento'), r.get('data_pagamento'), r.get('data_registro'), r.get('data_emissao'), r.get('data_previsao')]
        if any(d and start <= d <= end for d in dates):
            matches.append(r)
            
    print(f"\nRegistros no intervalo {start} a {end}: {len(matches)}")
    for m in matches:
        print(f"- [{m['tipo_registro']}] {m['cliente_fornecedor']} | Status: {m['status']} | Valor: {m['valor_alocado']} | Pagto: {m['data_pagamento']} | Venc: {m['data_vencimento']} | Registro: {m['data_registro']}")
        if m['status'] == 'PAGO' and not m['data_pagamento']:
            print(f"  RAW: {json.dumps(m['raw_data'], indent=2)}")
            break # Só um para ver

if __name__ == "__main__":
    check_records()
