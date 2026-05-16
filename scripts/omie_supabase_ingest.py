#!/usr/bin/env python3
"""
Omie to Supabase Ingestion Script
---------------------------------
Supports data ingestion from Omie API to Supabase.
Features: API Integration, Data Normalization, Local Audit, Analytical Explosion, 
Cross-Allocation, and Analytical Enrichment with Dimensions.
"""

import os
import sys
import argparse
import json
import time
import csv
import requests
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from collections import Counter, defaultdict

# Try to load python-dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If not available, we rely on environment variables being set manually
    pass

@dataclass
class OmieAppConfig:
    """Configuration for an Omie Application/Company."""
    app_key: str
    app_secret: str
    empresa_id: str
    empresa_nome: str

@dataclass
class RuntimeConfig:
    """Configuration for the current execution run."""
    modo: str
    de: Optional[str] = None
    ate: Optional[str] = None
    codigo_titulo: Optional[str] = None
    empresa_alvo: str = "1"  # "1", "2", or "all"
    verbose: bool = False
    persist_supabase: bool = False
    include_movimentos_saida: bool = False

class OmieClient:
    """Client for Omie API interactions."""
    BASE_URL_FINANCAS = "https://app.omie.com.br/api/v1/financas/contapagar"
    BASE_URL_GERAL = "https://app.omie.com.br/api/v1/geral"
    BASE_URL_MOVIMENTOS = "https://app.omie.com.br/api/v1/financas/mf"
    
    def __init__(self, config: OmieAppConfig, timeout: int = 15):
        self.config = config
        self.timeout = timeout
    
    def _post(self, url: str, call: str, param: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends a POST request to Omie API with retries and backoff.
        Fatal errors (structural/redundant) are raised immediately.
        """
        payload = {
            "call": call,
            "param": [param],
            "app_key": self.config.app_key,
            "app_secret": self.config.app_secret
        }
        
        max_retries = 3
        last_error = None
        
        # Keywords that indicate we should NOT retry
        STOP_KEYWORDS = ["tag", "tipo complexo", "parametro", "campo", "nenhum parâmetro foi recebido em ws_params", "redundant"]

        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, timeout=self.timeout)
                
                # Check HTTP Status 429 specifically for retry
                if response.status_code == 429:
                    raise Exception("HTTP 429: Too Many Requests")

                try:
                    data = response.json()
                except ValueError:
                    # Not a JSON? Check for HTTP errors first
                    if response.status_code >= 500:
                        raise Exception(f"HTTP {response.status_code}: Erro interno no servidor (Não-JSON)")
                    raise Exception(f"HTTP {response.status_code}: Resposta inválida (Não-JSON)")
                
                # Check Omie Faults
                if "faultstring" in data:
                    fault_str = str(data.get("faultstring", "")).lower()
                    
                    if any(k in fault_str for k in STOP_KEYWORDS):
                        prefix = f"[{self.config.empresa_nome}] " if self.config.empresa_nome else ""
                        msg = f"ERRO FATAL (STOP): {data.get('faultstring')}"
                        print(f"{prefix}{msg}")
                        raise Exception(msg)

                    # Other faults (not structural) -> retry if attempt left
                    raise Exception(f"Erro na API Omie: {data.get('faultstring')}")
                
                return data
                
            except (requests.exceptions.RequestException, Exception) as e:
                # Fatal errors we identified above
                if "FATAL (STOP)" in str(e):
                    raise e
                    
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    prefix = f"[{self.config.empresa_nome}] " if self.config.empresa_nome else ""
                    print(f"{prefix}Tentativa {attempt + 1} falhou: {str(e)[:100]}... Retentando em {wait_time}s")
                    time.sleep(wait_time)
                else:
                    break
        
        raise Exception(f"Falha total após {max_retries} tentativas: {last_error}")

    def _post_direct(self, url: str, call: str, param: Dict[str, Any]) -> Tuple[int, Dict[str, Any], Optional[str]]:
        """
        Perform a single POST request without any retry logic or fatal raising.
        Returns (status_code, json_data, faultstring).
        """
        payload = {
            "call": call,
            "param": [param],
            "app_key": self.config.app_key,
            "app_secret": self.config.app_secret
        }
        try:
            resp = requests.post(url, json=payload, timeout=self.timeout)
            status = resp.status_code
            try:
                data = resp.json()
                fault = data.get("faultstring")
            except:
                data = {}
                fault = resp.text[:200]
            return status, data, fault
        except Exception as e:
            return 0, {}, str(e)

    # --- Financial API ---

    def listar_contas_pagar_por_registro(self, data_de: str, data_ate: str, pagina: int, registros_por_pagina: int = 100) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina,
            "filtrar_por_registro_de": data_de,
            "filtrar_por_registro_ate": data_ate
        }
        return self._post(f"{self.BASE_URL_FINANCAS}/", "ListarContasPagar", params)

    def listar_contas_pagar_por_inclusao(self, data_de: str, data_ate: str, pagina: int, registros_por_pagina: int = 100) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina,
            "filtrar_por_data_de": data_de,
            "filtrar_por_data_ate": data_ate,
            "filtrar_apenas_inclusao": "S",
            "filtrar_apenas_alteracao": "N"
        }
        return self._post(f"{self.BASE_URL_FINANCAS}/", "ListarContasPagar", params)

    def listar_contas_pagar_por_alteracao(self, data_de: str, data_ate: str, pagina: int, registros_por_pagina: int = 100) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina,
            "filtrar_por_data_de": data_de,
            "filtrar_por_data_ate": data_ate,
            "filtrar_apenas_inclusao": "N",
            "filtrar_apenas_alteracao": "S"
        }
        return self._post(f"{self.BASE_URL_FINANCAS}/", "ListarContasPagar", params)

    # --- General Dim API ---

    def listar_categorias(self, pagina: int, registros_por_pagina: int = 200) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina
        }
        return self._post(f"{self.BASE_URL_GERAL}/categorias/", "ListarCategorias", params)

    def listar_contas_dre(self, verbose: bool = False) -> Tuple[int, Dict[str, Any], Optional[str]]:
        """Busca as contas DRE utilizando o contrato validado."""
        params = {"apenasContasAtivas": "N"} 
        url = f"{self.BASE_URL_GERAL}/dre/"
        if verbose:
            print(f"\n--- DEBUG DRE LOAD ---")
            print(f"Endpoint: {url}")
            print(f"Call: ListarCadastroDRE")
            print(f"Param: [{params}]")
        return self._post_direct(url, "ListarCadastroDRE", params)

    def listar_projetos(self, pagina: int, registros_por_pagina: int = 200) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina
        }
        return self._post(f"{self.BASE_URL_GERAL}/projetos/", "ListarProjetos", params)

    def listar_clientes(self, pagina: int, registros_por_pagina: int = 500) -> Dict[str, Any]:
        params = {
            "pagina": pagina,
            "registros_por_pagina": registros_por_pagina,
            "apenas_importado_api": "N"
        }
        return self._post(f"{self.BASE_URL_GERAL}/clientes/", "ListarClientes", params)

    # --- Financial Movements API ---

    def listar_movimentos(self, data_de: str, data_ate: str, pagina: int, tipo_lancamento: str, registros_por_pagina: int = 500) -> Dict[str, Any]:
        """Busca movimentos financeiros filtrando por data de pagamento e tipo."""
        params = {
            "nPagina": pagina,
            "nRegPorPagina": registros_por_pagina,
            "dDtPagtoDe": data_de,
            "dDtPagtoAte": data_ate,
            "lDadosCad": True,
            "cTpLancamento": tipo_lancamento
        }
        return self._post(f"{self.BASE_URL_MOVIMENTOS}/", "ListarMovimentos", params)

    def __repr__(self):
        return f"<OmieClient(empresa='{self.config.empresa_nome}', id='{self.config.empresa_id}')>"

def fetch_all_clientes(client, config):
    all = []
    p = 1
    while True:
        if config.verbose: print(f"[{client.config.empresa_nome}] Fetching Clientes Page {p}")
        r = client.listar_clientes(p)
        l = r.get("clientes_cadastro", [])
        all.extend(l)
        if p >= r.get("total_de_paginas", 0) or not l: break
        p += 1
    return all

# --- Supabase Client ---

class SupabaseClient:
    """Direct REST client for Supabase PostgREST API."""
    def __init__(self, url: str, key: str, verbose: bool = False):
        self.url = url.rstrip("/")
        self.key = key
        self.verbose = verbose
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }

    def upsert_records(self, table_name: str, records: List[Dict[str, Any]], on_conflict: str) -> bool:
        """Upserts records in chunks of 500 with immediate stop on error."""
        if not records:
            return True

        total = len(records)
        chunk_size = 500
        total_sent = 0
        num_chunks = (total + chunk_size - 1) // chunk_size
        
        if self.verbose:
            print(f"  [Supabase] Persisting table: {table_name}")
            print(f"    Total: {total} | Chunks: {num_chunks} | On-Conflict: {on_conflict}")

        target_url = f"{self.url}/rest/v1/{table_name}?on_conflict={on_conflict}"
        
        for i in range(num_chunks):
            start = i * chunk_size
            end = min(start + chunk_size, total)
            chunk = records[start:end]
            
            success = False
            max_retries = 3
            retry_count = 0
            
            while not success and retry_count < max_retries:
                try:
                    resp = requests.post(target_url, json=chunk, headers=self.headers, timeout=60)
                    if resp.status_code in [200, 201, 204]:
                        success = True
                        total_sent += len(chunk)
                        if self.verbose: 
                            print(f"    Batch {i+1}/{num_chunks}: Success ({len(chunk)} rows)")
                    else:
                        raise Exception(f"Status {resp.status_code}: {resp.text}")
                except Exception as e:
                    retry_count += 1
                    print(f"    [!] Erro Batch {i+1}/{num_chunks} (Tentativa {retry_count}/{max_retries}): {e}")
                    if retry_count < max_retries:
                        print(f"    [!] Aguardando 5s para nova tentativa devido a instabilidade de rede...")
                        time.sleep(5)
                    else:
                        print(f"    [!] EXCEÇÃO CRÍTICA NO SUPABASE APÓS RETRIES: {e}")
                        return False
        
        print(f"  [v] {table_name} final: {total} prep, {total_sent} sent, {num_chunks} batches. Status: {'Sucesso' if total_sent == total else 'Parcial'}.")
        return True

    def log_sync_status(self, empresa_nome: str, status: str, detalhes: str):
        """Registra o resultado da sincronização na tabela omie_sync_logs."""
        record = {
            "empresa_nome": empresa_nome,
            "status": status,
            "detalhes": detalhes,
            "timestamp": datetime.now().isoformat()
        }
        try:
            self.client.table("omie_sync_logs").insert(record).execute()
        except Exception as e:
            print(f"  [!] Erro ao registrar log de sincronização: {e}")

# --- Helper Functions ---

def parse_date_to_yyyymm(date_str: str) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    """Parses 'DD/MM/AAAA' to (year, month, yyyymm)."""
    if not date_str:
        return None, None, None
    try:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.year, dt.month, dt.strftime("%Y%m")
    except ValueError:
        return None, None, None

def format_to_iso_date(date_str: str) -> Optional[str]:
    """Converts 'DD/MM/AAAA' to 'YYYY-MM-DD'."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None

def safe_float(val: Any, default: float = 0.0) -> float:
    """Safely converts a value to float."""
    if val is None:
        return default
    try:
        if isinstance(val, str):
            cleaned = val.replace(".", "").replace(",", ".")
            return float(cleaned)
        return float(val)
    except (ValueError, TypeError):
        return default

def safe_str(val: Any) -> Optional[str]:
    """Safely converts a value to string, or None if null."""
    if val is None or val == "":
        return None
    return str(val)

# --- Normalization Helpers ---

def normalize_conta_pagar(item: Dict[str, Any], empresa_id: str, empresa_nome: str, omie_app: str) -> Dict[str, Any]:
    """Transforms a raw Omie record into a normalized structure."""
    info = item.get("info", {})
    cnab = item.get("cnab_integracao_bancaria", {})
    data_entrada = item.get("data_entrada") or datetime.now().strftime("%d/%m/%Y")
    ano, mes, yyyymm = parse_date_to_yyyymm(data_entrada)
    
    normalized = {
        "empresa_id": empresa_id,
        "empresa_nome": empresa_nome,
        "omie_app": omie_app,
        "source_system": "omie",
        "codigo_lancamento_omie": item.get("codigo_lancamento_omie"),
        "codigo_lancamento_integracao": item.get("codigo_lancamento_integracao"),
        "codigo_cliente_fornecedor": item.get("codigo_cliente_fornecedor"),
        "codigo_tipo_documento": item.get("codigo_tipo_documento"),
        "numero_documento": item.get("numero_documento"),
        "numero_parcela": item.get("numero_parcela"),
        "codigo_categoria_padrao": item.get("codigo_categoria"),
        "codigo_projeto": item.get("codigo_projeto"),
        "id_conta_corrente": item.get("id_conta_corrente"),
        "id_origem": item.get("id_origem"),
        "data_emissao": item.get("data_emissao"),
        "data_entrada": data_entrada,
        "data_previsao": item.get("data_previsao"),
        "data_vencimento": item.get("data_vencimento"),
        "data_pagamento": item.get("data_baixa") or item.get("data_liquidacao") or item.get("dDtQuitacao"),
        "competencia": data_entrada,
        "ano_competencia": ano,
        "mes_competencia": mes,
        "competencia_yyyymm": yyyymm,
        "status_titulo": item.get("status_titulo"),
        "valor_documento": item.get("valor_documento"),
        "valor_pago": item.get("valor_pago") or item.get("valor_pag"),
        "info_dinc": info.get("dInc"),
        "info_hinc": info.get("hInc"),
        "info_uinc": info.get("uInc"),
        "info_dalt": info.get("dAlt"),
        "info_halt": info.get("hAlt"),
        "info_ualt": info.get("uAlt"),
        "importado_api": item.get("importado_api"),
        "fornecedor_nome_transferencia": item.get("nm_cliente", item.get("nome_fantasia", cnab.get("nome_transferencia"))),
        "cpf_cnpj_transferencia": cnab.get("cpf_cnpj_transferencia"),
        "codigo_forma_pagamento": cnab.get("codigo_forma_pagamento"),
        "possui_rateio_departamento": True if item.get("distribuicao") else False,
        "possui_multiplas_categorias": True if len(item.get("categorias", [])) > 1 else False,
        "payload_json": json.dumps(item, ensure_ascii=False)
    }
    return normalized

def normalize_contas_pagar(items: List[Dict[str, Any]], empresa_id: str, empresa_nome: str, omie_app: str) -> List[Dict[str, Any]]:
    return [normalize_conta_pagar(item, empresa_id, empresa_nome, omie_app) for item in items]

def normalize_movimento_saida(item: Dict[str, Any], empresa_id: str, empresa_nome: str, omie_app: str) -> Dict[str, Any]:
    """Transforms a raw Omie financial movement into a normalized structure."""
    detalhes = item.get("detalhes", {})
    resumo = item.get("resumo", {})
    
    data_pagamento = detalhes.get("dDtPagto") or detalhes.get("dDataPagamento")
    ano, mes, yyyymm = parse_date_to_yyyymm(data_pagamento)
    
    n_cod_titulo = detalhes.get("nCodTitulo")
    n_cod_mov_cc = detalhes.get("nCodMovCC")
    n_cod_baixa = detalhes.get("nCodBaixa")
    
    normalized = {
        "empresa_id": empresa_id,
        "empresa_nome": empresa_nome,
        "omie_app": omie_app,
        "source_system": "omie_movimentos",
        "codigo_titulo": n_cod_titulo,
        "codigo_cliente_fornecedor": detalhes.get("nCodCliente"),
        "codigo_movimento_cc": n_cod_mov_cc,
        "codigo_baixa": n_cod_baixa,
        "codigo_categoria": detalhes.get("cCodCateg"),
        "codigo_projeto": detalhes.get("nCodProjeto"),
        "numero_titulo": detalhes.get("cNumTitulo"),
        "numero_documento_fiscal": detalhes.get("cNumDocFiscal"),
        "tipo_lancamento": detalhes.get("cTipo"),
        "status_titulo": detalhes.get("cStatus"),
        "data_emissao": detalhes.get("dDtEmissao"),
        "data_vencimento": detalhes.get("dDtVenc"),
        "data_previsao": detalhes.get("dDtPrevisao"),
        "data_pagamento": data_pagamento,
        "data_registro_nf": detalhes.get("dDtRegNF"),
        "data_inclusao": item.get("info", {}).get("dInc"),
        "data_alteracao": item.get("info", {}).get("dAlt"),
        "competencia": data_pagamento, # Movimento financeiro usa pagamento como competencia de caixa
        "ano_competencia": ano,
        "mes_competencia": mes,
        "competencia_yyyymm": yyyymm,
        "valor_titulo": resumo.get("nValTitulo"),
        "valor_movimento_cc": resumo.get("nValMovCC"),
        "valor_pago": resumo.get("nValPago"),
        "desconto": resumo.get("nValDesconto"),
        "juros": resumo.get("nValJuros"),
        "multa": resumo.get("nValMulta"),
        "valor_liquido": resumo.get("nValLiquido"),
        "origem_lancamento": detalhes.get("cOrigem"),
        "origem_lancamento_bruta": detalhes.get("cOrigem"),
        "conta_corrente": detalhes.get("cContaCorrente"),
        "fornecedor_nome_transferencia": detalhes.get("cNomeCliente", "---"),
        "observacao": detalhes.get("cObservacao"),
        "natureza_titulo": detalhes.get("cNatureza"),
        "operacao_titulo": detalhes.get("cOperacao"),
        "tipo_documento": detalhes.get("cTipo"),
        "eh_saida_caixa": True,
        "tem_vinculo_cp": True if n_cod_titulo and int(n_cod_titulo) > 0 else False,
        "dedupe_key": item.get("dedupe_key"),
        "payload_json": json.dumps(item, ensure_ascii=False)
    }
    return normalized

def normalize_movimentos_saida(items: List[Dict[str, Any]], empresa_id: str, empresa_nome: str, omie_app: str) -> List[Dict[str, Any]]:
    return [normalize_movimento_saida(item, empresa_id, empresa_nome, omie_app) for item in items]

def normalize_cliente(item: Dict[str, Any], empresa_id: str, empresa_nome: str, omie_app: str) -> Dict[str, Any]:
    return {
        "empresa_id": empresa_id,
        "empresa_nome": empresa_nome,
        "omie_app": omie_app,
        "codigo_cliente_omie": item.get("codigo_cliente_omie"),
        "nome_fantasia": item.get("nome_fantasia"),
        "razao_social": item.get("razao_social"),
        "cnpj_cpf": item.get("cnpj_cpf"),
        "codigo_cliente_integracao": item.get("codigo_cliente_integracao")
    }

# --- Explosion Helpers ---

def explode_titulo_categorias(raw_item: Dict[str, Any], normalized_item: Dict[str, Any]) -> List[Dict[str, Any]]:
    base = {
        "empresa_id": normalized_item["empresa_id"],
        "empresa_nome": normalized_item["empresa_nome"],
        "omie_app": normalized_item["omie_app"],
        "codigo_lancamento_omie": normalized_item["codigo_lancamento_omie"],
        "competencia": normalized_item["competencia"],
        "ano_competencia": normalized_item["ano_competencia"],
        "mes_competencia": normalized_item["mes_competencia"],
        "competencia_yyyymm": normalized_item["competencia_yyyymm"],
        "payload_json": normalized_item["payload_json"]
    }
    categorias = raw_item.get("categorias", [])
    exploded = []
    if not categorias:
        exploded.append({
            **base, "ordem_categoria": 1,
            "codigo_categoria": normalized_item.get("codigo_categoria_padrao") or "SEM_CATEGORIA",
            "percentual_categoria": 100.0, "valor_categoria": normalized_item.get("valor_documento") or 0.0
        })
    else:
        for i, cat in enumerate(categorias, 1):
            exploded.append({
                **base, "ordem_categoria": i,
                "codigo_categoria": cat.get("codigo_categoria"),
                "percentual_categoria": cat.get("percentual", 100.0), "valor_categoria": cat.get("valor", 0.0)
            })
    return exploded

def explode_titulo_departamentos(raw_item: Dict[str, Any], normalized_item: Dict[str, Any]) -> List[Dict[str, Any]]:
    base = {
        "empresa_id": normalized_item["empresa_id"],
        "empresa_nome": normalized_item["empresa_nome"],
        "omie_app": normalized_item["omie_app"],
        "codigo_lancamento_omie": normalized_item["codigo_lancamento_omie"],
        "competencia": normalized_item["competencia"],
        "ano_competencia": normalized_item["ano_competencia"],
        "mes_competencia": normalized_item["mes_competencia"],
        "competencia_yyyymm": normalized_item["competencia_yyyymm"],
        "payload_json": normalized_item["payload_json"]
    }
    dist = raw_item.get("distribuicao", [])
    exploded = []
    if not dist:
        exploded.append({
            **base, "ordem_departamento": 1,
            "codigo_departamento": "SEM_RATEIO", "descricao_departamento": "Sem rateio informado",
            "percentual_departamento": 100.0, "valor_departamento": normalized_item.get("valor_documento") or 0.0
        })
    else:
        for i, dept in enumerate(dist, 1):
            exploded.append({
                **base, "ordem_departamento": i,
                "codigo_departamento": dept.get("cCodDep"), "descricao_departamento": dept.get("cDesDep"),
                "percentual_departamento": dept.get("nPerDep", 100.0), "valor_departamento": dept.get("nValDep", 0.0)
            })
    return exploded

def explode_all_categorias(raw_items: List[Dict[str, Any]], normalized_items: List[Dict[str, Any]], verbose: bool = False) -> List[Dict[str, Any]]:
    norm_map = {n["codigo_lancamento_omie"]: n for n in normalized_items}
    all_cat = []
    for raw in raw_items:
        key = raw.get("codigo_lancamento_omie")
        if key in norm_map: all_cat.extend(explode_titulo_categorias(raw, norm_map[key]))
    return all_cat

def explode_all_departamentos(raw_items: List[Dict[str, Any]], normalized_items: List[Dict[str, Any]], verbose: bool = False) -> List[Dict[str, Any]]:
    norm_map = {n["codigo_lancamento_omie"]: n for n in normalized_items}
    all_dept = []
    for raw in raw_items:
        key = raw.get("codigo_lancamento_omie")
        if key in norm_map: all_dept.extend(explode_titulo_departamentos(raw, norm_map[key]))
    return all_dept

# --- Cross-Allocation Helpers ---

def allocate_categoria_departamento(cat_row: Dict[str, Any], dept_row: Dict[str, Any], norm: Dict[str, Any]) -> Dict[str, Any]:
    val_cat = safe_float(cat_row.get("valor_categoria"))
    perc_cat = safe_float(cat_row.get("percentual_categoria"), 100.0)
    perc_dept = safe_float(dept_row.get("percentual_departamento"), 100.0)
    val_doc = safe_float(norm.get("valor_documento"))
    
    if val_cat != 0:
        val_alocado = val_cat * perc_dept / 100.0
    else:
        val_alocado = val_doc * (perc_cat / 100.0) * (perc_dept / 100.0)
        
    return {
        "empresa_id": norm["empresa_id"], "empresa_nome": norm["empresa_nome"], "omie_app": norm["omie_app"],
        "codigo_lancamento_omie": norm["codigo_lancamento_omie"], "competencia": norm["competencia"],
        "ano_competencia": norm["ano_competencia"], "mes_competencia": norm["mes_competencia"],
        "competencia_yyyymm": norm["competencia_yyyymm"], "codigo_categoria": cat_row.get("codigo_categoria"),
        "percentual_categoria": perc_cat, "valor_categoria": val_cat,
        "codigo_departamento": dept_row.get("codigo_departamento"), "descricao_departamento": dept_row.get("descricao_departamento"),
        "percentual_departamento": perc_dept, "valor_departamento": safe_float(dept_row.get("valor_departamento")),
        "valor_documento": val_doc, "valor_alocado": val_alocado, 
        "codigo_projeto": norm.get("codigo_projeto"), "status_titulo": norm.get("status_titulo"),
        "payload_json": norm["payload_json"]
    }

def build_allocations(cat_rows: List[Dict[str, Any]], dept_rows: List[Dict[str, Any]], norm_items: List[Dict[str, Any]], verbose: bool = False) -> List[Dict[str, Any]]:
    norm_map = defaultdict(list)
    for n in norm_items: norm_map[n["codigo_lancamento_omie"]].append(n)
    final_norm = {}
    for lid, items in norm_map.items():
        if len(items) > 1 and verbose: print(f"[Warning] Duplicate ID {lid}. Using first.")
        final_norm[lid] = items[0]
    cat_g = defaultdict(list)
    for c in cat_rows: cat_g[c["codigo_lancamento_omie"]].append(c)
    dept_g = defaultdict(list)
    for d in dept_rows: dept_g[d["codigo_lancamento_omie"]].append(d)
    allocs = []
    for lid in set(cat_g.keys()).union(dept_g.keys()):
        if lid not in final_norm:
            if verbose: print(f"[Warning] ID {lid} not found. Skipping.")
            continue
        for c in cat_g[lid]:
            for d in dept_g[lid]:
                allocs.append(allocate_categoria_departamento(c, d, final_norm[lid]))
    return allocs

# --- Deep Dimension Helpers ---

def fetch_all_categorias(client: OmieClient, config: RuntimeConfig) -> List[Dict[str, Any]]:
    all_cat = []
    pagina = 1
    while True:
        if config.verbose: print(f"[{client.config.empresa_nome}] Fetching Categorias Page {pagina}")
        resp = client.listar_categorias(pagina)
        lista = resp.get("categoria_cadastro", [])
        all_cat.extend(lista)
        if pagina >= resp.get("total_de_paginas", 0) or not lista: break
        pagina += 1
    return all_cat

def fetch_all_contas_dre(client: OmieClient, config: RuntimeConfig) -> Tuple[List[Dict[str, Any]], bool, Optional[str]]:
    """Carga total de contas DRE utilizando o contrato validado."""
    try:
        if config.verbose: print(f"[{client.config.empresa_nome}] Fetching DRE Accounts (Total Load)...")
        status, data, fault = client.listar_contas_dre(verbose=config.verbose)
        
        if status == 200 and not fault:
            # A chave correta identificada via diagnóstico é 'dreLista'
            lista = data.get("dreLista") or data.get("lista_dre") or data.get("listaDre") or data.get("cadastros") or []
            return lista, True, None
        else:
            if config.verbose:
                print(f"HTTP Status: {status}")
                print(f"Faultstring: {fault}")
                print(f"Response Body: {json.dumps(data, indent=2)}")
                print(f"----------------------\n")
            return [], False, (fault or f"HTTP {status}")
    except Exception as e:
        if config.verbose: 
            print(f"[{client.config.empresa_nome}] Exception fetching DRE: {str(e)}")
        return [], False, str(e)

def fetch_all_projetos(client: OmieClient, config: RuntimeConfig) -> List[Dict[str, Any]]:
    all_proj = []
    pagina = 1
    while True:
        if config.verbose: print(f"[{client.config.empresa_nome}] Fetching Projects Page {pagina}")
        resp = client.listar_projetos(pagina)
        lista = resp.get("cadastro", [])
        all_proj.extend(lista)
        if pagina >= resp.get("total_de_paginas", 0) or not lista: break
        pagina += 1
    return all_proj

def build_dimension_maps(cats: List[Dict[str, Any]], dre: List[Dict[str, Any]], projs: List[Dict[str, Any]]) -> Tuple[Dict, Dict, Dict]:
    cat_map = {safe_str(c.get("codigo")): {"descricao": c.get("descricao"), "codigo_conta_dre": safe_str(c.get("codigo_dre"))} for c in cats}
    dre_map = {safe_str(d.get("codigoDRE")): {
        "descricao": d.get("descricaoDRE"),
        "nao_exibir_dre": d.get("naoExibirDRE"),
        "nivel_dre": d.get("nivelDRE"),
        "sinal_dre": d.get("sinalDRE"),
        "totaliza_dre": d.get("totalizaDRE")
    } for d in dre}
    proj_map = {safe_str(p.get("codigo")): {"descricao": p.get("nome")} for p in projs}
    return cat_map, dre_map, proj_map

def enrich_allocations(allocs: List[Dict[str, Any]], cat_map: Dict, dre_map: Dict, proj_map: Dict) -> List[Dict[str, Any]]:
    enriched = []
    for a in allocs:
        c_key = safe_str(a.get("codigo_categoria"))
        p_key = safe_str(a.get("codigo_projeto"))
        cat_info = cat_map.get(c_key)
        a["descricao_categoria"] = cat_info["descricao"] if cat_info else "CATEGORIA_NAO_ENCONTRADA"
        dre_code = cat_info["codigo_conta_dre"] if cat_info else None
        dre_info = dre_map.get(dre_code) if dre_code else None
        a["codigo_conta_dre"] = dre_code if (dre_code and dre_info) else None
        a["descricao_conta_dre"] = dre_info["descricao"] if dre_info else "SEM_DRE_VINCULADA"
        # Enrichment with more DRE fields
        a["nao_exibir_dre"] = dre_info["nao_exibir_dre"] if dre_info else None
        a["nivel_dre"] = dre_info["nivel_dre"] if dre_info else None
        a["sinal_dre"] = dre_info["sinal_dre"] if dre_info else None
        a["totaliza_dre"] = dre_info["totaliza_dre"] if dre_info else None
        proj_info = proj_map.get(p_key)
        a["descricao_projeto"] = proj_info["descricao"] if proj_info else "PROJETO_NAO_ENCONTRADO"
        enriched.append(a)
    return enriched

# --- Database Preparation Functions ---

def prepare_dim_dre_for_db(dre_recs: List[Dict[str, Any]], app) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": app.empresa_id,
        "empresa_nome": app.empresa_nome,
        "omie_app": app.app_key,
        "codigo_conta_dre": r.get("codigo_conta_dre"),
        "descricao_conta_dre": r.get("descricao_conta_dre"),
        "nao_exibir_dre": r.get("nao_exibir_dre"),
        "nivel_dre": r.get("nivel_dre"),
        "sinal_dre": r.get("sinal_dre"),
        "totaliza_dre": r.get("totaliza_dre")
    } for r in dre_recs]

