import pandas as pd
import numpy as np
import re
import os
from datetime import datetime

def smart_load_data(file_path):
    """
    Carrega Excel ou CSV do Omie, buscando a linha de cabeçalho correta.
    """
    ext = os.path.splitext(file_path)[1].lower()
    df_raw = None

    print(f"Tentando carregar Omie: {file_path}")

    try:
        if ext == '.xlsx':
            try:
                df_raw = pd.read_excel(file_path, sheet_name='DRE padronizado para Excel DRE', header=None)
            except:
                df_raw = pd.read_excel(file_path, header=None)
        elif ext == '.csv':
            for sep in [';', ',']:
                for enc in ['utf-8-sig', 'latin-1']:
                    try:
                        df_raw = pd.read_csv(file_path, sep=sep, encoding=enc, header=None, engine='python', names=range(100))
                        df_raw = df_raw.dropna(axis=1, how='all')
                        if df_raw is not None and df_raw.shape[1] > 1:
                            break
                    except:
                        continue
                if df_raw is not None and df_raw.shape[1] > 1: break
        
        if df_raw is None: return None

        # Detecção de cabeçalho Omie
        keywords = {"minha empresa", "conta do dre", "categoria", "departamento"}
        header_row_idx = 0
        for i, row in df_raw.head(30).iterrows():
            row_vals = [str(v).lower().strip() for v in row if pd.notna(v)]
            if sum(1 for k in keywords if any(k in v for v in row_vals)) >= 2:
                header_row_idx = i
                break
        
        df = df_raw.iloc[header_row_idx:].copy()
        df.columns = df.iloc[0]
        df = df[1:].reset_index(drop=True)
        
        # Mapeamento Base Omie
        target_mapping = {
            "minha empresa (nome fantasia)": "Empresa_Raw",
            "empresa": "Empresa_Raw",
            "conta do dre": "Conta_DRE_Raw",
            "categoria": "Categoria_Omie_Raw",
            "departamento": "Projeto_Raw",
            "projeto": "Projeto_Raw"
        }
        
        final_rename = {}
        for col in df.columns:
            norm_c = str(col).strip().lower()
            for needle, target in target_mapping.items():
                if needle in norm_c:
                    final_rename[col] = target
                    break
        
        df = df.rename(columns=final_rename)
        dim_cols = ["Empresa_Raw", "Conta_DRE_Raw", "Categoria_Omie_Raw", "Projeto_Raw"]
        excluir = ["total", "valor", "soma", "unnamed", "saldo", "index"]
        
        mes_cols = []
        for c in df.columns:
            c_str = str(c).lower().strip()
            if c in dim_cols or any(e in c_str for e in excluir): continue
            mes_cols.append(c)
        
        return {"df": df, "mes_cols": mes_cols, "dim_cols": dim_cols}
    except Exception as e:
        print(f"Erro ao carregar Omie: {e}")
        return None

def parse_competencia(val):
    s = str(val).lower().strip()
    
    # Mapeamento fixo para evitar dependência de locale do sistema
    meses_map = {
        "jan": "jan", "feb": "fev", "fev": "fev", "mar": "mar", 
        "apr": "abr", "abr": "abr", "may": "mai", "mai": "mai",
        "jun": "jun", "jul": "jul", "aug": "ago", "ago": "ago",
        "sep": "set", "set": "set", "oct": "out", "out": "out",
        "nov": "nov", "dec": "dez", "dez": "dez"
    }
    
    # Se for texto (ex: "Janeiro/2025" ou "jan/25")
    for eng, pt in meses_map.items():
        if eng in s or pt in s:
            ano_match = re.search(r"\d{2,4}", s)
            ano = ano_match.group()[-2:] if ano_match else "25"
            return f"{pt}/{ano}"
            
    try:
        # Se for objeto datetime ou serial do Excel
        dt = pd.to_datetime(val, dayfirst=True)
        # Meses manuais para garantir PT
        meses_lista = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
        m_idx = dt.month - 1
        return f"{meses_lista[m_idx]}/{dt.strftime('%y')}"
    except:
        return s

