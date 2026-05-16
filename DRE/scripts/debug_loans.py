"""
Script de diagnóstico detalhado: simula exatamente o que o JavaScript faz
para calcular totalLent, debt, installments dos funcionários com loans_data.
"""
import urllib.request, json
from datetime import datetime

SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28"

url = f"{SUPABASE_URL}/rest/v1/employees?select=id,full_name,loan_amount,loan_installments,loan_start_cycle,loans_data&order=full_name"
req = urllib.request.Request(url, headers={
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

def get_loans_data(emp):
    ld = emp.get('loans_data')
    if not ld:
        return []
    if isinstance(ld, str):
        try:
            return json.loads(ld)
        except:
            return []
    return ld if isinstance(ld, list) else []

def calc_paid_for_one(amount, inst, start_cycle):
    if not amount or not inst or not start_cycle:
        return 0
    now = datetime.now()
    y, m = map(int, start_cycle.split('-'))
    elapsed = (now.year - y) * 12 + (now.month - m)
    if now.day < 10:
        elapsed -= 1
    elapsed = max(0, min(elapsed, inst))
    return elapsed * (amount / inst)

def calculate_debt(emp):
    total_paid = 0
    total_paid += calc_paid_for_one(float(emp.get('loan_amount') or 0), int(emp.get('loan_installments') or 0), emp.get('loan_start_cycle'))
    loans_data = get_loans_data(emp)
    for ln in loans_data:
        total_paid += calc_paid_for_one(float(ln.get('amount') or 0), int(ln.get('installments') or 0), ln.get('start_cycle'))
    loans_sum = sum(float(ln.get('amount') or 0) for ln in loans_data)
    total_amount = float(emp.get('loan_amount') or 0) + loans_sum
    return max(0, total_amount - total_paid)

def get_installment_for_month(emp, month_str):
    total = 0
    target_y, target_m = map(int, month_str.split('-'))
    target_abs = target_y * 12 + target_m

    def check_inst(amount, inst, start_cycle):
        if not amount or not inst or not start_cycle:
            return 0
        y, m = map(int, start_cycle.split('-'))
        start_abs = y * 12 + m
        end_abs = start_abs + inst - 1
        if start_abs <= target_abs <= end_abs:
            return amount / inst
        return 0

    total += check_inst(float(emp.get('loan_amount') or 0), int(emp.get('loan_installments') or 0), emp.get('loan_start_cycle'))
    for ln in get_loans_data(emp):
        total += check_inst(float(ln.get('amount') or 0), int(ln.get('installments') or 0), ln.get('start_cycle'))
    return total

now = datetime.now()
current_month = f"{now.year}-{now.month:02d}"

print(f"=== DIAGNÓSTICO COMPLETO - Mês atual: {current_month} ===\n")
for emp in data:
    loans_data = get_loans_data(emp)
    main_loan = float(emp.get('loan_amount') or 0)
    loans_sum = sum(float(ln.get('amount') or 0) for ln in loans_data)
    total_lent = main_loan + loans_sum

    if total_lent == 0:
        continue

    debt = calculate_debt(emp)
    installment = get_installment_for_month(emp, current_month)

    print(f"--- {emp['full_name']} ---")
    print(f"  Principal: R$ {main_loan:,.2f} ({emp.get('loan_installments')}x desde {emp.get('loan_start_cycle')})")
    if loans_data:
        for i, ln in enumerate(loans_data):
            print(f"  Adicional #{i+1}: R$ {float(ln.get('amount',0)):,.2f} ({ln.get('installments')}x desde {ln.get('start_cycle')})")
    print(f"  Total Tomado  : R$ {total_lent:,.2f}")
    print(f"  Saldo Devedor : R$ {debt:,.2f}")
    print(f"  Parcela {current_month}: R$ {installment:,.2f}")
    print()
