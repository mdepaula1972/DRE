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

def check_loans_simple():
    """Verifica empréstimos de forma simples"""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/employee_loans?select=id,amount,installments,amount_paid_extra,paid_installments,notes,updated_at&limit=10",
            headers=HEADERS,
            method="GET"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("=== Empréstimos ===")
                for i, loan in enumerate(data):
                    print(f"\nEmpréstimo {i+1}:")
                    print(f"  ID: {loan['id'][:8]}...")
                    print(f"  Amount: R$ {loan.get('amount', 0)}")
                    print(f"  Installments: {loan.get('installments', 0)}")
                    print(f"  Amount Paid Extra: R$ {loan.get('amount_paid_extra', 0)}")
                    print(f"  Paid Installments: {loan.get('paid_installments', 0)}")
                    print(f"  Notes: {loan.get('notes', 'N/A')[:100]}...")
                    print(f"  Updated: {loan.get('updated_at', 'N/A')}")
                    
                    # Verificar se tem marcação de liquidado
                    notes = loan.get('notes', '')
                    if 'LIQUIDADO' in notes:
                        print(f"  ⚠️  ESTE EMPRÉSTIMO FOI LIQUIDADO!")
                    if 'ESTORNADO' in notes:
                        print(f"  ↩️  ESTE EMPRÉSTIMO FOI ESTORNADO!")
                return data
            else:
                print(f"❌ Erro HTTP: {response.status}")
                return None
                
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

if __name__ == "__main__":
    check_loans_simple()
