import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Funções para buscar nomes nas tabelas de dimensão do Supabase
def get_dim_maps():
    maps = {"categorias": {}, "projetos": {}}
    
    # Buscar Categorias
    resp_cat = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_categorias?select=codigo_categoria,descricao_categoria", headers=HEADERS)
    if resp_cat.status_code == 200:
        for item in resp_cat.json():
            maps["categorias"][item["codigo_categoria"]] = item["descricao_categoria"]
            
    # Buscar Projetos
    resp_proj = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_projetos?select=codigo_projeto,descricao_projeto", headers=HEADERS)
    if resp_proj.status_code == 200:
        for item in resp_proj.json():
            maps["projetos"][str(item["codigo_projeto"])] = item["descricao_projeto"]
            
    return maps

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

def sync_to_supabase(records, empresa_nome, dim_maps):
    rows = []
    for r in records:
        cat_cod = r.get("codigo_categoria")
        proj_cod = str(r.get("codigo_projeto"))
        
        dist = r.get("distribuicao", []) or [{"cCodDep": None, "cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento", 0)}]
        
        for d in dist:
            rows.append({
                "empresa_nome": empresa_nome,
                "omie_id": r.get("codigo_lancamento_omie"),
                "status": r.get("status_titulo"),
                "valor_total": r.get("valor_documento"),
                "valor_alocado": d.get("nValDep"),
                "data_registro": format_date(r.get("info", {}).get("dInc")), # DATA DE REGISTRO NF
                "data_vencimento": format_date(r.get("data_vencimento")),
                "data_pagamento": format_date(r.get("data_baixa")),
                "categoria_codigo": cat_cod,
                "categoria_nome": dim_maps["categorias"].get(cat_cod, cat_cod),
                "projeto_nome": dim_maps["projetos"].get(proj_cod, r.get("nome_projeto") or "Sem Projeto"),
                "departamento_codigo": d.get("cCodDep"),
                "departamento_nome": d.get("cDesDep"),
                "numero_documento": r.get("numero_documento"),
                "raw_data": r
            })
    
    # Limpar e inserir
    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{empresa_nome}", headers=HEADERS)
    requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)

# --- Execução ---
print("Carregando Dimensões do Supabase...")
dim_maps = get_dim_maps()
print(f"Mapeadas {len(dim_maps['categorias'])} categorias e {len(dim_maps['projetos'])} projetos.")

# MarBrasil
print("Processando MarBrasil (5 lançamentos)...")
sync_to_supabase(get_omie_data(os.getenv("OMIE_APP_KEY_MARBRASIL"), os.getenv("OMIE_APP_SECRET_MARBRASIL"), 5), "Mar Brasil", dim_maps)

# DZM
print("Processando DZM (5 lançamentos)...")
sync_to_supabase(get_omie_data(os.getenv("OMIE_APP_KEY_DZM"), os.getenv("OMIE_APP_SECRET_DZM"), 5), "DZM", dim_maps)

print("Finalizado.")
