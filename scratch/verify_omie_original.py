import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

APP_KEY = os.getenv("OMIE_APP_KEY_DZM")
APP_SECRET = os.getenv("OMIE_APP_SECRET_DZM")

url = "https://app.omie.com.br/api/v1/financas/contapagar/"

payload = {
    "call": "ConsultarContaPagar",
    "app_key": APP_KEY,
    "app_secret": APP_SECRET,
    "param": [
        {
            "codigo_lancamento_omie": 11492810769
        }
    ]
}

print(f"--- Consultando ID 11492810769 no Omie (Original) ---")
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        # Campos de interesse: status_titulo, data_entrada (registro), data_baixa
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
