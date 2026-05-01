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

def format_date(date_str):
    if not date_str: return None
    try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except: return None

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
    
    log(f"Iniciando REVERSO {name}...")
    requests.delete(f"{SUPABASE_URL}/rest/v1/omie_raw?empresa_nome=eq.{name}", headers=HEADERS)
    
    pagina = 1
    while True:
        data = get_omie_page(key, sec, pagina)
        records = data.get("conta_pagar_cadastro", [])
        if not records: break
        
        rows = []
        for r in records:
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
                    "data_pagamento": format_date(r.get("data_baixa") or r.get("data_previsao")),
                    "categoria_codigo": r.get("codigo_categoria"),
                    "categoria_nome": r.get("descricao_categoria") or r.get("codigo_categoria"),
                    "projeto_nome": r.get("nome_projeto") or "Sem Projeto",
                    "departamento_nome": d.get("cDesDep"),
                    "raw_data": r # O segredo est aqui: manter o JSON original intacto
                })
        
        requests.post(f"{SUPABASE_URL}/rest/v1/omie_raw", json=rows, headers=HEADERS)
        log(f"  {name}: Página {pagina} processada")
        
        if pagina >= data.get("total_de_paginas", 0): break
        pagina += 1
        time.sleep(0.05)

log("=== REVERSO PARA VERSÃO SIMPLIFICADA ===")
sync_company("OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL", "Mar Brasil")
sync_company("OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM", "DZM")
log("=== REVERSO CONCLUÍDO ===")
