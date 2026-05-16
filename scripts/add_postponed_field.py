#!/usr/bin/env python3
"""
Script para executar SQL no Supabase via REST API
"""

import urllib.request
import json

# Configurações do Supabase
SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def execute_sql(sql_query):
    """Executa SQL via REST API do Supabase"""
    print(f"Executando SQL: {sql_query}")
    
    # Tentar via RPC exec_sql (se disponível)
    try:
        data = json.dumps({"query": sql_query}).encode()
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            data=data,
            headers=HEADERS,
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            result = response.read().decode()
            print(f"✅ Sucesso: {result}")
            return True
            
    except Exception as e:
        print(f"❌ Erro ao executar SQL: {e}")
        return False

def check_column_exists():
    """Verifica se a coluna postponed_months já existe"""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/employee_loans?select=postponed_months&limit=1",
            headers=HEADERS,
            method="GET"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("✅ Coluna postponed_months já existe")
                return True
            else:
                print("❌ Coluna postponed_months não existe")
                return False
                
    except Exception as e:
        print(f"❌ Erro ao verificar coluna: {e}")
        return False

if __name__ == "__main__":
    print("=== Adicionando campo postponed_months à tabela employee_loans ===")
    
    # Verificar se coluna já existe
    if check_column_exists():
        print("Coluna já existe. Nada a fazer.")
    else:
        # Adicionar coluna
        sql = "ALTER TABLE employee_loans ADD COLUMN postponed_months INTEGER DEFAULT 0;"
        if execute_sql(sql):
            print("✅ Campo postponed_months adicionado com sucesso!")
        else:
            print("❌ Falha ao adicionar campo. Execute manualmente no Supabase SQL Editor:")
            print(sql)
