"""
Cria a tabela employee_loans usando o endpoint /rest/v1/rpc se disponível,
ou via SQL direto usando a chave de serviço.
"""
import urllib.request, json

SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Try using rpc exec_sql or similar
sql = """
CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  installments INTEGER NOT NULL,
  start_cycle TEXT NOT NULL,
  request_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

# Try via pg endpoint directly
payload = json.dumps({"query": sql}).encode()
req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/",
    data=payload,
    headers={**HEADERS, "X-Client-Info": "postgrest/12.0"},
    method="POST"
)

# Actually try via Supabase's SQL endpoint (only works for Pro plans)
# Let's try calling a custom RPC or use direct SQL via connection string

# Alternative: create using a stored procedure approach via REST
# Insert into pg_temp? No.

# The simplest approach: use the Supabase JS client to create the table
# But we don't have JS. Let's check if we can POST to /rest/v1/employee_loans to test:
print("Trying to access /rest/v1/employee_loans...")
test_req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/employee_loans?limit=1",
    headers=HEADERS,
    method="GET"
)
try:
    with urllib.request.urlopen(test_req) as r:
        print(f"Table exists! Status: {r.status}")
        data = json.loads(r.read())
        print(f"Records: {len(data)}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Table does NOT exist (HTTP {e.code}): {body[:200]}")
    if e.code == 404:
        print("\n=== AÇÃO NECESSÁRIA ===")
        print("Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard):")
        print("""
CREATE TABLE IF NOT EXISTS employee_loans (
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
