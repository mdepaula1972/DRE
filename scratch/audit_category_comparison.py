import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Config
COMPANY = "Mar Brasil" # "Mar Brasil" or "DZM"
MONTH = 1
YEAR = 2026

IS_DZM = "DZM" in COMPANY.upper()
APP_KEY = os.getenv('OMIE_APP_KEY_DZM' if IS_DZM else 'OMIE_APP_KEY_MARBRASIL')
APP_SECRET = os.getenv('OMIE_APP_SECRET_DZM' if IS_DZM else 'OMIE_APP_SECRET_MARBRASIL')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

def fetch_omie(call, param):
    url = "https://app.omie.com.br/api/v1/financas/contapagar/" if "ContasPagar" in call else "https://app.omie.com.br/api/v1/financas/mf/"
    payload = {
        "call": call,
        "app_key": APP_KEY,
        "app_secret": APP_SECRET,
        "param": [param]
    }
    response = requests.post(url, json=payload)
    return response.json()

def fetch_supabase(table, company, start, end):
    url = f"{SUPABASE_URL}/rest/v1/{table}?empresa_nome=eq.{company}&data_registro=gte.{start}&data_registro=lte.{end}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    res = requests.get(url, headers=headers)
    return res.json()

def audit():
    print(f"--- Auditoria: {COMPANY} - {MONTH:02d}/{YEAR} ---")
    
    start_date = f"{YEAR}-{MONTH:02d}-01"
    import calendar
    last_day = calendar.monthrange(YEAR, MONTH)[1]
    end_date = f"{YEAR}-{MONTH:02d}-{last_day}"
    
    br_start = f"01/{MONTH:02d}/{YEAR}"
    br_end = f"{last_day}/{MONTH:02d}/{YEAR}"

    # 1. Fetch Categories (for names)
    cat_names = {}
    cat_page = 1
    while True:
        cat_res = requests.post("https://app.omie.com.br/api/v1/geral/categorias/", json={
            "call": "ListarCategorias",
            "app_key": APP_KEY, "app_secret": APP_SECRET,
            "param": [{"pagina": cat_page, "registros_por_pagina": 500}]
        }).json()
        records = cat_res.get('categoria_cadastro', [])
        for c in records:
            cat_names[str(c['codigo'])] = c['descricao']
        
        if cat_page >= cat_res.get('total_de_paginas', 0): break
        cat_page += 1

    # 2. Fetch Omie CP
    omie_cp_total = {}
    page = 1
    while True:
        res = fetch_omie("ListarContasPagar", {
            "pagina": page,
            "registros_por_pagina": 100,
            "filtrar_por_registro_de": br_start,
            "filtrar_por_registro_ate": br_end
        })
        records = res.get('conta_pagar_cadastro', [])
        for r in records:
            if r.get('status_titulo') == 'CANCELADO': continue
            cat_id = r.get('codigo_categoria')
            val = r.get('valor_documento', 0)
            # Omie CP entries might have rateio (distribuicao)
            dist = r.get('distribuicao', [])
            if dist:
                for d in dist:
                    omie_cp_total[cat_id] = omie_cp_total.get(cat_id, 0) + d.get('nValDep', 0)
            else:
                omie_cp_total[cat_id] = omie_cp_total.get(cat_id, 0) + val
        
        if page >= res.get('total_de_paginas', 0): break
        page += 1

    # 3. Fetch Omie MOV
    omie_mov_total = {}
    page = 1
    while True:
        res = fetch_omie("ListarMovimentos", {
            "nPagina": page,
            "nRegPorPagina": 100,
            "dRegDe": br_start,
            "dRegAte": br_end
        })
        records = res.get('movimentos', [])
        for r in records:
            # Em MOV, categoria_id costuma ser o campo 'cCodCateg'
            # Só interessam saídas (detalhes.cTipo = 'S')
            if r.get('detalhes', {}).get('cTipo') != 'S': continue
            cat_id = r.get('detalhes', {}).get('cCodCateg')
            val = r.get('detalhes', {}).get('nValor', 0)
            omie_mov_total[cat_id] = omie_mov_total.get(cat_id, 0) + val
            
        if page >= res.get('nTotPaginas', 0): break
        page += 1

    # 4. Fetch Supabase omie_raw
    sb_records = fetch_supabase("omie_raw", COMPANY, start_date, end_date)
    sb_total = {}
    for r in sb_records:
        cat_id = r.get('categoria_codigo')
        val = float(r.get('valor_alocado') or 0)
        sb_total[cat_id] = sb_total.get(cat_id, 0) + val

    # 5. Comparison
    # Filter out None from all_cats or map to string
    all_cats = set(list(omie_cp_total.keys()) + list(omie_mov_total.keys()) + list(sb_total.keys()))
    safe_cats = [str(c) if c is not None else "" for c in all_cats]
    
    print(f"{'Categoria':<40} | {'Omie (CP)':>12} | {'Omie (MOV)':>12} | {'Omie (Total)':>12} | {'Supabase':>12} | {'Dif':>12}")
    print("-" * 120)
    
    discrepancies = []
    
    for cid_str in sorted(safe_cats):
        # Convert back to original type for lookup
        cid = None if cid_str == "" else (int(cid_str) if cid_str.isdigit() else cid_str)
        
        name = cat_names.get(cid, f"Desconhecida ({cid})")
        cp_val = omie_cp_total.get(cid, 0)
        mov_val = omie_mov_total.get(cid, 0)
        total_omie = cp_val + mov_val
        sb_val = sb_total.get(cid, 0)
        diff = total_omie - sb_val
        
        if abs(diff) > 0.05:
            discrepancies.append((name, total_omie, sb_val, diff))
            
        print(f"{name[:40]:<40} | {cp_val:12.2f} | {mov_val:12.2f} | {total_omie:12.2f} | {sb_val:12.2f} | {diff:12.2f}")

    print("\n--- RESUMO DE DISCREPANCIAS ---")
    if not discrepancies:
        print("OK: Tudo bateu 100%!")
    else:
        for name, o, s, d in discrepancies:
            print(f"ERRO: {name}: Omie {o:.2f} vs Supabase {s:.2f} (Dif: {d:.2f})")

if __name__ == "__main__":
    audit()
