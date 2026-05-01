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
            "registros_por_pagina": 50,
            "filtrar_apenas_inclusao": "N",
            "filtrar_apenas_alteracao": "N"
        }
    ]
}

print(f"--- Procurando títulos EM ABERTO/VENCIDOS no Omie ---")
try:
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        data = response.json()
        contas = data.get("conta_pagar_cadastro", [])
        found = False
        for c in contas:
            if c['status_titulo'] != 'PAGO':
                print(f"ACHEI! ID: {c['codigo_lancamento_omie']} | Status: {c['status_titulo']} | Vencimento: {c['data_vencimento']} | Valor: {c['valor_documento']}")
                found = True
        if not found:
            print("Não encontrei títulos em aberto nas últimas 50 posições. Tentando página 2...")
    else:
        print(f"Erro {response.status_code}: {response.text}")
except Exception as e:
    print(f"Exceção: {e}")
