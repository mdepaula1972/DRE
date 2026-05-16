import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

with open("scratch/test_dzm_feb.py", "r") as f:
    pass # I already have the api call, I'll just rewrite it here

url = 'https://app.omie.com.br/api/v1/financas/contapagar/'
payload = {
    'call': 'ListarContasPagar',
    'app_key': os.getenv('OMIE_APP_KEY_DZM'),
    'app_secret': os.getenv('OMIE_APP_SECRET_DZM'),
    'param': [{
        'pagina': 1,
        'registros_por_pagina': 1,
        'filtrar_por_registro_de': '01/02/2026',
        'filtrar_por_registro_ate': '28/02/2026'
    }]
}

resp = requests.post(url, json=payload).json()
records = resp.get('conta_pagar_cadastro', [])
if not records:
    print("NO RECORDS FROM OMIE")
    exit()

r = records[0]

rows = []
dist = r.get("distribuicao") or [{"cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento")}]
for d in dist:
    rows.append({
        "empresa_nome": "DZM",
        "omie_id": r.get("codigo_lancamento_omie"),
        "status": r.get("status_titulo"),
        "valor_total": r.get("valor_documento"),
        "valor_alocado": d.get("nValDep"),
        "data_registro": r.get("data_entrada").split('/')[2] + "-" + r.get("data_entrada").split('/')[1] + "-" + r.get("data_entrada").split('/')[0] if r.get("data_entrada") else None,
        "data_vencimento": r.get("data_vencimento").split('/')[2] + "-" + r.get("data_vencimento").split('/')[1] + "-" + r.get("data_vencimento").split('/')[0] if r.get("data_vencimento") else None,
        "data_pagamento": r.get("data_previsao").split('/')[2] + "-" + r.get("data_previsao").split('/')[1] + "-" + r.get("data_previsao").split('/')[0] if r.get("data_previsao") else None,
        "categoria_codigo": str(r.get("codigo_categoria", "")).strip(),
        "categoria_nome": "Teste",
        "projeto_nome": "Teste",
        "departamento_nome": d.get("cDesDep"),
        "nm_cliente": "Fornecedor Teste",
        "raw_data": r
    })

print(f"Tentando inserir: {json.dumps(rows, indent=2)}")

res = requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)
print(f"Status Insert: {res.status_code}")
print(f"Response: {res.text}")
