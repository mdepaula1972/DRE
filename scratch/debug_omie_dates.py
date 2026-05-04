import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

# We need to test Omie API directly to see why 04/05/2026 isn't coming.
# Let's check both DZM and Mar Brasil.
# First, get the keys from the env.
OMIE_APP_KEY_DZM = os.getenv("OMIE_APP_KEY_DZM")
OMIE_APP_SECRET_DZM = os.getenv("OMIE_APP_SECRET_DZM")
OMIE_APP_KEY_MAR = os.getenv("OMIE_APP_KEY_MAR")
OMIE_APP_SECRET_MAR = os.getenv("OMIE_APP_SECRET_MAR")

def check_omie(company_name, app_key, app_secret):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    
    print(f"\n--- Checking {company_name} ---")
    
    # Try filtering by registro
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{
            "pagina": 1,
            "registros_por_pagina": 500,
            "filtrar_por_registro_de": "01/05/2026",
            "filtrar_por_registro_ate": "31/05/2026"
        }]
    }
    res = requests.post(url, json=payload).json()
    registros = res.get("conta_pagar_cadastro", [])
    print(f"Por Registro (04/05): {len(registros)} titulos encontrados.")
    for r in registros:
        if "FLASH" in r.get("codigo_barras_fornecedor", "") or "FLASH" in str(r).upper():
            print(f"  -> FLASH ENCONTRADO POR REGISTRO: ID {r.get('codigo_lancamento_omie')} - Venc: {r.get('data_vencimento')} - Valor: {r.get('valor_documento')}")
            
    # Try filtering by inclusao
    payload["param"][0] = {
        "pagina": 1,
        "registros_por_pagina": 100,
        "filtrar_apenas_inclusao": "S"
        # Omie doesn't have filtrar_por_inclusao_de, it uses data_registro or data_vencimento
    }
    # Wait, let's just query everything and filter locally to find where this 1000.00 Flash App is.
    
    # Test a general text search if possible, or just a large range
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{
            "pagina": 1,
            "registros_por_pagina": 500,
            "filtrar_por_vencimento_de": "01/01/2026",
            "filtrar_por_vencimento_ate": "31/12/2026"
        }]
    }
    res = requests.post(url, json=payload).json()
    registros = res.get("conta_pagar_cadastro", [])
    print(f"Buscando tudo em 2026: {len(registros)} registros")
    for r in registros:
        if "FLASH" in str(r).upper():
            print(f"  -> ENCONTRADO! ID: {r.get('codigo_lancamento_omie')} | Venc: {r.get('data_vencimento')} | Emissão: {r.get('data_emissao')} | Previsão: {r.get('data_previsao')} | Registro: {r.get('data_registro')} | Cadastro: {r.get('info_cadastro', {}).get('data_inclusao')}")


check_omie("DZM", OMIE_APP_KEY_DZM, OMIE_APP_SECRET_DZM)
check_omie("Mar Brasil", OMIE_APP_KEY_MAR, OMIE_APP_SECRET_MAR)

