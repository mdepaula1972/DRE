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

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def format_date(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except: return None

def load_project_map(name):
    log(f"Carregando Mapa de Projetos para {name}...")
    try:
        project_maps[name] = {}
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_projetos?empresa_nome=eq.{name}&select=codigo_projeto,descricao_projeto", headers=HEADERS)
        if resp.status_code == 200:
            for item in resp.json():
                pid = str(item["codigo_projeto"]).strip()
                project_maps[name][pid] = item["descricao_projeto"]
            log(f"  [OK] {len(project_maps[name])} projetos mapeados.")
    except Exception as e:
        log(f"Erro ao carregar projetos: {e}")

def get_supplier_name(app_key, app_secret, client_id, empresa_nome):
    if not client_id: return "Fornecedor"
    cache = company_caches.get(empresa_nome, {})
    if str(client_id) in cache: return cache[str(client_id)]
    
    url = "https://app.omie.com.br/api/v1/geral/clientes/"
    payload = {
        "call": "ConsultarCliente",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_cliente_omie": client_id}]
    }
    try:
        resp = requests.post(url, json=payload, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            name = data.get("nome_fantasia") or data.get("razao_social") or "Fornecedor"
            cache[str(client_id)] = name
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
            "filtrar_por_data_de": "01/01/2024",
            "filtrar_por_data_ate": datetime.now().strftime("%d/%m/%Y")
        }]
    }
    try:
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code == 200: return resp.json()
    except: pass
    return {}

def sync_company(key_env, secret_env, name):
    key = os.getenv(key_env)
    sec = os.getenv(secret_env)
    if not key or not sec: return
    
    log(f"--- INICIANDO {name.upper()} v.02.13 ---")
    load_project_map(name)
    
    first_page = get_omie_page(key, sec, 1)
    if not first_page.get("conta_pagar_cadastro"):
        log(f"  [!] Abortando: Nenhuma resposta da Omie.")
        return

    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}", headers=HEADERS)
    
    pagina = 1
    total_processed = 0
    while True:
        data = first_page if pagina == 1 else get_omie_page(key, sec, pagina)
        records = data.get("conta_pagar_cadastro", [])
        if not records: break
        
        rows = []
        for i, r in enumerate(records):
            # Log de progresso a cada 20 t tulos para n o inundar o terminal
            if i % 20 == 0:
                print(".", end="", flush=True)

            cid = r.get("codigo_cliente_fornecedor")
            fornecedor = r.get("nm_cliente") or r.get("nome_cliente") or r.get("razao_social")
            if not fornecedor or fornecedor == "Fornecedor":
                fornecedor = get_supplier_name(key, sec, cid, name)
            
            r["nm_cliente"] = fornecedor
            pid = str(r.get("codigo_projeto", "")).strip()
            projeto = project_maps[name].get(pid) or r.get("nome_projeto") or "Sem Projeto"
            r["nome_projeto"] = projeto
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
                    "categoria_codigo": r.get("codigo_categoria"),
                    "categoria_nome": r.get("descricao_categoria") or r.get("codigo_categoria"),
                    "projeto_nome": projeto,
                    "departamento_nome": d.get("cDesDep"),
                    "raw_data": r
                })
        
        print(f" > Enviando lote {pagina}...")
        sys.stdout.flush()
        if rows:
            requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)
        
        total_processed += len(records)
        log(f"  [OK] P gina {pagina}: {total_processed} t tulos.")
        
        if pagina >= data.get("total_de_paginas", 0): break
        pagina += 1
        time.sleep(0.05)

log("=== INICIANDO SINCRONIZA  O v.02.13 ===")
sync_company("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil")
sync_company("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
log("=== FINALIZADO v.02.13 ===")
