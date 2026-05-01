import os
import requests
import json
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_dim_maps(empresa_nome):
    maps = {"categorias": {}, "projetos": {}}
    log(f"Carregando Dimensões para {empresa_nome}...")
    try:
        resp_cat = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_categorias?empresa_nome=eq.{empresa_nome}&select=codigo_categoria,descricao_categoria", headers=HEADERS)
        if resp_cat.status_code == 200:
            for item in resp_cat.json(): maps["categorias"][item["codigo_categoria"]] = item["descricao_categoria"]
            
        resp_proj = requests.get(f"{SUPABASE_URL}/rest/v1/omie_dim_projetos?empresa_nome=eq.{empresa_nome}&select=codigo_projeto,descricao_projeto", headers=HEADERS)
        if resp_proj.status_code == 200:
            for item in resp_proj.json(): maps["projetos"][str(item["codigo_projeto"])] = item["descricao_projeto"]
    except Exception as e:
        log(f"Erro ao carregar dimensões: {e}")
    return maps

def fetch_omie_page(app_key, app_secret, pagina):
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
    for _ in range(3):
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200: return resp.json()
        except: time.sleep(1)
    return {}

def fetch_omie_details(app_key, app_secret, omie_id):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ConsultarContaPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_lancamento_omie": omie_id}]
    }
    try:
        resp = requests.post(url, json=payload, timeout=20)
        if resp.status_code == 200: return resp.json()
    except: pass
    return {}

def fetch_supplier_name(app_key, app_secret, cliente_id):
    if not cliente_id: return None
    url = "https://app.omie.com.br/api/v1/geral/clientes/"
    payload = {
        "call": "ConsultarCliente",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_cliente_omie": cliente_id}]
    }
    try:
        resp = requests.post(url, json=payload, timeout=20)
        if resp.status_code == 200: 
            data = resp.json()
            return data.get("nome_fantasia") or data.get("razao_social")
    except: pass
    return None

def format_date(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except: return None

def process_and_push(records, empresa_nome, dim_maps, app_key, app_secret):
    if not records: return
    rows = []
    for r in records:
        cat_cod = r.get("codigo_categoria")
        proj_cod = str(r.get("codigo_projeto"))
        dist = r.get("distribuicao", []) or [{"cCodDep": None, "cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento", 0)}]
        
        status = r.get("status_titulo")
        # Tentar pegar o nome de varias chaves
        fornecedor_nome = r.get("nm_cliente") or r.get("nome_cliente") or r.get("razao_social") or "Fornecedor"
        dt_pagamento = format_date(r.get("data_baixa"))
        dt_registro = format_date(r.get("data_entrada"))

        # Busca profunda apenas se necessario
        if fornecedor_nome == "Fornecedor" or (status == "PAGO" and not dt_pagamento):
            details = fetch_omie_details(app_key, app_secret, r.get("codigo_lancamento_omie"))
            if details:
                if fornecedor_nome == "Fornecedor":
                    fornecedor_nome = details.get("nm_cliente") or details.get("nome_cliente") or details.get("razao_social") or fornecedor_nome
                
                if fornecedor_nome == "Fornecedor":
                    real_name = fetch_supplier_name(app_key, app_secret, r.get("codigo_cliente_fornecedor"))
                    if real_name: fornecedor_nome = real_name

                if not dt_registro:
                    dt_registro = format_date(details.get("data_entrada"))
                if not dt_pagamento:
                    dt_pagamento = format_date(details.get("data_baixa"))
                    if not dt_pagamento and details.get("liquidacoes"):
                        dt_pagamento = format_date(details["liquidacoes"][0].get("data_liquidacao"))
            
            if status == "PAGO" and not dt_pagamento:
                dt_pagamento = format_date(r.get("data_previsao"))
            
            time.sleep(0.01)
        
        r["nm_cliente"] = fornecedor_nome 

        for d in dist:
            rows.append({
                "empresa_nome": empresa_nome,
                "omie_id": r.get("codigo_lancamento_omie"),
                "status": status,
                "valor_total": r.get("valor_documento"),
                "valor_alocado": d.get("nValDep"),
                "data_registro": dt_registro or format_date(r.get("info", {}).get("dInc")),
                "data_vencimento": format_date(r.get("data_vencimento")),
                "data_pagamento": dt_pagamento,
                "categoria_codigo": cat_cod,
                "categoria_nome": dim_maps["categorias"].get(cat_cod, cat_cod),
                "projeto_nome": dim_maps["projetos"].get(proj_cod, r.get("nome_projeto") or "Sem Projeto"),
                "departamento_codigo": d.get("cCodDep"),
                "departamento_nome": d.get("cDesDep"),
                "numero_documento": r.get("numero_documento"),
                "raw_data": r
            })
    
    for i in range(0, len(rows), 100):
        batch = rows[i:i+100]
        requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=batch, headers=HEADERS)

def sync_company(key_env, secret_env, name):
    key = os.getenv(key_env)
    sec = os.getenv(secret_env)
    if not key or not sec: return
    
    log(f"Iniciando {name}...")
    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}", headers=HEADERS)
    
    dim_maps = get_dim_maps(name)
    pagina = 1
    total_processado = 0
    while True:
        data = fetch_omie_page(key, sec, pagina)
        records = data.get("conta_pagar_cadastro", [])
        if not records: break
        
        process_and_push(records, name, dim_maps, key, sec)
        total_processado += len(records)
        log(f"  {name}: Página {pagina} processada ({total_processado} títulos)")
        
        if pagina >= data.get("total_de_paginas", 0): break
        pagina += 1
        time.sleep(0.1)

# --- Main ---
log("=== INICIANDO SINCRONIZAÇÃO HISTÓRICA OMIE RAW ===")
sync_company("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil")
sync_company("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
log("=== SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ===")