def fix_swapped_columns(df):
    """
    Heurística para corrigir inversão entre Projeto e Categoria.
    Se 'Projeto' contém palavras-chave de Categoria (ex: Impostos, Despesas)
    E 'Categoria' NÃO contém (ex: Bertioga, Nome de Projeto), então inverte.
    """
    # Palavras-chave FORTES que indicam uma Categoria Financeira
    cat_keywords = [
        "RECEITA", "IMPOSTOS", "DESPESA", "CUSTO", "DEDUCOES", "DEDUÇÕES", 
        "LUCRO", "PREJUIZO", "PREJUÍZO", "ATIVOS", "PASSIVOS", "DEVOLUCOES", 
        "DEVOLUÇÕES", "ABATIMENTOS", "OUTRAS RECEITAS", "OUTROS CUSTOS", 
        "OUTROS TRIBUTOS", "TERCEIRIZAÇÃO", "PROVISÃO", "FOLHA DE PAGAMENTO"
    ]
    
    # Função para verificar se parece categoria
    def seems_like_category(val):
        s = str(val).upper().strip()
        # Ignorar nomes de projeto que podem conter palavras chaves por coincidência? 
        # Mas 'Impostos' e 'Despesas Administrativas' são bem específicos.
        return any(k in s for k in cat_keywords)

    swapped_count = 0
    
    # Iterar e corrigir (usando itertuples para performance se fosse read-only, mas precisamos editar)
    # Como o dataset não é gigante, iterrows ou apply resolve.
    # Vamos usar vetorização boolean mask para velocidade
    
    mask_proj_is_cat = df['Projeto'].apply(seems_like_category)
    mask_cat_is_NOT_cat = ~df['Categoria'].apply(seems_like_category)
    
    # Condição: Projeto PARECE Categoria E Categoria NÃO PARECE (é provável Projeto)
    swap_mask = mask_proj_is_cat & mask_cat_is_NOT_cat
    
    if swap_mask.any():
        num_swapped = swap_mask.sum()
        print(f"⚠️ DETECTADA INVERSÃO: Corrigindo {num_swapped} registros onde Projeto <-> Categoria estavam trocados.")
        
        # Realizar a troca
        # Preservar valores antigos
        original_proj = df.loc[swap_mask, 'Projeto'].copy()
        original_cat = df.loc[swap_mask, 'Categoria'].copy()
        
        df.loc[swap_mask, 'Projeto'] = original_cat
        df.loc[swap_mask, 'Categoria'] = original_proj
        
        # Opcional: Debug dos primeiros corrigidos
        # print(df.loc[swap_mask, ['Empresa', 'Projeto', 'Categoria']].head(3))
        
    return df


def smart_load_csv(path):
    for enc in ['utf-8-sig', 'iso-8859-1', 'cp1252']:
        try:
            return pd.read_csv(path, sep=';', encoding=enc)
        except:
            continue
    return None

