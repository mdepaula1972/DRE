import os
import requests
from dotenv import load_dotenv

load_dotenv()

def find():
    for company in ["MARBRASIL", "DZM"]:
        print(f"--- {company} ---")
        app_key = os.getenv(f'OMIE_APP_KEY_{company}')
        app_secret = os.getenv(f'OMIE_APP_SECRET_{company}')
        
        page = 1
        while True:
            res = requests.post("https://app.omie.com.br/api/v1/geral/categorias/", json={
                "call": "ListarCategorias",
                "app_key": app_key, "app_secret": app_secret,
                "param": [{"pagina": page, "registros_por_pagina": 100}]
            }).json()
            
            for c in res.get('categoria_cadastro', []):
                code = c['codigo']
                name = c['descricao']
                if "2.05" in code or "TARIFA" in name.upper() or "BANC" in name.upper():
                    print(f"{code} | {name}")
            
            if page >= res.get('total_de_paginas', 0): break
            page += 1

if __name__ == "__main__":
    find()
