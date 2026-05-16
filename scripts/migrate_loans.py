"""
Fase 1: Cria a tabela employee_loans no Supabase via REST API
e migra os dados existentes de employees.loan_amount e employees.loans_data.
"""
import urllib.request, json, sys
from datetime import datetime

SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def http(method, path, body=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return r.status, json.loads(text) if text else []
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        return e.code, err

# ── Step 1: Fetch all employees with loan data ──────────────────────────────
print("=== Buscando funcionários com empréstimos ===")
status, employees = http("GET", "/rest/v1/employees?select=id,full_name,loan_amount,loan_installments,loan_start_cycle,loan_request_date,loans_data")
if status != 200:
    print(f"ERRO ao buscar funcionários: {employees}")
    sys.exit(1)

print(f"Total de funcionários: {len(employees)}")

# ── Step 2: Check if table exists by trying to fetch from it ────────────────
print("\n=== Verificando se a tabela employee_loans existe ===")
status2, result2 = http("GET", "/rest/v1/employee_loans?limit=1")
table_exists = status2 == 200
print(f"Tabela employee_loans existe: {table_exists} (status={status2})")

if not table_exists:
    print("\n⚠️  A tabela NÃO EXISTE ainda.")
    print("Por favor, execute o seguinte SQL no Supabase SQL Editor:")
    print("""
CREATE TABLE employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  installments INTEGER NOT NULL,
  start_cycle TEXT NOT NULL,
  request_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON employee_loans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON employee_loans FOR SELECT TO anon USING (true);
""")
    print("Após criar a tabela, rode este script novamente.")
    sys.exit(0)

# ── Step 3: Check existing data in new table ────────────────────────────────
status3, existing = http("GET", "/rest/v1/employee_loans?select=employee_id")
existing_ids = set()
if status3 == 200 and existing:
    existing_ids = set(r['employee_id'] for r in existing)
    print(f"\nJá existem {len(existing)} registros na tabela. IDs presentes: {len(existing_ids)}")

# ── Step 4: Migrate data ────────────────────────────────────────────────────
print("\n=== Migrando dados ===")
migrated = 0
skipped = 0
errors = 0

for emp in employees:
    emp_id = emp['id']
    name = emp['full_name']
    
    if emp_id in existing_ids:
        print(f"  SKIP {name} (já migrado)")
        skipped += 1
        continue
    
    records_to_insert = []
    
    # Principal loan
    amount = float(emp.get('loan_amount') or 0)
    installments = int(emp.get('loan_installments') or 0)
    start_cycle = emp.get('loan_start_cycle')
    request_date = emp.get('loan_request_date')
    
    if amount > 0 and installments > 0 and start_cycle:
        records_to_insert.append({
            "employee_id": emp_id,
            "amount": amount,
            "installments": installments,
            "start_cycle": start_cycle,
            "request_date": request_date,
            "notes": "Migrado - Empréstimo Principal"
        })
    
    # Additional loans (loans_data)
    loans_data = emp.get('loans_data')
    if loans_data:
        if isinstance(loans_data, str):
            try:
                loans_data = json.loads(loans_data)
            except:
                loans_data = []
        if isinstance(loans_data, list):
            for i, ln in enumerate(loans_data):
                ln_amount = float(ln.get('amount') or 0)
                ln_inst = int(ln.get('installments') or 0)
                ln_cycle = ln.get('start_cycle')
                ln_req = ln.get('request_date')
                if ln_amount > 0 and ln_inst > 0 and ln_cycle:
                    records_to_insert.append({
                        "employee_id": emp_id,
                        "amount": ln_amount,
                        "installments": ln_inst,
                        "start_cycle": ln_cycle,
                        "request_date": ln_req,
                        "notes": f"Migrado - Adicional #{i+1}"
                    })
    
    if not records_to_insert:
        continue
    
    # Insert all records for this employee
    status_ins, result_ins = http("POST", "/rest/v1/employee_loans", records_to_insert)
    if status_ins in (200, 201):
        print(f"  ✅ {name}: {len(records_to_insert)} registro(s) inseridos")
        migrated += len(records_to_insert)
    else:
        print(f"  ❌ ERRO {name}: status={status_ins} -> {result_ins}")
        errors += 1

print(f"\n=== Migração concluída ===")
print(f"  Migrados: {migrated} registros")
print(f"  Pulados : {skipped} funcionários")
print(f"  Erros   : {errors}")

# ── Step 5: Verify ──────────────────────────────────────────────────────────
print("\n=== Verificando dados finais ===")
status_v, loans_v = http("GET", "/rest/v1/employee_loans?select=id,employee_id,amount,installments,start_cycle&order=employee_id")
if status_v == 200:
    print(f"Total de registros em employee_loans: {len(loans_v)}")
    
    # Group by employee
    by_emp = {}
    for ln in loans_v:
        eid = ln['employee_id']
        by_emp.setdefault(eid, []).append(ln)
    
    emp_map = {e['id']: e['full_name'] for e in employees}
    for eid, lns in by_emp.items():
        total = sum(float(l['amount']) for l in lns)
        print(f"  {emp_map.get(eid, eid)}: {len(lns)} empréstimo(s) = R${total:,.2f}")