def process_omie_to_long(data_dict):
    """
    Executa a pipeline de 7 passos e retorna o DataFrame no formato 'long'.
    """
    df = data_dict["df"]
    mes_cols = data_dict["mes_cols"]
    dim_cols = data_dict["dim_cols"]

    # 1. Fill Down
    present_dims = [col for col in dim_cols if col in df.columns]
    for col in present_dims:
        df[col] = df[col].astype(str).replace(['', 'nan', 'None', 'nan ', 'None '], np.nan)
    if present_dims:
        df[present_dims] = df[present_dims].ffill()

    # 2. Unpivot
    df_long = pd.melt(df, id_vars=present_dims, value_vars=mes_cols, var_name='Mes_Raw', value_name='Valor_Raw')

    # 3. & 6. Mês e Valor
    df_long['Mes'] = df_long['Mes_Raw'].apply(parse_competencia)
    
    def clean_valor(val):
        try:
            if pd.isna(val) or str(val).strip() == "": return 0
            if isinstance(val, (float, int, np.number)): return int(round(abs(float(val)), 0))
            s = str(val).strip()
            if ',' in s and '.' in s: s = s.replace('.', '').replace(',', '.')
            elif ',' in s: s = s.replace(',', '.')
            return int(round(abs(float(s)), 0))
        except: return 0
    df_long['Valor'] = df_long['Valor_Raw'].apply(clean_valor)

    # 4. Empresa e Projeto
    def normalize_empresa(val):
        s = str(val).upper().strip()
        # Filtrar lixo/totais que o Omie às vezes traz
        if "TOTAL GERAL" in s or "FILIAL" in s or s == "NAN" or s == "": 
            return None
        # Regex para DZM: D, ponto opcional, Z, ponto opcional, M
        if re.search(r'D\.?Z\.?M', s): return "DZM"
        if "MAR BR" in s or "MAR BRASIL" in s: return "Mar_BR"
        return s
        
    df_long['Empresa'] = df_long['Empresa_Raw'].apply(normalize_empresa)
    # Remover linhas onde a empresa foi invalidada (lixo)
    df_long = df_long.dropna(subset=['Empresa'])
    
    df_long['Projeto'] = df_long['Projeto_Raw'].astype(str).str.strip()

    # 5. Categoria (Conta + Overrides)
    def clean_conta(txt):
        if pd.isna(txt) or txt == "nan": return ""
        t = str(txt).encode('utf-8', 'ignore').decode('utf-8')
        return re.sub(r"^([0-9]+(\.[0-9]+)*)\s*[-–—\.)]*\s*", "", t).strip()
    
    # Fallback se Conta_DRE_Raw não existir
    if 'Conta_DRE_Raw' in df_long.columns:
        df_long['Conta_Clean'] = df_long['Conta_DRE_Raw'].apply(clean_conta)
    elif 'Categoria_Omie_Raw' in df_long.columns:
        df_long['Conta_Clean'] = df_long['Categoria_Omie_Raw'].apply(clean_conta)
    else:
        df_long['Conta_Clean'] = ""

    overrides = ["Corretiva - B2G", "Preventiva - B2G", "Adiantamento - Credenciado TI",
                 "Adiantamento - Credenciado Operacional", "Adiantamento - Credenciado Administrativo",
                 "Credenciado TI", "Credenciado Operacional", "Credenciado Administrativo",
                 "Provisão IRPJ CSSL Trimestral", "Terceirização de mão de obra"]
    
    def determine_cat(row):
        cat_omie = str(row['Categoria_Omie_Raw']).strip()
        if any(o.lower() in cat_omie.lower() for o in overrides):
            if "consorc" in cat_omie.lower() and "contemplado" in cat_omie.lower():
                return row['Conta_Clean']
            return cat_omie
        return row['Conta_Clean']
    df_long['Categoria'] = df_long.apply(determine_cat, axis=1)

    return df_long[['Empresa', 'Projeto', 'Categoria', 'Mes', 'Valor']]

def load_master_long(path):
    """
    Carrega o arquivo mestre (dados.csv) e transforma em 'long'.
    """
    if not os.path.exists(path):
        print(f"Aviso: Mestre não encontrado em {path}")
        return pd.DataFrame(columns=['Empresa', 'Projeto', 'Categoria', 'Mes', 'Valor'])
    
    print(f"Carregando Mestre Histórico: {path}")
    df_master = smart_load_csv(path)
            
    if df_master is None:
        print(f"Erro: Não foi possível ler o mestre {path}")
        return pd.DataFrame(columns=['Empresa', 'Projeto', 'Categoria', 'Mes', 'Valor'])
    
    # Identificar colunas de meses (padrão mmm/yy)
    dim_cols = ['Empresa', 'Projeto', 'Categoria']
    df_master.columns = [str(c).strip() for c in df_master.columns]
    mes_cols = [c for c in df_master.columns if c not in dim_cols]
    
    # Normalização preventiva do Mestre
    def normalize_empresa(val):
        s = str(val).upper().strip()
        if "TOTAL GERAL" in s or s == "NAN" or s == "": return None
        if re.search(r'D\.?Z\.?M', s): return "DZM"
        if "MAR BR" in s or "MAR BRASIL" in s: return "Mar_BR"
        return s
    
    df_master['Empresa'] = df_master['Empresa'].apply(normalize_empresa)
    df_master = df_master.dropna(subset=['Empresa'])
    
    df_long = pd.melt(df_master, id_vars=dim_cols, value_vars=mes_cols, var_name='Mes', value_name='Valor')
    df_long['Valor'] = pd.to_numeric(df_long['Valor'], errors='coerce').fillna(0).astype(int)
    
    # APLICAR CORREÇÃO NO MESTRE TAMBÉM
    df_long = fix_swapped_columns(df_long)
    
    return df_long

