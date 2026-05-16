import urllib.request
import json

# Configurações do Supabase
SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def test_connection():
    """Testa conexão com Supabase"""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/employee_loans?limit=1",
            headers=HEADERS,
            method="GET"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("✅ Conexão OK")
                print(f"Encontrados {len(data)} registros")
                return True
            else:
                print(f"❌ Erro HTTP: {response.status}")
                return False
                
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return False

def check_column():
    """Verifica se coluna existe tentando acessá-la"""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/employee_loans?select=postponed_months&limit=1",
            headers=HEADERS,
            method="GET"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("✅ Coluna postponed_months já existe!")
                return True
            else:
                print(f"❌ Coluna não existe (HTTP {response.status})")
                return False
                
    except urllib.error.HTTPError as e:
        if e.code == 400:  # Bad Request = coluna não existe
            print("❌ Coluna postponed_months não existe")
            return False
        else:
            print(f"❌ Erro inesperado: {e}")
            return False

if __name__ == "__main__":
    print("=== Verificando campo postponed_months ===")
    
    if test_connection():
        if check_column():
            print("✅ Tabela pronta para uso!")
        else:
            print("⚠️  Execute manualmente no Supabase SQL Editor:")
            print("ALTER TABLE employee_loans ADD COLUMN postponed_months INTEGER DEFAULT 0;")
    else:
        print("❌ Falha na conexão")