def prepare_dim_categorias_for_db(cat_map: Dict, app) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": app.empresa_id,
        "empresa_nome": app.empresa_nome,
        "omie_app": app.app_key,
        "codigo_categoria": k,
        "descricao_categoria": v["descricao"],
        "codigo_conta_dre": v["codigo_conta_dre"]
    } for k, v in cat_map.items()]

def prepare_dim_projetos_for_db(proj_map: Dict[int, Dict[str, Any]], app: OmieAppConfig) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": app.empresa_id,
        "empresa_nome": app.empresa_nome,
        "omie_app": "dashboard",
        "codigo_projeto": k,
        "descricao_projeto": v["descricao"]
    } for k, v in proj_map.items()]

def prepare_dim_fornecedores_for_db(raw_clientes: List[Dict[str, Any]], app: OmieAppConfig) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": app.empresa_id,
        "empresa_nome": app.empresa_nome,
        "omie_app": "dashboard",
        "codigo_cliente_omie": item.get("codigo_cliente_omie"),
        "nome_fantasia": item.get("nome_fantasia"),
        "razao_social": item.get("razao_social"),
        "cnpj_cpf": item.get("cnpj_cpf"),
        "codigo_cliente_integracao": item.get("codigo_cliente_integracao")
    } for item in raw_clientes]

