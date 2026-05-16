import requests

url = 'https://ngtjhwswbbivqajtpjvg.supabase.co'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28'
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

# 1. Ver todos os campos do raw_data de um CP
print('=== raw_data completo de um PAGAR ===')
resp = requests.get(f'{url}/rest/v1/omie_financas_unificado', headers=headers, params={
    'select': 'omie_id,tipo_registro,cliente_fornecedor,raw_data', 'limit': '1', 'tipo_registro': 'eq.PAGAR'
})
r = resp.json()[0]
print('cliente_fornecedor:', repr(r.get('cliente_fornecedor')))
raw = r.get('raw_data') or {}
print('raw_data keys:', list(raw.keys()))
# Quais campos no raw têm o código do cliente?
for k in ['codigo_cliente_fornecedor', 'codigo_lancamento_omie', 'nm_cliente', 'nome_fantasia']:
    print(f'  raw[{k}] =', repr(raw.get(k)))

# 2. Verificar se existe tabela omie_dim_fornecedores
print('\n=== Tabelas de fornecedores disponiveis ===')
for table in ['omie_dim_fornecedores', 'omie_fornecedores', 'omie_clientes', 'omie_dim_clientes']:
    try:
        r2 = requests.get(f'{url}/rest/v1/{table}', headers=headers, params={'limit': '1'})
        if r2.status_code == 200:
            data = r2.json()
            print(f'  {table}: OK - {len(data)} rows sample')
            if data:
                print(f'    Keys: {list(data[0].keys())}')
        else:
            print(f'  {table}: {r2.status_code}')
    except Exception as e:
        print(f'  {table}: Erro - {e}')

# 3. Ver raw_data de MOVIMENTO completo
print('\n=== raw_data.detalhes de um MOVIMENTO ===')
resp3 = requests.get(f'{url}/rest/v1/omie_financas_unificado', headers=headers, params={
    'select': 'omie_id,raw_data', 'limit': '1', 'tipo_registro': 'eq.MOVIMENTO'
})
r3 = resp3.json()[0]
raw3 = r3.get('raw_data') or {}
det3 = raw3.get('detalhes') or {}
print('detalhes keys:', list(det3.keys()))
for k in ['cNomeCliente', 'nCodCliente', 'cTipo', 'cStatus']:
    print(f'  det[{k}] =', repr(det3.get(k)))
