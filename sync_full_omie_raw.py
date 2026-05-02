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

# Cache global para evitar chamadas repetitivas de fornecedores
supplier_cache = {}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def format_date(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except: return None

def get_supplier_name(app_key, app_secret, client_id):
    if not client_id: return "Fornecedor"
    if client_id in supplier_cache: return supplier_cache[client_id]
    
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
            supplier_cache[client_id] = name
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
            "exibir_obs": "S"
        }]
    }
    try:
        resp = requests.post(url, json=payload, timeout=30)
        return resp.json()
    except: return {}

def sync_company(key_env, secret_env, name):
    key = os.getenv(key_env)
    sec = os.getenv(secret_env)
    if not key or not sec: return
    
    log(f"Iniciando Sincronização Inteligente {name}...")
    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}", headers=HEADERS)
    
    pagina = 1
    total_processed = 0
    while True:
        data = get_omie_page(key, sec, pagina)
        records = data.get("conta_pagar_cadastro", [])
        if not records: break
        
        rows = []
        for r in records:
            # 1. Garantir o nome do fornecedor (usando cache para ser r pido)
            # Se nm_cliente vier na listagem, usamos. Se n o, buscamos no cache/API.
            fornecedor = r.get("nm_cliente") or r.get("nome_cliente") or r.get("razao_social")
            if not fornecedor or fornecedor == "Fornecedor":
                fornecedor = get_supplier_name(key, sec, r.get("codigo_cliente_fornecedor"))
            
            # Atualizar no objeto bruto para o front-end ler
            r["nm_cliente"] = fornecedor
            
            # 2. Data de Pagamento = Data de Previs o (Regra de Auditoria solicitada)
            # Priorizamos a Previs o conforme o usu rio refor ou
            dt_previsao = format_date(r.get("data_previsao"))
            dt_baixa = format_date(r.get("data_baixa"))
            
            # Se o status for PAGO, usamos a previs o como data de pagamento se for o caso
            dt_pagamento_final = dt_previsao if r.get("status_titulo") == "PAGO" else dt_baixa

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
                    "projeto_nome": r.get("nome_projeto") or "Sem Projeto",
                    "departamento_nome": d.get("cDesDep"),
                    "raw_data": r
                })
        
        if rows:
            requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)
        
        total_processed += len(records)
        log(f"  {name}: Página {pagina} ok ({total_processed} títulos)")
        
        if pagina >= data.get("total_de_paginas", 0): break
        pagina += 1
        time.sleep(0.05)

log("=== SINCRONIZAÇÃO DE AUDITORIA (FORNECEDOR + PREVISÃO) ===")
sync_company("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil")
sync_company("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
log("=== PROCESSO CONCLUÍDO ===")