def consolidate_and_save(df_hist_long, df_new_long, output_path):
    """
    Faz o Merge (Upsert) entre o histórico e o novo, garantindo ordem cronológica.
    """
    print(f"Mesclando {len(df_hist_long)} linhas do mestre com {len(df_new_long)} novas linhas...")
    
    # Marcar origem para priorizar novo no drop_duplicates
    df_hist_long['Source'] = 0
    df_new_long['Source'] = 1
    
    combined = pd.concat([df_hist_long, df_new_long], ignore_index=True)
    
    # Upsert: Mesma chave (Empresa, Projeto, Categoria, Mes) -> mantém o do Source=1 (Novo)
    combined = combined.sort_values(['Empresa', 'Projeto', 'Categoria', 'Mes', 'Source'])
    combined = combined.drop_duplicates(subset=['Empresa', 'Projeto', 'Categoria', 'Mes'], keep='last')
    
    # Agrupar para garantir consolidado limpo
    df_grouped = combined.groupby(['Empresa', 'Projeto', 'Categoria', 'Mes'], as_index=False)['Valor'].sum()
    df_grouped = df_grouped[df_grouped['Valor'] > 0] # Remove zeros

    # Ordenação Cronológica
    def sort_key(m):
        try:
            p = m.split('/')
            mes_map = {"jan":1,"fev":2,"mar":3,"abr":4,"mai":5,"jun":6,"jul":7,"ago":8,"set":9,"out":10,"nov":11,"dez":12}
            return int(p[1]) * 100 + mes_map.get(p[0].lower(), 0)
        except: return 0

    all_months = sorted(df_grouped['Mes'].unique(), key=sort_key)
    
    # Re-pivot
    df_final = df_grouped.pivot_table(
        index=['Empresa', 'Projeto', 'Categoria'],
        columns='Mes',
        values='Valor',
        aggfunc='sum'
    ).reset_index()
    
    # Preencher colunas faltantes e ordenar
    for m in all_months:
        if m not in df_final.columns: df_final[m] = 0
        df_final[m] = df_final[m].fillna(0).astype(int)
    
    df_final = df_final[['Empresa', 'Projeto', 'Categoria'] + all_months]
    
    # Salvar
    df_final.to_csv(output_path, index=False, encoding='utf-8-sig', sep=';')
    print(f"Consolidado concluído! {len(df_final)} registros salvos em: {output_path}")

if __name__ == "__main__":
    master_file = "dados.csv"
    omie_inputs = ["pivot_atual.xlsx", "pivot_atual.csv"]
    
    # 1. Carregar Histórico
    df_master_long = load_master_long(master_file)
    
    # 2. Carregar e Processar Novo (se existir)
    df_new_long = pd.DataFrame(columns=['Empresa', 'Projeto', 'Categoria', 'Mes', 'Valor'])
    for path in omie_inputs:
        if os.path.exists(path):
            data = smart_load_data(path)
            if data is not None:
                df_new_long = process_omie_to_long(data)
                # APLICAR CORREÇÃO NO NOVO
                df_new_long = fix_swapped_columns(df_new_long)
                break
    
    if df_new_long.empty:
        print("Aviso: Nenhum arquivo novo do Omie encontrado para mesclar.")
        # Se não houver novo, apenas garante o master salvo (opcional)
    
    # 3. Consolidar
    consolidate_and_save(df_master_long, df_new_long, master_file)
