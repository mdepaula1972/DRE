import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def debug_omie():
    key = os.getenv("OMIE_APP_KEY_MARBRASIL")
    sec = os.getenv("OMIE_APP_SECRET_MARBRASIL")
    
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ListarContasPagar",
        "app_key": key,
        "app_secret": sec,
        "param": [{
            "pagina": 1,
            "registros_por_pagina": 5,
            "exibir_obs": "S",
            "exibir_projetos": "S",
            "filtrar_por_data_de": "01/01/2024",
            "filtrar_por_data_ate": datetime.now().strftime("%d/%m/%Y")
        }]
    }
    
    print("--- DEBUG OMIE ---")
    resp = requests.post(url, json=payload)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    if "faultstring" in data:
        print(f"ERRO: {data['faultstring']}")
    else:
        print(f"Sucesso! Encontrados {data.get('total_de_registros')} registros.")
        records = data.get("conta_pagar_cadastro", [])
        if records:
            print(f"Exemplo: {records[0].get('nm_cliente')} | Projeto: {records[0].get('nome_projeto')}")

debug_omie()
