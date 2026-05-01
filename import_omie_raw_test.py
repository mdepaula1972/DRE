import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_omie_data(app_key, app_secret, limit=5):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [
            {
                "pagina": 1,
                "registros_por_pagina": limit,
                "filtrar_apenas_inclusao": "N"
            }
        ]
    }
    response = requests.post(url, json=payload)
    return response.json().get("conta_pagar_cadastro", [])

def format_date(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

def sync_to_supabase(records, empresa_nome):
    rows = []
    for r in records:
        # Extrair rateio por departamentos (distribuicao)
        dist = r.get("distribuicao", [])
        if not dist:
            # Se não houver rateio, cria uma linha padrão
            dist = [{"cCodDep": None, "cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento", 0)}]
        
        for d in dist:
            rows.append({
                "empresa_nome": empresa_nome,
                "omie_id": r.get("codigo_lancamento_omie"),
                "status": r.get("status_titulo"),
                "valor_total": r.get("valor_documento"),
                "valor_alocado": d.get("nValDep"),
                "data_registro": format_date(r.get("info", {}).get("dInc")),
                "data_vencimento": format_date(r.get("data_vencimento")),
                "data_pagamento": format_date(r.get("data_baixa")),
                "categoria_codigo": r.get("codigo_categoria"),
                "categoria_nome": "", # Seria necessário buscar na API de categorias
                "projeto_nome": r.get("nome_projeto"),
                "departamento_codigo": d.get("cCodDep"),
                "departamento_nome": d.get("cDesDep"),
                "numero_documento": r.get("numero_documento"),
                "raw_data": r
            })
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    url = f"{SUPABASE_URL}/rest/v1/omie_raw"
    resp = requests.post(url, json=rows, headers=headers)
    return resp.status_code

# Execução
print("--- Iniciando Importação de Teste (10 Lançamentos com Rateio) ---")

# MarBrasil
mar_key = os.getenv("OMIE_APP_KEY_MARBRASIL")
mar_sec = os.getenv("OMIE_APP_SECRET_MARBRASIL")
print("Buscando MarBrasil...")
mar_recs = get_omie_data(mar_key, mar_sec, 5)
sync_to_supabase(mar_recs, "Mar Brasil")

# DZM
dzm_key = os.getenv("OMIE_APP_KEY_DZM")
dzm_sec = os.getenv("OMIE_APP_SECRET_DZM")
print("Buscando DZM...")
dzm_recs = get_omie_data(dzm_key, dzm_sec, 5)
sync_to_supabase(dzm_recs, "DZM")

print("✅ Teste concluído. Verifique a tabela 'omie_raw' no Supabase.")
