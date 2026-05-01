import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = { "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json" }

def get_omie_record(app_key, app_secret, omie_id):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/"
    payload = {
        "call": "ConsultarContaPagar",
        "app_key": app_key,
        "app_secret": app_secret,
        "param": [{"codigo_lancamento_omie": omie_id}]
    }
    return requests.post(url, json=payload).json()

def sync_single_id(omie_id, empresa_nome, app_key_env, app_sec_env):
    key = os.getenv(app_key_env)
    sec = os.getenv(app_sec_env)
    r = get_omie_record(key, sec, omie_id)
    
    if "faultstring" in r:
        print(f"[{empresa_nome}] Erro Omie: {r['faultstring']}")
        return False

    data_ref = r.get("data_entrada") or r.get("info", {}).get("dInc")
    
    row = {
        "data_registro": datetime.strptime(data_ref, "%d/%m/%Y").strftime("%Y-%m-%d"),
        "data_vencimento": datetime.strptime(r.get("data_vencimento"), "%d/%m/%Y").strftime("%Y-%m-%d"),
        "status": r.get("status_titulo"),
        "raw_data": r
    }
    
    url = f"{SUPABASE_URL}/rest/v1/omie_raw?omie_id=eq.{omie_id}&empresa_nome=eq.{empresa_nome}"
    resp = requests.patch(url, json=row, headers=HEADERS)
    print(f"[{empresa_nome}] Update Supabase: {resp.status_code}")
    print(f"[{empresa_nome}] Nova Data de Referência salva: {data_ref}")
    return True

# Tentar DZM
if not sync_single_id(11432667238, "DZM", "OMIE_APP_KEY_DZM", "OMIE_APP_SECRET_DZM"):
    # Se falhar na DZM, tenta MarBrasil de novo só por segurança
    sync_single_id(11432667238, "Mar Brasil", "OMIE_APP_KEY_MARBRASIL", "OMIE_APP_SECRET_MARBRASIL")