def prepare_titulos_for_db(norm_recs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": r["empresa_id"],
        "empresa_nome": r["empresa_nome"],
        "omie_app": r["omie_app"],
        "codigo_lancamento_omie": int(r["codigo_lancamento_omie"]),
        "source_system": r["source_system"],
        "codigo_lancamento_integracao": r["codigo_lancamento_integracao"],
        "codigo_cliente_fornecedor": r["codigo_cliente_fornecedor"],
        "codigo_tipo_documento": r["codigo_tipo_documento"],
        "numero_documento": r["numero_documento"],
        "numero_parcela": r["numero_parcela"],
        "codigo_categoria_padrao": r["codigo_categoria_padrao"],
        "codigo_projeto": r["codigo_projeto"],
        "id_conta_corrente": r["id_conta_corrente"],
        "id_origem": r["id_origem"],
        "data_emissao": format_to_iso_date(r["data_emissao"]),
        "data_entrada": format_to_iso_date(r["data_entrada"]),
        "data_previsao": format_to_iso_date(r["data_previsao"]),
        "data_vencimento": format_to_iso_date(r["data_vencimento"]),
        "competencia": format_to_iso_date(r["competencia"]),
        "ano_competencia": r["ano_competencia"],
        "mes_competencia": r["mes_competencia"],
        "competencia_yyyymm": r["competencia_yyyymm"],
        "status_titulo": r["status_titulo"],
        "valor_documento": r["valor_documento"],
        "valor_pago": r["valor_pago"],
        "payload_json": r["payload_json"]
    } for r in norm_recs]

