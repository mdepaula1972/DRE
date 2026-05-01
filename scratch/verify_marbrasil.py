import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# Usando Mar Brasil
APP_KEY = os.getenv("OMIE_APP_KEY_MARBRASIL")
APP_SECRET = os.getenv("OMIE_APP_SECRET_MARBRASIL")

url = "https://app.omie.com.br/api/v1/financas/contapagar/"

payload = {
    "call": "ConsultarContaPagar",
    "app_key": APP_KEY,
    "app_secret": APP_SECRET,
    "param": [
        {
            "codigo_lancamento_omie": 12233067095
        }
    ]
}

print(f"--- Consultando ID 12233067095 na Mar Brasil (Original) ---")
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"Status no Omie: {data.get('status_titulo')}")
        print(f"Data de Registro (dInc): {data.get('info', {}).get('dInc')}")
        print(f"Vencimento: {data.get('data_vencimento')}")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
