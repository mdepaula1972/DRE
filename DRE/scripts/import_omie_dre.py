#!/usr/bin/env python3
"""
Script para importar CSV da Omie DRE para o Supabase.

Uso:
    1. Baixe o relatório "Base para IA tratar" da Omie em CSV
    2. Salve como "omie_dre.csv" na pasta do projeto
    3. Execute: python import_omie_dre.py
    
O script irá:
    - Ler o CSV
    - Processar e normalizar os dados
    - Fazer UPSERT no Supabase (atualiza existentes + insere novos)
"""

import os
import csv
import sys
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# ==================
# CONFIGURAÇÃO
# ==================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
CSV_FILE = "omie_dre.csv"  # Nome padrão do arquivo CSV

# Inicializar cliente Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ==================
# FUNÇÕES AUXILIARES
# ==================

def log(msg, level="INFO"):
    """Log simples com timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    icon = {
        "INFO": "ℹ️",
        "OK": "✅",
        "WARN": "⚠️",
        "ERROR": "❌"
    }.get(level, "ℹ️")
    print(f"[{timestamp}] {icon} {msg}")


def normalizar_competencia(competencia_str):
    """
    Normaliza a competência para o formato mmm/yy.
    
    Exemplos de entrada esperados:
    - "01/2025" -> "jan/25"
    - "Janeiro/2025" -> "jan/25"
    - "jan/25" -> "jan/25" (já normalizado)
    """
    # Se já está no formato correto, retorna
    if len(competencia_str) == 6 and "/" in competencia_str:
        return competencia_str.lower()
    
    meses = {
        "01": "jan", "1": "jan", "janeiro": "jan",
        "02": "fev", "2": "fev", "fevereiro": "fev",
        "03": "mar", "3": "mar", "março": "mar",
        "04": "abr", "4": "abr", "abril": "abr",
        "05": "mai", "5": "mai", "maio": "mai",
        "06": "jun", "6": "jun", "junho": "jun",
        "07": "jul", "7": "jul", "julho": "jul",
        "08": "ago", "8": "ago", "agosto": "ago",
        "09": "set", "9": "set", "setembro": "set",
        "10": "out", "10": "out", "outubro": "out",
        "11": "nov", "11": "nov", "novembro": "nov",
        "12": "dez", "12": "dez", "dezembro": "dez",
    }
    
    # Tentar parse: "01/2025" ou "Janeiro/2025"
    if "/" in competencia_str:
        mes_parte, ano_parte = competencia_str.split("/")
        mes_parte = mes_parte.strip().lower()
        ano_parte = ano_parte.strip()
        
        # Converter mês
        mes_abrev = meses.get(mes_parte)
        if not mes_abrev:
            raise ValueError(f"Mês inválido: {mes_parte}")
        
        # Converter ano para formato yy
        if len(ano_parte) == 4:
            ano_abrev = ano_parte[2:]
        elif len(ano_parte) == 2:
            ano_abrev = ano_parte
        else:
            raise ValueError(f"Ano inválido: {ano_parte}")
        
        return f"{mes_abrev}/{ano_abrev}"
    
    raise ValueError(f"Formato de competência não reconhecido: {competencia_str}")


def processar_valor(valor_str):
    """
    Converte valor string para inteiro (centavos).
    
    Exemplos:
    - "1.234,56" -> 123456
    - "1234.56" -> 123456
    - "-500,00" -> -50000
    """
    # Remover espaços
    valor_str = valor_str.strip()
    
    # Detectar formato brasileiro (1.234,56) ou americano (1,234.56)
    if "," in valor_str and "." in valor_str:
        # Tem ambos: determinar qual é o separador decimal
        if valor_str.rindex(",") > valor_str.rindex("."):
            # Formato brasileiro
            valor_str = valor_str.replace(".", "").replace(",", ".")
        else:
            # Formato americano
            valor_str = valor_str.replace(",", "")
    elif "," in valor_str:
        # Só tem vírgula: assumir formato brasileiro
        valor_str = valor_str.replace(",", ".")
    
    # Converter para float e depois para centavos
    valor_float = float(valor_str)
    valor_centavos = int(valor_float * 100)
    
    return valor_centavos


# ==================
# FUNÇÃO PRINCIPAL
# ==================

def importar_csv():
    """Lê o CSV e importa para o Supabase."""
    
    print("=" * 60)
    print("  📊 IMPORTAÇÃO CSV → SUPABASE (omie_dre)")
    print(f"  📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)
    print()
    
    # Verificar se o arquivo existe
    if not os.path.exists(CSV_FILE):
        log(f"Arquivo '{CSV_FILE}' não encontrado!", "ERROR")
        log(f"Baixe o CSV da Omie e salve como '{CSV_FILE}' nesta pasta.", "INFO")
        sys.exit(1)
    
    log(f"Lendo arquivo: {CSV_FILE}")
    
    # Ler CSV
    registros = []
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        
        # Verificar colunas esperadas
        # AJUSTE AQUI conforme as colunas reais do CSV da Omie
        # Exemplo esperado: empresa, projeto, categoria, competencia, valor
        colunas_esperadas = ["empresa", "projeto", "categoria", "competencia", "valor"]
        colunas_reais = [c.lower().strip() for c in reader.fieldnames]
        
        log(f"Colunas encontradas no CSV: {', '.join(colunas_reais)}")
        
        # Processar cada linha
        for i, row in enumerate(reader, start=2):  # Linha 2 pois linha 1 é header
            try:
                # AJUSTE AQUI conforme as colunas reais do seu CSV
                # Este é um exemplo genérico
                registro = {
                    "empresa": row.get("empresa", "").strip() or row.get("Empresa", "").strip(),
                    "projeto": row.get("projeto", "").strip() or row.get("Projeto", "").strip() or "",
                    "categoria": row.get("categoria", "").strip() or row.get("Categoria", "").strip() or "",
                    "competencia": normalizar_competencia(
                        row.get("competencia", "").strip() or 
                        row.get("Competencia", "").strip() or 
                        row.get("Mês", "").strip() or
                        row.get("mes", "").strip()
                    ),
                    "valor": processar_valor(
                        row.get("valor", "0").strip() or 
                        row.get("Valor", "0").strip()
                    ),
                    "sync_source": "csv_manual"
                }
                
                # Validar campos obrigatórios
                if not registro["empresa"] or not registro["competencia"]:
                    log(f"Linha {i}: Ignorando - empresa ou competencia vazio", "WARN")
                    continue
                
                registros.append(registro)
                
            except Exception as e:
                log(f"Erro na linha {i}: {e}", "ERROR")
                continue
    
    log(f"Registros válidos: {len(registros)}")
    
    if not registros:
        log("Nenhum registro válido encontrado!", "WARN")
        sys.exit(0)
    
    # Fazer UPSERT no Supabase
    log("Iniciando UPSERT no Supabase...")
    
    try:
        # Upsert em batch (Supabase aceita arrays)
        resultado = supabase.table("omie_dre").upsert(
            registros,
            on_conflict="empresa,projeto,categoria,competencia"  # UNIQUE constraint
        ).execute()
        
        log(f"UPSERT concluído! {len(registros)} registros processados", "OK")
        log("Registros novos foram inseridos e existentes foram atualizados.", "INFO")
        
    except Exception as e:
        log(f"Erro no UPSERT: {e}", "ERROR")
        sys.exit(1)
    
    print()
    print("=" * 60)
    log("Importação concluída com sucesso! 🎉", "OK")
    print("=" * 60)


# ==================
# EXECUÇÃO
# ==================

if __name__ == "__main__":
    importar_csv()
