import os
import sys
import json
import requests
import time
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Configuração de Ambiente
env_path = Path("d:/DRE-V30 - LANÇAMENTOS FALHOS/.env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Endpoints Omie
URL_CP = "https://app.omie.com.br/api/v1/financas/contapagar/"
URL_CR = "https://app.omie.com.br/api/v1/financas/contareceber/"
URL_MOV = "https://app.omie.com.br/api/v1/financas/mf/"
URL_GERAL = "https://app.omie.com.br/api/v1/geral/"

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def format_date_br_to_iso(date_str):
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

def format_date_iso_to_iso(date_str):
    if not date_str: return None
    try:
        # Omie sometimes returns dates in different formats
        if "/" in date_str: return format_date_br_to_iso(date_str)
        return datetime.strptime(date_str[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except:
        return None

class OmieSync:
    def __init__(self, app_key, app_secret, empresa_nome):
        self.app_key = app_key
        self.app_secret = app_secret
        self.empresa_nome = empresa_nome
        self.cat_map = {}
        self.proj_map = {}
        self.forn_map = {}

    def call_api(self, url, call, param):
        payload = {
            "call": call,
            "app_key": self.app_key,
            "app_secret": self.app_secret,
            "param": [param]
        }
        for i in range(3):
            try:
                resp = requests.post(url, json=payload, timeout=40)
                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 429:
                    time.sleep(2 * (i + 1))
                else:
                    log(f"Erro API ({resp.status_code}): {resp.text[:200]}")
            except Exception as e:
                log(f"Erro Conexão: {e}")
                time.sleep(1)
        return {}

    def sync_dimensions(self):
        log(f"Carregando dimensões para {self.empresa_nome}...")
        # Categorias
        res = self.call_api(f"{URL_GERAL}categorias/", "ListarCategorias", {"pagina": 1, "registros_por_pagina": 500})
        for c in res.get("categoria_cadastro", []):
            self.cat_map[str(c["codigo"])] = c["descricao"]
        
        # Projetos
        res = self.call_api(f"{URL_GERAL}projetos/", "ListarProjetos", {"pagina": 1, "registros_por_pagina": 500})
        for p in res.get("cadastro", []):
            self.proj_map[str(p["codigo"])] = p["nome"]
        
        # Clientes/Fornecedores
        res = self.call_api(f"{URL_GERAL}clientes/", "ListarClientes", {"pagina": 1, "registros_por_pagina": 500})
        for f in res.get("clientes_cadastro", []):
            self.forn_map[str(f["codigo_cliente_omie"])] = f["nome_fantasia"] or f["razao_social"]

    def fetch_records(self, url, call, list_key, start_date):
        records = []
        pagina = 1
        while True:
            param = {
                "pagina": pagina,
                "registros_por_pagina": 100,
                "filtrar_por_data_de": start_date,
                "exibir_obs": "S"
            }
            data = self.call_api(url, call, param)
            items = data.get(list_key, [])
            if not items: break
            records.extend(items)
            if pagina >= data.get("total_de_paginas", 0): break
            pagina += 1
            log(f"  {list_key}: Lendo página {pagina-1}...")
        return records

    def process_cp_cr(self, records, tipo):
        rows = []
        sign = -1 if tipo == "PAGAR" else 1
        for r in records:
            omie_id = r.get("codigo_lancamento_omie")
            status = r.get("status_titulo")
            
            # Data de Pagamento: Baixa > Liquidação > Previsão (se PAGO)
            dt_baixa = format_date_iso_to_iso(r.get("data_baixa") or r.get("data_liquidacao"))
            dt_previsao = format_date_iso_to_iso(r.get("data_previsao"))
            
            data_pagamento = dt_baixa
            if not data_pagamento and status == "PAGO":
                data_pagamento = dt_previsao # Conforme regra do usuário: previsao vira pagamento na liquidação
            
            raw_dist = r.get("distribuicao", [])
            if not raw_dist:
                raw_dist = [{"cDesDep": "Sem Departamento", "nValDep": r.get("valor_documento")}]
            
            # Cliente/Fornecedor Fallback
            cliente_forn = self.forn_map.get(str(r.get("codigo_cliente_fornecedor")))
            if not cliente_forn:
                cliente_forn = r.get("nm_cliente") or r.get("cnab_integracao_bancaria", {}).get("nome_transferencia") or "N/D"

            for d in raw_dist:
                rows.append({
                    "empresa_nome": self.empresa_nome,
                    "omie_id": omie_id,
                    "tipo_registro": tipo,
                    "status": status,
                    "valor_total": float(r.get("valor_documento") or 0) * sign,
                    "valor_alocado": float(d.get("nValDep") or 0) * sign,
                    "data_emissao": format_date_iso_to_iso(r.get("data_emissao")),
                    "data_registro": format_date_iso_to_iso(r.get("info", {}).get("dInc")),
                    "data_vencimento": format_date_iso_to_iso(r.get("data_vencimento")),
                    "data_previsao": dt_previsao,
                    "data_pagamento": data_pagamento,
                    "categoria_codigo": r.get("codigo_categoria"),
                    "categoria_nome": self.cat_map.get(str(r.get("codigo_categoria")), r.get("descricao_categoria")),
                    "projeto_nome": self.proj_map.get(str(r.get("codigo_projeto")), r.get("nome_projeto") or "Sem Projeto"),
                    "departamento_nome": d.get("cDesDep"),
                    "cliente_fornecedor": cliente_forn,
                    "numero_documento": r.get("numero_documento"),
                    "raw_data": r
                })
        return rows

    def fetch_movimentos(self, start_date):
        records = []
        pagina = 1
        while True:
            param = {
                "nPagina": pagina,
                "nRegPorPagina": 100,
                "dDtPagtoDe": start_date,
                "lDadosCad": True
            }
            data = self.call_api(URL_MOV, "ListarMovimentos", param)
            items = data.get("movimentos", [])
            if not items: break
            records.extend(items)
            if pagina >= data.get("nTotPaginas", 0): break
            pagina += 1
            log(f"  Movimentos: Lendo página {pagina-1}...")
        return records

    def process_movimentos(self, records):
        rows = []
        for r in records:
            det = r.get("detalhes", {})
            res = r.get("resumo", {})
            
            valor = float(res.get("nValLiquido") or 0)
            sign = 1 if det.get("cTipo") == "E" else -1
            
            # Mesmo que tenha título, vamos incluir como MOVIMENTO para garantir a visão do extrato
            rows.append({
                "empresa_nome": self.empresa_nome,
                "omie_id": det.get("nCodMovCC"),
                "tipo_registro": "MOVIMENTO",
                "status": "PAGO",
                "valor_total": valor * sign,
                "valor_alocado": valor * sign,
                "data_emissao": format_date_iso_to_iso(det.get("dDtEmissao")),
                "data_registro": format_date_iso_to_iso(r.get("info", {}).get("dInc")),
                "data_vencimento": format_date_iso_to_iso(det.get("dDtVenc")),
                "data_previsao": format_date_iso_to_iso(det.get("dDtPagto")),
                "data_pagamento": format_date_iso_to_iso(det.get("dDtPagto")),
                "categoria_codigo": det.get("cCodCateg"),
                "categoria_nome": self.cat_map.get(str(det.get("cCodCateg")), "Sem Categoria"),
                "projeto_nome": self.proj_map.get(str(det.get("nCodProjeto")), "Sem Projeto"),
                "departamento_nome": "Principal",
                "cliente_fornecedor": det.get("cNomeCliente") or "N/D",
                "numero_documento": det.get("cNumDocFiscal"),
                "raw_data": r
            })
        return rows

def push_to_supabase(rows):
    if not rows: return
    log(f"Enviando {len(rows)} registros para o Supabase...")
    # Chunking
    size = 100
    for i in range(0, len(rows), size):
        chunk = rows[i:i+size]
        # Usamos upsert baseado em omie_id e tipo_registro e empresa_nome
        # Mas para garantir rateio, o ideal é usar uma chave composta ou deletar/inserir
        # Por simplicidade e segurança de unificação:
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/omie_financas_unificado", headers=HEADERS_SB, json=chunk)
        if resp.status_code not in [200, 201, 204]:
            log(f"Erro Supabase: {resp.text}")

def main():
    start_date = "01/01/2025"
    apps = [
        {"key": os.getenv("OMIE_APP_KEY_MARBRASIL"), "sec": os.getenv("OMIE_APP_SECRET_MARBRASIL"), "name": "Mar Brasil"},
        {"key": os.getenv("OMIE_APP_KEY_DZM"), "sec": os.getenv("OMIE_APP_SECRET_DZM"), "name": "DZM"}
    ]
    
    for app in apps:
        if not app["key"]: continue
        log(f"\n>>> Sincronizando {app['name']}")
        sync = OmieSync(app["key"], app["sec"], app["name"])
        sync.sync_dimensions()
        
        # Contas a Pagar
        log("Processando Contas a Pagar...")
        recs_cp = sync.fetch_records(URL_CP, "ListarContasPagar", "conta_pagar_cadastro", start_date)
        rows_cp = sync.process_cp_cr(recs_cp, "PAGAR")
        
        # Contas a Receber
        log("Processando Contas a Receber...")
        recs_cr = sync.fetch_records(URL_CR, "ListarContasReceber", "conta_receber_cadastro", start_date)
        rows_cr = sync.process_cp_cr(recs_cr, "RECEBER")
        
        # Movimentos
        log("Processando Movimentos Bancários...")
        recs_mov = sync.fetch_movimentos(start_date)
        rows_mov = sync.process_movimentos(recs_mov)
        
        # Push
        all_rows = rows_cp + rows_cr + rows_mov
        push_to_supabase(all_rows)

    log("\nSincronização Finalizada!")

if __name__ == "__main__":
    main()
