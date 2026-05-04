import os
import requests
import json
import time
import sys
import argparse
from datetime import datetime, timedelta
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
        params = {"empresa_nome": f"eq.{name}", "select": "codigo_categoria,descricao_categoria"}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_categorias", headers=HEADERS, params=params)
        if resp.status_code == 200:
            for item in resp.json():
                cid = str(item["codigo_categoria"]).strip()
                category_maps[name][cid] = item["descricao_categoria"]
            log(f"  [OK] {len(category_maps[name])} categorias carregadas.")
    except: pass

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

def get_omie_page(app_key, app_secret, pagina, start_date, end_date):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ListarContasPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{
            "pagina": pagina,
            "registros_por_pagina": 100,
            "exibir_obs": "S",
            "filtrar_por_vencimento": "S",
            "filtrar_por_data_de": start_date,
            "filtrar_por_data_ate": end_date
        }]
    }
    try:
        resp = requests.post(url, json=payload, timeout=50)
        if resp.status_code == 200: return resp.json()
    except: pass
    return {}

def sync_period(month, year):
    # Definir o per odo (do dia 1 ao fim do m s)
    start_date = f"01/{month:02d}/{year}"
    # Aproxima  o para o fim do m s
    if month == 12: end_date = f"31/12/{year}"
    else:
        last_day = (datetime(year, month + 1, 1) - timedelta(days=1)).day
        end_date = f"{last_day:02d}/{month:02d}/{year}"
    
    log(f"=== INICIANDO AUDITORIA: {month:02d}/{year} ({start_date} at  {end_date}) ===")
    
    companies = [
        ("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil"),
        ("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
    ]
    
    for key_env, secret_env, name in companies:
        key = os.getenv(key_env)
        sec = os.getenv(secret_env)
        if not key or not sec: continue
        
        log(f"--- PROCESSANDO {name.upper()} ---")
        load_category_map(name)
        load_project_map(name)
        load_supplier_cache(key, sec, name)
        
        # Limpeza cir rgica no Supabase para este per odo e empresa
        # Filtramos por data_vencimento entre o per odo (formato YYYY-MM-DD no Supabase)
        iso_start = f"{year}-{month:02d}-01"
        iso_end = f"{year}-{month:02d}-{31 if month == 12 else (datetime(year, month + 1, 1) - timedelta(days=1)).day:02d}"
        
        log(f"  Limpando registros de {iso_start} a {iso_end} no Supabase...")
        del_url = f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}&data_vencimento=gte.{iso_start}&data_vencimento=lte.{iso_end}"
        requests.delete(del_url, headers=HEADERS)
        
        pagina = 1
        total_processed = 0
        while True:
            data = get_omie_page(key, sec, pagina, start_date, end_date)
            records = data.get("conta_pagar_cadastro", [])
            if not records: break
            
            rows = []
            for r in records:
                # Fornecedor
                fornecedor = get_supplier_name_fallback(key, sec, r.get("codigo_cliente_fornecedor"), name)
                r["nm_cliente"] = fornecedor
                
                # Projetos
                pid = str(r.get("codigo_projeto", "")).strip()
                projeto = project_maps[name].get(pid) or r.get("nome_projeto") or "Sem Projeto"
                r["nome_projeto"] = projeto
                
                # Categorias
                cat_id = str(r.get("codigo_categoria", "")).strip()
                categoria = category_maps[name].get(cat_id) or r.get("descricao_categoria") or "Sem Categoria"
                r["descricao_categoria"] = categoria 
                
                # Data Pagamento = Previso
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
            if pagina % 2 == 0: log(f"  P gina {pagina}: {total_processed} t tulos...")
            
            if pagina >= data.get("total_de_paginas", 0): break
            pagina += 1
            time.sleep(0.05)
        
        log(f"  [OK] {name} finalizada com {total_processed} t tulos para {month:02d}/{year}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sincroniza  o Omie por Per odo (M s/Ano)")
    parser.add_argument("--month", type=int, help="M s (1-12)")
    parser.add_argument("--year", type=int, help="Ano (ex: 2024)")
    args = parser.parse_args()
    
    if args.month and args.year:
        sync_period(args.month, args.year)
    else:
        # Se n o passar argumentos, sincroniza o m s atual por padr o
        now = datetime.now()
        sync_period(now.month, now.year)
