import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

APP_KEY = os.getenv("OMIE_APP_KEY_DZM")
APP_SECRET = os.getenv("OMIE_APP_SECRET_DZM")

url = "https://app.omie.com.br/api/v1/financas/mf/"

payload = {
    "call": "ListarMovimentos",
    "app_key": APP_KEY,
    "app_secret": APP_SECRET,
    "param": [
        {
            "nPagina": 1,
            "nRegPorPagina": 5,
            "dDtPagtoDe": "01/01/2026",
            "dDtPagtoAte": "01/05/2026",
            "lDadosCad": True
        }
    ]
}

try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        with open("scratch/full_sample_mf.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Arquivo scratch/full_sample_mf.json gerado com sucesso!")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
