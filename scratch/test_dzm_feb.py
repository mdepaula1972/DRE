import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

KEY = os.getenv('OMIE_APP_KEY_DZM')
SEC = os.getenv('OMIE_APP_SECRET_DZM')

def test_omie():
    url = 'https://app.omie.com.br/api/v1/financas/contapagar/'
    payload = {
        'call': 'ListarContasPagar',
        'app_key': KEY,
        'app_secret': SEC,
        'param': [{
            'pagina': 1,
            'registros_por_pagina': 10,
            'filtrar_por_data_registro': 'S',
            'filtrar_por_data_de': '01/02/2026',
            'filtrar_por_data_ate': '28/02/2026'
        }]
    }
    resp = requests.post(url, json=payload).json()
    print(f"Total Encontrado para Fev/2026: {resp.get('total_de_registros', 0)}")
    if resp.get('total_de_registros', 0) > 0:
        print(f"Primeiro registro: {resp['conta_pagar_cadastro'][0].get('codigo_lancamento_omie')}")

if __name__ == "__main__":
    test_omie()
