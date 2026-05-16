import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

APP_KEY = os.getenv("OMIE_APP_KEY_DZM")
APP_SECRET = os.getenv("OMIE_APP_SECRET_DZM")

url = "https://app.omie.com.br/api/v1/financas/contapagar/"

payload = {
    "call": "ListarContasPagar",
    "app_key": APP_KEY,
    "app_secret": APP_SECRET,
    "param": [
        {
            "pagina": 1,
            "registros_por_pagina": 5,
            "filtrar_apenas_inclusao": "N",
            "filtrar_apenas_alteracao": "N"
        }
    ]
}

print(f"--- Buscando títulos para verificar status ---")
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        contas = data.get("conta_pagar_cadastro", [])
        for c in contas:
            print(f"ID: {c['codigo_lancamento_omie']} | Status Omie: {c['status_titulo']} | Valor: {c['valor_documento']}")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
