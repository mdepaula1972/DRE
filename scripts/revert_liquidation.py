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

def revert_liquidation():
    """Reverte todas as liquidações recentes"""
    try:
        # Buscar todos os empréstimos
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/employee_loans",
            headers=HEADERS,
            method="GET"
        )
        
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                loans = json.loads(response.read().decode())
                print(f"Encontrados {len(loans)} empréstimos")
                
                reverted = 0
                for loan in loans:
                    notes = loan.get('notes', '')
                    
                    # Verificar se tem marcação de liquidado
                    if 'LIQUIDADO' in notes:
                        loan_id = loan['id']
                        print(f"\n🔄 Revertendo empréstimo {loan_id[:8]}...")
                        
                        # Limpar amount_paid_extra e remover marcações
                        import re
                        new_notes = re.sub(r'\[LIQUIDADO em .+?\]', '', notes)
                        
                        update_data = {
                            "amount_paid_extra": 0,
                            "notes": new_notes
                        }
                        
                        # Atualizar empréstimo
                        data = json.dumps(update_data).encode()
                        req_update = urllib.request.Request(
                            f"{SUPABASE_URL}/rest/v1/employee_loans?id=eq.{loan_id}",
                            data=data,
                            headers=HEADERS,
                            method="PATCH"
                        )
                        
                        with urllib.request.urlopen(req_update) as response_update:
                            if response_update.status == 204:
                                print(f"✅ Empréstimo {loan_id[:8]} revertido!")
                                reverted += 1
                            else:
                                print(f"❌ Erro ao reverter {loan_id[:8]}: {response_update.status}")
                
                print(f"\n🎯 Total revertido: {reverted} empréstimos")
                return reverted
                
            else:
                print(f"❌ Erro HTTP: {response.status}")
                return 0
                
    except Exception as e:
        print(f"❌ Erro: {e}")
        return 0

if __name__ == "__main__":
    print("=== Revertendo Liquidações ===")
    revert_liquidation()
