import os
import requests
import json
import time
import sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

# Caches globais
company_caches = {"Mar Brasil": {}, "DZM": {}}
project_maps = {"Mar Brasil": {}, "DZM": {}}
category_maps = {"Mar Brasil": {}, "DZM": {}}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def format_date(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except: return None

def load_category_map(name):
    log(f"Mapeando Categorias para {name}...")
    category_maps[name] = {}
    try:
        # Colunas corretas identificadas na auditoria: codigo_categoria, descricao_categoria
        params = {"empresa_nome": f"eq.{name}", "select": "codigo_categoria,descricao_categoria"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_categorias", headers=HEADERS, params=params)
        if resp.status_code == 200:
            for item in resp.json():
                cid = str(item["codigo_categoria"]).strip()
                category_maps[name][cid] = item["descricao_categoria"]
            log(f"  [OK] {len(category_maps[name])} categorias carregadas.")
    except Exception as e:
        log(f"  Erro nas Categorias: {e}")

def load_project_map(name):
    log(f"Mapeando Projetos para {name}...")
    project_maps[name] = {}
    try:
        params = {"empresa_nome": f"eq.{name}", "select": "codigo_projeto,descricao_projeto"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_projetos", headers=HEADERS, params=params)
        if resp.status_code == 200:
            for item in resp.json():
                pid = str(item["codigo_projeto"]).strip()
                project_maps[name][pid] = item["descricao_projeto"]
            log(f"  [OK] {len(project_maps[name])} projetos carregados.")
    except: pass

def load_supplier_cache(app_key, app_secret, name):
    log(f"Memorizando Fornecedores para {name}...")
    company_caches[name] = {}
    pagina = 1
    try:
        while True:
            url = "https://app.omie.com.br/api/v1/geral/clientes/"
            payload = {
                "call": "ListarClientes",
                "app_key": app_key,
                "app_secret": app_secret,
                "param": [{"pagina": pagina, "registros_por_pagina": 500}]
            }
            resp = requests.post(url, json=payload, timeout=40)
            if resp.status_code == 200:
                data = resp.json()
                for c in data.get("clientes_cadastro", []):
                    cid = str(c.get("codigo_cliente_omie"))
                    company_caches[name][cid] = c.get("nome_fantasia") or c.get("razao_social") or "Fornecedor"
                if pagina >= data.get("total_de_paginas", 0): break
                pagina += 1
            else: break
    except: pass
    log(f"  [OK] {len(company_caches[name])} fornecedores memorizados.")

def get_supplier_name_fallback(app_key, app_secret, client_id, empresa_nome):
    if not client_id: return "Fornecedor"
    cid_str = str(client_id)
    if cid_str in company_caches[empresa_nome]: return company_caches[empresa_nome][cid_str]
    
    url = "https://app.omie.com.br/api/v1/geral/clientes/"
    payload = {
        "call": "ConsultarCliente",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_cliente_omie": client_id}]
    }
    try:
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            name = data.get("nome_fantasia") or data.get("razao_social") or "Fornecedor"
            company_caches[empresa_nome][cid_str] = name
            return name
    except: pass
    return "Fornecedor"

def get_omie_page(app_key, app_secret, pagina):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{
            "pagina": pagina,
            "registros_por_pagina": 100,
            "exibir_obs": "S",
            "filtrar_por_data_de": "01/01/2020", # For ar carga profunda
            "filtrar_por_data_ate": datetime.now().strftime("%d/%m/%Y")
        }]
    }
    try:
        resp = requests.post(url, json=payload, timeout=50)
        if resp.status_code == 200: return resp.json()
    except: pass
    return {}

def sync_company(key_env, secret_env, name):
    key = os.getenv(key_env)
    sec = os.getenv(secret_env)
    if not key or not sec: return
    
    log(f"--- SINCRONIZA  O PROFUNDA {name.upper()} v.02.18 ---")
    load_category_map(name)
    load_project_map(name)
    load_supplier_cache(key, sec, name)
    
    first_data = get_omie_page(key, sec, 1)
    total_records = first_data.get("total_de_registros", 0)
    log(f"  Total de t tulos encontrados na Omie: {total_records}")
    
    if total_records == 0:
        log(f"  [!] Alerta: Nenhum t tulo encontrado para {name}.")
        return

    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}", headers=HEADERS)
    
    pagina = 1
    total_processed = 0
    while True:
        data = first_data if pagina == 1 else get_omie_page(key, sec, pagina)
        records = data.get("conta_pagar_cadastro", [])
        if not records: break
        
        rows = []
        for r in records:
            # 1. Fornecedor
            fornecedor = get_supplier_name_fallback(key, sec, r.get("codigo_cliente_fornecedor"), name)
            r["nm_cliente"] = fornecedor
            
            # 2. Projetos
            pid = str(r.get("codigo_projeto", "")).strip()
            projeto = project_maps[name].get(pid) or r.get("nome_projeto") or "Sem Projeto"
            r["nome_projeto"] = projeto
            
            # 3. Categorias (CORRE  O v.02.18)
            cat_id = str(r.get("codigo_categoria", "")).strip()
            categoria = category_maps[name].get(cat_id) or r.get("descricao_categoria") or cat_id or "Sem Categoria"
            r["descricao_categoria"] = categoria 
            
            # 4. Data Pagamento = Previso
            dt_pagamento_final = format_date(r.get("data_previsao"))
            
            dist = r.get("distribuicao", []) or [{"cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento")}]
            for d in dist:
                rows.append({
                    "empresa_nome": name,
                    "omie_id": r.get("codigo_lancamento_omie"),
                    "status": r.get("status_titulo"),
                    "valor_total": r.get("valor_documento"),
                    "valor_alocado": d.get("nValDep"),
                    "data_registro": format_date(r.get("data_entrada") or r.get("info", {}).get("dInc")),
                    "data_vencimento": format_date(r.get("data_vencimento")),
                    "data_pagamento": dt_pagamento_final,
                    "categoria_codigo": cat_id,
                    "categoria_nome": categoria,
                    "projeto_nome": projeto,
                    "departamento_nome": d.get("cDesDep"),
                    "raw_data": r
                })
        
        if rows:
            requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)
        
        total_processed += len(records)
        if pagina % 5 == 0: log(f"  P gina {pagina}: {total_processed} t tulos...")
        
        if pagina >= data.get("total_de_paginas", 0): break
        pagina += 1
        time.sleep(0.01)
    
    log(f"  [OK] {name} finalizada com {total_processed} t tulos.")

log("=== INICIANDO SINCRONIZA  O v.02.18 (CARGA PROFUNDA) ===")
sync_company("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil")
sync_company("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
log("=== FINALIZADO v.02.18 ===")
