import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

print("--- AUDIT: PROCURANDO FLASH APP NA TABELA OMIE_RAW ---")
url = f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.DZM&select=omie_id,valor_total,categoria_codigo,categoria_nome,data_vencimento,raw_data"
res = requests.get(url, headers=HEADERS)

if res.status_code == 200:
    records = [r for r in res.json() if "FLASH" in str(r.get("raw_data", {})).upper()]
    print(f"Encontrados {len(records)} registros para FLASH na DZM:")
    for r in records[:5]:
        print(f"- ID: {r.get('omie_id')} | Fornecedor: {r.get('nm_cliente')} | R$ {r.get('valor_total')} | Venc: {r.get('data_vencimento')}")
        print(f"  -> Categoria Mapeada no Dashboard: [{r.get('categoria_codigo')}] {r.get('categoria_nome')}")
else:
    print(f"Erro: {res.text}")

print("\n--- AUDIT: CATEGORIAS NO SUPABASE (DZM) ---")
# Check the specific categories
url2 = f"{SUPABASE_URL}/rest/v1/omie_dim_categorias?empresa_nome=eq.DZM&descricao_categoria=ilike.*Alimenta*&select=codigo_categoria,descricao_categoria"
res2 = requests.get(url2, headers=HEADERS)
if res2.status_code == 200:
    cats = res2.json()
    print("Categorias encontradas com 'Alimenta' na DZM:")
    for c in cats:
        print(f"- [{c.get('codigo_categoria')}] {c.get('descricao_categoria')}")
else:
    print(f"Erro: {res2.text}")
