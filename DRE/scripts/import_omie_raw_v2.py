import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Cache simples para não sobrecarregar a API
categoria_cache = {}

def get_categoria_nome(app_key, app_secret, codigo):
    if codigo in categoria_cache: return categoria_cache[codigo]
    url = "https://app.omie.com.br/api/v1/geral/categorias/"
    payload = {
        "call": "ConsultarCategoria",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_categoria": codigo}]
    }
    try:
        resp = requests.post(url, json=payload).json()
        nome = resp.get("descricao", codigo)
        categoria_cache[codigo] = nome
        return nome
    except:
        return codigo

def get_omie_data(app_key, app_secret, limit=5):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"pagina": 1, "registros_por_pagina": limit}]
    }
    return requests.post(url, json=payload).json().get("conta_pagar_cadastro", [])

def format_date(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

def sync_to_supabase(records, empresa_nome, app_key, app_secret):
    rows = []
    for r in records:
        cat_nome = get_categoria_nome(app_key, app_secret, r.get("codigo_categoria"))
        dist = r.get("distribuicao", []) or [{"cCodDep": None, "cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento", 0)}]
        
        for d in dist:
            rows.append({
                "empresa_nome": empresa_nome,
                "omie_id": r.get("codigo_lancamento_omie"),
                "status": r.get("status_titulo"),
                "valor_total": r.get("valor_documento"),
                "valor_alocado": d.get("nValDep"),
                "data_registro": format_date(r.get("info", {}).get("dInc")), # DATA DE REGISTRO
                "data_vencimento": format_date(r.get("data_vencimento")),
                "data_pagamento": format_date(r.get("data_baixa")),
                "categoria_codigo": r.get("codigo_categoria"),
                "categoria_nome": cat_nome, # AGORA COM NOME
                "projeto_nome": r.get("nome_projeto") or "Sem Projeto",
                "departamento_codigo": d.get("cCodDep"),
                "departamento_nome": d.get("cDesDep"),
                "numero_documento": r.get("numero_documento"),
                "raw_data": r
            })
    
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    # Limpar teste anterior para não duplicar
    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{empresa_nome}", headers=headers)
    requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=headers)

# MarBrasil
print("Processando MarBrasil...")
sync_to_supabase(get_omie_data(os.getenv("OMIE_APP_KEY_MARBRASIL"), os.getenv("OMIE_APP_SECRET_MARBRASIL"), 5), 
                 "Mar Brasil", os.getenv("OMIE_APP_KEY_MARBRASIL"), os.getenv("OMIE_APP_SECRET_MARBRASIL"))

# DZM
print("Processando DZM...")
sync_to_supabase(get_omie_data(os.getenv("OMIE_APP_KEY_DZM"), os.getenv("OMIE_APP_SECRET_DZM"), 5), 
                 "DZM", os.getenv("OMIE_APP_KEY_DZM"), os.getenv("OMIE_APP_SECRET_DZM"))

print("✅ Re-importação concluída com Nomes e Data de Registro.")
