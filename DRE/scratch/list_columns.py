import os
import requests
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
HEADERS = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Range": "0-0"}

resp = requests.get(f"{URL}/rest/v1/omie_raw?select=*", headers=HEADERS)
if resp.status_code == 200:
    data = resp.json()
    if data:
        print("Colunas encontradas:")
        for col in data[0].keys():
            print(f"- {col}")
    else:
        print("Tabela vazia.")
else:
    print(f"Erro: {resp.status_code} - {resp.text}")
