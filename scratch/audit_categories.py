import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}

print("--- VERIFICANDO CATEGORIAS ---")
resp = requests.get(f"{URL}/rest/v1/omie_dim_categorias?limit=1", headers=HEADERS)
if resp.status_code == 200:
    data = resp.json()
    if data:
        print(f"Colunas: {data[0].keys()}")
        print(f"Exemplo: {data[0]}")
    else:
        print("Tabela vazia!")
else:
    print(f"Erro: {resp.status_code} - {resp.text}")