def prepare_categorias_for_db(exp_cat: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": r["empresa_id"],
        "empresa_nome": r["empresa_nome"],
        "omie_app": r["omie_app"],
        "codigo_lancamento_omie": int(r["codigo_lancamento_omie"]),
        "ordem_categoria": r["ordem_categoria"],
        "codigo_categoria": r["codigo_categoria"],
        "percentual_categoria": r["percentual_categoria"],
        "valor_categoria": r["valor_categoria"]
    } for r in exp_cat]

def prepare_departamentos_for_db(exp_dept: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": r["empresa_id"],
        "empresa_nome": r["empresa_nome"],
        "omie_app": r["omie_app"],
        "codigo_lancamento_omie": int(r["codigo_lancamento_omie"]),
        "ordem_departamento": r["ordem_departamento"],
        "codigo_departamento": r["codigo_departamento"],
        "descricao_departamento": r["descricao_departamento"],
        "percentual_departamento": r["percentual_departamento"],
        "valor_departamento": r["valor_departamento"]
    } for r in exp_dept]

def prepare_allocations_for_db(enriched: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{
        "empresa_id": r["empresa_id"],
        "empresa_nome": r["empresa_nome"],
        "omie_app": r["omie_app"],
        "codigo_lancamento_omie": int(r["codigo_lancamento_omie"]),
        "competencia": format_to_iso_date(r["competencia"]),
        "ano_competencia": r["ano_competencia"],
        "mes_competencia": r["mes_competencia"],
        "competencia_yyyymm": r["competencia_yyyymm"],
        "codigo_categoria": r["codigo_categoria"],
        "percentual_categoria": r["percentual_categoria"],
        "valor_categoria": r["valor_categoria"],
        "codigo_departamento": r["codigo_departamento"],
        "descricao_departamento": r["descricao_departamento"],
        "percentual_departamento": r["percentual_departamento"],
        "valor_departamento": r["valor_departamento"],
        "valor_documento": r["valor_documento"],
        "valor_alocado": r["valor_alocado"],
        "codigo_projeto": r["codigo_projeto"],
        "status_titulo": r["status_titulo"],
        "descricao_categoria": r["descricao_categoria"],
        "codigo_conta_dre": r["codigo_conta_dre"],
        "descricao_conta_dre": r["descricao_conta_dre"],
        "descricao_projeto": r["descricao_projeto"],
        "nao_exibir_dre": r["nao_exibir_dre"],
        "nivel_dre": r["nivel_dre"],
        "sinal_dre": r["sinal_dre"],
        "totaliza_dre": r["totaliza_dre"]
    } for r in enriched]

