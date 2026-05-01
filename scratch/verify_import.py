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

url = f"{SUPABASE_URL}/rest/v1/omie_raw?select=id,empresa_nome,omie_id,status,valor_alocado,departamento_nome"

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Total de registros na omie_raw: {len(data)}")
        for r in data[:3]:
            print(f"- {r['empresa_nome']} | ID: {r['omie_id']} | Depto: {r['departamento_nome']} | Valor Alocado: {r['valor_alocado']}")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
