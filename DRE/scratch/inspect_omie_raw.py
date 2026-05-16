import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table("omie_raw").select("*").limit(1).execute()
if res.data:
    row = res.data[0]
    print("--- COLUNAS DA TABELA ---")
    for k in row.keys():
        print(f"Coluna: {k} | Valor: {row[k]}")
    
    if "raw_data" in row and row["raw_data"]:
        print("\n--- CHAVES DO RAW_DATA (JSON OMIE) ---")
        for rk in row["raw_data"].keys():
            print(f"Chave JSON: {rk} | Valor: {row['raw_data'][rk]}")
else:
    print("Nenhum dado encontrado.")
