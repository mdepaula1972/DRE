import os
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

APP_KEY = os.getenv("OMIE_APP_KEY_DZM")
APP_SECRET = os.getenv("OMIE_APP_SECRET_DZM")

url = "https://app.omie.com.br/api/v1/financas/contapagar/"

# Filtrar por vencimento futuro para achar títulos em aberto
venc_de = datetime.now().strftime("%d/%m/%Y")
venc_ate = (datetime.now() + timedelta(days=90)).strftime("%d/%m/%Y")

payload = {
    "call": "ListarContasPagar",
    "app_key": APP_KEY,
    "app_secret": APP_SECRET,
    "param": [
        {
            "pagina": 1,
            "registros_por_pagina": 10,
            "filtrar_por_vencimento_de": venc_de,
            "filtrar_por_vencimento_ate": venc_ate
        }
    ]
}

print(f"--- Buscando títulos EM ABERTO no Omie ---")
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        contas = data.get("conta_pagar_cadastro", [])
        for c in contas:
            print(f"ID: {c['codigo_lancamento_omie']} | Status Omie: {c['status_titulo']} | Vencimento: {c['data_vencimento']} | Valor: {c['valor_documento']}")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
