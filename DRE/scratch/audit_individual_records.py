import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# Buscando dados na tabela de alocações detalhadas (origem dos lançamentos)
# Vamos pegar campos que ajudem na comparação: ID do Omie, Valor, Competência e Status
url = f"{SUPABASE_URL}/rest/v1/omie_cp_allocations?select=codigo_lancamento_omie,valor_alocado,competencia,status_titulo,descricao_categoria,empresa_nome&limit=3"

print(f"--- Auditando 3 lançamentos detalhados (omie_cp_allocations) ---")
try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        # Se a tabela não existir com esse nome, tentamos a omie_titulos
        print(f"Tabela omie_cp_allocations não retornou dados. Tentando omie_titulos...")
        url_alt = f"{SUPABASE_URL}/rest/v1/omie_titulos?select=codigo_lancamento_omie,valor_documento,data_vencimento,status_titulo,empresa_nome&limit=3"
        resp_alt = requests.get(url_alt, headers=headers)
        if resp_alt.status_code == 200:
            print(json.dumps(resp_alt.json(), indent=2, ensure_ascii=False))
        else:
            print(f"Erro na auditoria: {resp_alt.text}")
except Exception as e:
    print(f"Exceção: {e}")