def prepare_movimentos_saida_for_db(norm_recs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Prepara os movimentos normalizados para o schema SQL da tabela omie_mov_saidas."""
    return [{
        "empresa_id": r["empresa_id"],
        "empresa_nome": r["empresa_nome"],
        "omie_app": r["omie_app"],
        "source_system": r["source_system"],
        "codigo_titulo": int(r["codigo_titulo"]) if r["codigo_titulo"] and int(r["codigo_titulo"]) > 0 else None,
        "codigo_cliente_fornecedor": int(r["codigo_cliente_fornecedor"]) if r["codigo_cliente_fornecedor"] and int(r["codigo_cliente_fornecedor"]) > 0 else None,
        "codigo_movimento_cc": int(r["codigo_movimento_cc"]) if r["codigo_movimento_cc"] and int(r["codigo_movimento_cc"]) > 0 else None,
        "codigo_baixa": int(r["codigo_baixa"]) if r["codigo_baixa"] and int(r["codigo_baixa"]) > 0 else None,
        "codigo_categoria": r["codigo_categoria"],
        "codigo_projeto": int(r["codigo_projeto"]) if r["codigo_projeto"] and int(r["codigo_projeto"]) > 0 else None,
        "numero_titulo": r["numero_titulo"],
        "numero_documento_fiscal": r["numero_documento_fiscal"],
        "tipo_lancamento": r["tipo_lancamento"],
        "tipo_lancamento_bruto": r["tipo_lancamento"], # Preservando como bruto conforme solicitado
        "tipo_documento": r["tipo_documento"],
        "natureza_titulo": r["natureza_titulo"],
        "operacao_titulo": r["operacao_titulo"],
        "status_titulo": r["status_titulo"],
        "data_emissao": format_to_iso_date(r["data_emissao"]),
        "data_vencimento": format_to_iso_date(r["data_vencimento"]),
        "data_previsao": format_to_iso_date(r["data_previsao"]),
        "data_pagamento": format_to_iso_date(r["data_pagamento"]),
        "data_registro_nf": format_to_iso_date(r["data_registro_nf"]),
        "data_inclusao": format_to_iso_date(r["data_inclusao"]),
        "data_alteracao": format_to_iso_date(r["data_alteracao"]),
        "valor_titulo": r["valor_titulo"],
        "valor_movimento_cc": r["valor_movimento_cc"],
        "valor_pago": r["valor_pago"],
        "desconto": r["desconto"],
        "juros": r["juros"],
        "multa": r["multa"],
        "valor_liquido": r["valor_liquido"],
        "origem_lancamento": r["origem_lancamento"],
        "origem_lancamento_bruta": r["origem_lancamento_bruta"],
        "conta_corrente": r["conta_corrente"],
        "observacao": r["observacao"],
        "eh_saida_caixa": r["eh_saida_caixa"],
        "tem_vinculo_cp": r["tem_vinculo_cp"],
        "dedupe_key": r["dedupe_key"],
        "payload_json": r["payload_json"]
    } for r in norm_recs]

# --- Storage Helpers ---

def ensure_directories():
    for f in ["output/raw", "output/normalized", "output/audit"]: Path(f).mkdir(parents=True, exist_ok=True)

def save_dimension_audit(records: List[Dict[str, Any]], file_label: str, empresa_nome: str, timestamp: str) -> str:
    safe_name = empresa_nome.replace(" ", "_").lower()
    filename = f"output/audit/{safe_name}_{timestamp}_{file_label}_dim.csv"
    if not records:
        with open(filename, "w", encoding="utf-8-sig") as f: f.write("")
        return filename
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(records)
    return filename

def main():
    config = parse_args()
    omie_apps, sb_url, sb_key = load_env_config()
    ensure_directories()
    
    sb_client = None
    if config.persist_supabase:
        if not sb_url or not sb_key:
            print("  [!] Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persistence.")
            sys.exit(1)
        sb_client = SupabaseClient(sb_url, sb_key, config.verbose)
        print("  [v] Mode: PERSIST_SUPABASE enabled.")
    else:
        print("  [-] Mode: LOCAL_ONLY (No database persistence).")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    targets = [omie_apps[int(config.empresa_alvo)-1]] if config.empresa_alvo != "all" else omie_apps
    for app in targets:
        print(f"\n>>> Processing App: {app.empresa_nome} (ID: {app.empresa_id})")
        client = OmieClient(app)
        raw_cats = fetch_all_categorias(client, config)
        raw_dre, dre_available, dre_error = fetch_all_contas_dre(client, config)
        raw_projs = fetch_all_projetos(client, config)
        cat_map, dre_map, proj_map = build_dimension_maps(raw_cats, raw_dre, raw_projs)
        
        # Dimension CSVs
        cat_d = [{"codigo_categoria": k, "descricao_categoria": v["descricao"], "codigo_conta_dre": v["codigo_conta_dre"]} for k, v in cat_map.items()]
        dre_d = [{"codigo_conta_dre": k, "descricao_conta_dre": v["descricao"], "nao_exibir_dre": v["nao_exibir_dre"], "nivel_dre": v["nivel_dre"], "sinal_dre": v["sinal_dre"], "totaliza_dre": v["totaliza_dre"]} for k, v in dre_map.items()]
        proj_d = [{"codigo_projeto": k, "descricao_projeto": v["descricao"]} for k, v in proj_map.items()]
        
        save_dimension_audit(cat_d, "categorias", app.empresa_nome, timestamp)
        if dre_available: save_dimension_audit(dre_d, "dre", app.empresa_nome, timestamp)
        save_dimension_audit(proj_d, "projetos", app.empresa_nome, timestamp)
        
        print(f"  [v] Dimensions: {len(raw_cats)} Cats, {len(raw_dre)} DRE, {len(raw_projs)} Projs. DRE: {'carregada' if dre_available else 'indisponivel'}")

        raw_recs = fetch_all_contas_pagar(client, config)
        save_raw_json(raw_recs, app.empresa_nome, config.modo, timestamp)
        norm_recs = normalize_contas_pagar(raw_recs, app.empresa_id, app.empresa_nome, app.app_key)
        save_normalized_csv(norm_recs, app.empresa_nome, config.modo, timestamp)
        issues = build_audit_issues(norm_recs)
        save_audit_issues_csv(issues, app.empresa_nome, config.modo, timestamp)
        exp_cat = explode_all_categorias(raw_recs, norm_recs, config.verbose)
        exp_dept = explode_all_departamentos(raw_recs, norm_recs, config.verbose)
        allocs = build_allocations(exp_cat, exp_dept, norm_recs, config.verbose)
        enriched = enrich_allocations(allocs, cat_map, dre_map, proj_map)
        final_f = f"output/normalized/{app.empresa_nome.replace(' ', '_').lower()}_{config.modo}_{timestamp}_allocations_enriched.csv"
        if enriched:
            with open(final_f, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=list(enriched[0].keys()), delimiter=";")
                writer.writeheader()
                writer.writerows(enriched)
            print(f"  [v] Enriched saved: {final_f} ({len(enriched)} rows)")
        else:
            header = ["empresa_id", "empresa_nome", "omie_app", "codigo_lancamento_omie", "competencia", "ano_competencia", "mes_competencia", "competencia_yyyymm", "codigo_categoria", "percentual_categoria", "valor_categoria", "codigo_departamento", "descricao_departamento", "percentual_departamento", "valor_departamento", "valor_documento", "valor_alocado", "codigo_projeto", "status_titulo", "payload_json", "descricao_categoria", "codigo_conta_dre", "descricao_conta_dre", "descricao_projeto", "nao_exibir_dre", "nivel_dre", "sinal_dre", "totaliza_dre"]
            with open(final_f, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=header, delimiter=";")
                writer.writeheader()
            print(f"  [v] Enriched saved (Header Only)")
        print_audit_summary(norm_recs, issues, app.empresa_nome)
        print(f"  [v] DRE status: {'carregada' if dre_available else 'indisponivel'}")
        if not dre_available:
            print(f"  [!] DRE error: {dre_error}")

        # --- Supabase Persistence ---
        if sb_client:
            print(f"\n>>> Persisting {app.empresa_nome} to Supabase...")
            
            # Dimensions
            sb_dim_dre = prepare_dim_dre_for_db(dre_d, app)
            if config.verbose: print(f"    DRE preparada: {len(sb_dim_dre)} registros")
            if not sb_client.upsert_records("omie_dim_dre", sb_dim_dre, "empresa_id,codigo_conta_dre"):
                print(f"    [!] Falha ao persistir DRE. Interrompendo empresa {app.empresa_nome}")
                continue
            
            sb_dim_cat = prepare_dim_categorias_for_db(cat_map, app)
            if config.verbose: print(f"    Categorias preparada: {len(sb_dim_cat)} registros")
            if not sb_client.upsert_records("omie_dim_categorias", sb_dim_cat, "empresa_id,codigo_categoria"):
                print(f"    [!] Falha ao persistir Categorias. Interrompendo empresa {app.empresa_nome}")
                continue
            
            sb_dim_proj = prepare_dim_projetos_for_db(proj_map, app)
            if config.verbose: print(f"    Projetos preparada: {len(sb_dim_proj)} registros")
            if not sb_client.upsert_records("omie_dim_projetos", sb_dim_proj, "empresa_id,codigo_projeto"):
                print(f"    [!] Falha ao persistir Projetos. Interrompendo empresa {app.empresa_nome}")
                continue

            # Fornecedores (Clientes)
            raw_clientes = fetch_all_clientes(client, config)
            sb_dim_forn = prepare_dim_fornecedores_for_db(raw_clientes, app)
            if config.verbose: print(f"    Fornecedores preparada: {len(sb_dim_forn)} registros")
            if not sb_client.upsert_records("omie_dim_fornecedores", sb_dim_forn, "empresa_id,codigo_cliente_omie"):
                print(f"    [!] Falha ao persistir Fornecedores. Interrompendo empresa {app.empresa_nome}")
                continue
            
            # Facts
            sb_titulos = prepare_titulos_for_db(norm_recs)
            if config.verbose: print(f"    Títulos preparada: {len(sb_titulos)} registros")
            if not sb_client.upsert_records("omie_cp_titulos", sb_titulos, "empresa_id,codigo_lancamento_omie"):
                print(f"    [!] Falha ao persistir Títulos. Interrompendo empresa {app.empresa_nome}")
                continue
            
            sb_cat_fat = prepare_categorias_for_db(exp_cat)
            if config.verbose: print(f"    Fato Categorias preparada: {len(sb_cat_fat)} registros")
            if not sb_client.upsert_records("omie_cp_categorias", sb_cat_fat, "empresa_id,codigo_lancamento_omie,ordem_categoria"):
                print(f"    [!] Falha ao persistir Fato Categorias. Interrompendo empresa {app.empresa_nome}")
                continue
            
            sb_dept_fat = prepare_departamentos_for_db(exp_dept)
            if config.verbose: print(f"    Fato Departamentos preparada: {len(sb_dept_fat)} registros")
            if not sb_client.upsert_records("omie_cp_departamentos", sb_dept_fat, "empresa_id,codigo_lancamento_omie,ordem_departamento"):
                print(f"    [!] Falha ao persistir Fato Departamentos. Interrompendo empresa {app.empresa_nome}")
                continue
            
            sb_allocs = prepare_allocations_for_db(enriched)
            if config.verbose: print(f"    Alocações preparada: {len(sb_allocs)} registros")
            if not sb_client.upsert_records("omie_cp_allocations", sb_allocs, "empresa_id,codigo_lancamento_omie,codigo_categoria,codigo_departamento"):
                print(f"    [!] Falha ao persistir Alocações. Interrompendo empresa {app.empresa_nome}")
                sb_client.log_sync_status(app.empresa_nome, "ERRO", "Falha na persistência de Alocações")
                continue
            
            sb_client.log_sync_status(app.empresa_nome, "SUCESSO", f"Sincronização concluída: {len(sb_titulos)} títulos e {len(sb_allocs)} alocações.")
            print(f"  [v] Persistence for {app.empresa_nome} completed.")

        # --- Financial Movements Path (Optional) ---
        if config.include_movimentos_saida:
            print(f"\n>>> Extracting Movimentos Financeiros for {app.empresa_nome}...")
            raw_movs = fetch_all_movimentos_saida(client, config)
            save_raw_json(raw_movs, f"{app.empresa_nome}_movimentos", config.modo, timestamp)
            
            norm_movs = normalize_movimentos_saida(raw_movs, app.empresa_id, app.empresa_nome, app.app_key)
            save_normalized_csv(norm_movs, f"{app.empresa_nome}_movimentos", config.modo, timestamp)
            
            # Summary Movimentos
            if norm_movs:
                pagtos = [m["data_pagamento"] for m in norm_movs if m["data_pagamento"]]
                print(f"  [v] Movimentos: {len(raw_movs)} brutos")
                print(f"  [v] Movimentos Únicos: {len(norm_movs)}")
                if pagtos:
                    print(f"  [v] Período Pagto: {min(pagtos)} até {max(pagtos)}")
                
                tipos_mov = Counter([m["tipo_lancamento"] for m in norm_movs])
                print(f"  [v] Distribuição por Tipo:")
                for t, c in tipos_mov.items(): print(f"    - {t}: {c}")
                
                vinculo_cp = len([m for m in norm_movs if m["tem_vinculo_cp"]])
                mov_cc = len([m for m in norm_movs if m["codigo_movimento_cc"] and int(m["codigo_movimento_cc"]) > 0])
                bx_cod = len([m for m in norm_movs if m["codigo_baixa"] and int(m["codigo_baixa"]) > 0])
                
                print(f"  [v] Vínculo Contas a Pagar: {vinculo_cp}")
                print(f"  [v] Sem vínculo Contas a Pagar: {len(norm_movs) - vinculo_cp}")
                print(f"  [v] Movimentos Conta Corrente: {mov_cc}")
                print(f"  [v] Baixas vinculadas: {bx_cod}")

                # --- Movimentos Supabase Persistence ---
                if sb_client and config.persist_supabase:
                    print(f"\n>>> Persisting omie_mov_saidas for {app.empresa_nome}...")
                    sb_movs = prepare_movimentos_saida_for_db(norm_movs)
                    if config.verbose: print(f"    Movimentos preparada: {len(sb_movs)} registros")
                    if not sb_client.upsert_records("omie_mov_saidas", sb_movs, "empresa_id,dedupe_key"):
                        print(f"    [!] Falha ao persistir Movimentos. Interrompendo empresa {app.empresa_nome}")
                        continue
            else:
                print("  [-] Nenhum movimento de saída encontrado para o período.")

    print("\nExtraction, Enrichment and Allocation complete.")

def save_raw_json(recs, name, modo, ts):
    f = f"output/raw/{name.replace(' ', '_').lower()}_{modo}_{ts}.json"
    with open(f, "w", encoding="utf-8") as file: json.dump(recs, file, indent=2, ensure_ascii=False)
    return f

def save_normalized_csv(recs, name, modo, ts):
    f = f"output/normalized/{name.replace(' ', '_').lower()}_{modo}_{ts}.csv"
    if not recs: return f
    with open(f, "w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=recs[0].keys(), delimiter=";")
        writer.writeheader()
        writer.writerows(recs)
    return f

def save_audit_issues_csv(issues, name, modo, ts):
    f = f"output/audit/{name.replace(' ', '_').lower()}_{modo}_{ts}_issues.csv"
    with open(f, "w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=["empresa_id", "empresa_nome", "codigo_lancamento_omie", "competencia", "issue_type", "issue_description"], delimiter=";")
        writer.writeheader()
        writer.writerows(issues)
    return f

def build_audit_issues(recs):
    iss = []
    for r in recs:
        b = {"empresa_id": r.get("empresa_id"), "empresa_nome": r.get("empresa_nome"), "codigo_lancamento_omie": r.get("codigo_lancamento_omie"), "competencia": r.get("competencia")}
        if not r.get("competencia"): iss.append({**b, "issue_type": "competencia_ausente", "issue_description": "Data de competência ausente"})
        if not r.get("codigo_categoria_padrao"): iss.append({**b, "issue_type": "categoria_ausente", "issue_description": "Categoria ausente"})
        if not r.get("codigo_projeto") or r.get("codigo_projeto") == 0: iss.append({**b, "issue_type": "projeto_ausente", "issue_description": "Projeto ausente"})
        if not r.get("possui_rateio_departamento"): iss.append({**b, "issue_type": "sem_rateio_departamento", "issue_description": "Sem rateio"})
        if r.get("valor_documento") is None: iss.append({**b, "issue_type": "valor_documento_ausente", "issue_description": "Valor ausente"})
        if not r.get("status_titulo"): iss.append({**b, "issue_type": "status_ausente", "issue_description": "Status ausente"})
    return iss

def print_audit_summary(recs, iss, name):
    print(f"\nAudit Summary for {name}\n----------------------------------------")
    print(f"Records: {len(recs)} | Issues: {len(iss)}")
    if recs:
        status = Counter([r.get("status_titulo", "N/A") for r in recs])
        for s, c in status.items(): print(f"  - {s}: {c}")
    print("----------------------------------------")

def fetch_all_contas_pagar(client, config):
    all = []
    p = 1
    while True:
        if config.verbose: print(f"[{client.config.empresa_nome}] Fetching Contas Pagar Page {p}")
        if config.modo == "registro": r = client.listar_contas_pagar_por_registro(config.de, config.ate, p)
        elif config.modo == "inclusao": r = client.listar_contas_pagar_por_inclusao(config.de, config.ate, p)
        elif config.modo == "alteracao": r = client.listar_contas_pagar_por_alteracao(config.de, config.ate, p)
        else: return []
        l = r.get("conta_pagar_cadastro", [])
        all.extend(l)
        if p >= r.get("total_de_paginas", 0) or not l: break
        p += 1
    return all

def fetch_all_movimentos_saida(client: OmieClient, config: RuntimeConfig) -> List[Dict[str, Any]]:
    """Busca movimentos de saída consolidando tipos e deduplicando."""
    tipos = ["CP", "BXCP", "CC"]
    all_raw = []
    
    for t in tipos:
        p = 1
        while True:
            if config.verbose: print(f"[{client.config.empresa_nome}] Fetching Movimentos ({t}) Page {p}")
            try:
                r = client.listar_movimentos(config.de, config.ate, p, t)
                l = r.get("movimentos", [])
                all_raw.extend(l)
                if p >= r.get("nTotPaginas", 0) or not l: break
                p += 1
            except Exception as e:
                print(f"  [!] Erro ao buscar movimentos tipo {t}: {e}")
                break
                
    # Deduplicação Multinível
    dedup = {}
    total_bruto = len(all_raw)
    
    for item in all_raw:
        det = item.get("detalhes", {})
        res = item.get("resumo", {})
        
        # Ordem de Chaves Natural do Usuário
        n_cc = det.get("nCodMovCC")
        n_baixa = det.get("nCodBaixa")
        
        if n_cc and int(n_cc) > 0:
            key = f"cc_{n_cc}"
        elif n_baixa and int(n_baixa) > 0:
            key = f"bx_{n_baixa}"
        else:
            # Chave composta: (nCodTitulo, dDtPagamento, nValorTitulo, cTipo, cOrigem)
            key = f"comp_{det.get('nCodTitulo')}_{det.get('dDtPagto')}_{res.get('nValTitulo')}_{det.get('cTipo')}_{det.get('cOrigem')}"
            
        # Adicionar a chave ao item bruto para ser preservada na normalização
        item["dedupe_key"] = key

        # Manter o primeiro encontrado (Omie costuma retornar o mais relevante primeiro)
        if key not in dedup:
            dedup[key] = item

    final_list = list(dedup.values())
    
    if config.verbose:
        print(f"[{client.config.empresa_nome}] Movimentos: {total_bruto} brutos -> {len(final_list)} únicos")
        
    return final_list

def load_env_config():
    # Load .env explicitly if it exists in current dir
    env_path = Path(".env")
    if env_path.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(dotenv_path=env_path, override=True)
        except ImportError:
            # Fallback manual parsing if dotenv is not installed
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")
        
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY") or "").strip()
    
    apps = []
    # Try conventional numbering 1 and 2
    for i in ["1", "2"]:
        k = os.getenv(f"OMIE_APP_{i}_KEY") or os.getenv(f"OMIE_APP_KEY_{i}")
        s = os.getenv(f"OMIE_APP_{i}_SECRET") or os.getenv(f"OMIE_APP_SECRET_{i}")
        eid = os.getenv(f"OMIE_APP_{i}_EMPRESA_ID") or os.getenv(f"OMIE_APP_EMPRESA_ID_{i}")
        n = os.getenv(f"OMIE_APP_{i}_EMPRESA_NOME") or os.getenv(f"OMIE_APP_EMPRESA_NOME_{i}") or f"Empresa {i}"
        if all([k, s, eid]):
            apps.append(OmieAppConfig(k.strip(), s.strip(), eid.strip(), n.strip()))
    
    # Try named environment variables (GitHub Secrets style)
    if not apps:
        dzm_k = os.getenv("OMIE_APP_KEY_DZM")
        dzm_s = os.getenv("OMIE_APP_SECRET_DZM")
        if dzm_k and dzm_s:
            apps.append(OmieAppConfig(dzm_k.strip(), dzm_s.strip(), "DZM_ID_PLACEHOLDER", "DZM"))
            
        mar_k = os.getenv("OMIE_APP_KEY_MARBRASIL")
        mar_s = os.getenv("OMIE_APP_SECRET_MARBRASIL")
        if mar_k and mar_s:
            apps.append(OmieAppConfig(mar_k.strip(), mar_s.strip(), "MARBRASIL_ID_PLACEHOLDER", "Mar Brasil"))
            
    if not apps:
        print("Error: No Omie Apps configured (Environment was not loaded correctly).")
        sys.exit(1)
        
    return apps, url, key

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--modo", required=True, choices=["registro", "inclusao", "alteracao", "sync", "full"])
    parser.add_argument("--de")
    parser.add_argument("--ate")
    parser.add_argument("--empresa", choices=["1", "2", "all"], default="1")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--persist-supabase", action="store_true", help="Ativa a persistência no Supabase")
    parser.add_argument("--include-movimentos-saida", action="store_true", help="Inclui a extração de movimentos financeiros (caixa)")
    args = parser.parse_args()
    if args.modo in ["registro", "inclusao", "alteracao"] and not args.de: sys.exit(1)
    return RuntimeConfig(modo=args.modo, de=args.de, ate=args.ate or datetime.now().strftime("%d/%m/%Y"), empresa_alvo=args.empresa, verbose=args.verbose, persist_supabase=args.persist_supabase, include_movimentos_saida=args.include_movimentos_saida)

if __name__ == "__main__":
    main()
