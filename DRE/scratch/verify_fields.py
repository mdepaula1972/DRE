import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

url = f"{SUPABASE_URL}/rest/v1/omie_raw?select=id,empresa_nome,omie_id,status,categoria_nome,data_registro,projeto_nome,departamento_nome&limit=3"

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"--- Verificação de Campos Específicos ---")
        for r in data:
            print(f"ID Omie: {r['omie_id']}")
            print(f"  Reg: {r['data_registro']}")
            print(f"  Cat: {r['categoria_nome']}")
            print(f"  Proj: {r['projeto_nome']}")
            print(f"  Depto: {r['departamento_nome']}")
            print("-" * 20)
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
