"""
Sync Omie DRE → Supabase
========================

Pipeline completo:
1. Download do relatório DRE via Playwright (login + navegação + export CSV)
2. Processamento e normalização (reutiliza process_excel_dre.py)
3. Consolidação com dados históricos (merge/upsert local)
4. Upload para Supabase (upsert em batch)

Usage:
  python sync_omie_dre.py                  # Execução completa (headless)
  python sync_omie_dre.py --debug          # Modo debug (navegador visível)
  python sync_omie_dre.py --step download  # Só faz o download
  python sync_omie_dre.py --step process   # Só processa o CSV
  python sync_omie_dre.py --step upload    # Só faz upload ao Supabase
"""

import asyncio
import argparse
import os
import sys
import time
from datetime import datetime

# --- Dependências de terceiros ---
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright não instalado. Execute: pip install playwright && python -m playwright install chromium")
    sys.exit(1)

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("❌ pandas/numpy não instalados. Execute: pip install pandas numpy openpyxl")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ python-dotenv não instalado. Execute: pip install python-dotenv")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("❌ supabase-py não instalado. Execute: pip install supabase")
    sys.exit(1)

# --- Imports locais ---
from process_excel_dre import smart_load_data, process_omie_to_long, fix_swapped_columns, load_master_long, consolidate_and_save

# --- Configuração ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

OMIE_EMAIL = os.getenv("OMIE_EMAIL", "")
OMIE_PASSWORD = os.getenv("OMIE_PASSWORD", "")
REPORT_NAME = os.getenv("OMIE_REPORT_NAME", "Base para IA tratar")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

DOWNLOAD_FILE = os.path.join(BASE_DIR, "pivot_atual.csv")
MASTER_FILE = os.path.join(BASE_DIR, "dados.csv")
SCREENSHOT_DIR = os.path.join(BASE_DIR, "debug_screenshots")

BATCH_SIZE = 500


def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    icons = {"INFO": "ℹ️", "OK": "✅", "WARN": "⚠️", "ERR": "❌", "STEP": "🔹"}
    print(f"[{timestamp}] {icons.get(level, '•')} {msg}")


def validate_env():
    missing = []
    if not OMIE_EMAIL: missing.append("OMIE_EMAIL")
    if not OMIE_PASSWORD: missing.append("OMIE_PASSWORD")
    if not SUPABASE_URL: missing.append("SUPABASE_URL")
    if not SUPABASE_KEY: missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        log(f"Variáveis de ambiente faltando no .env: {', '.join(missing)}", "ERR")
        sys.exit(1)


# ============================================================
# ETAPA 1: Download via Playwright
# ============================================================

async def download_from_omie(debug=False):
    log("ETAPA 1: Download do relatório da Omie", "STEP")

    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=not debug,
            slow_mo=300 if debug else 100
        )
        context = await browser.new_context(
            accept_downloads=True,
            viewport={"width": 1920, "height": 1080},
            locale="pt-BR"
        )
        page = await context.new_page()

        try:
            # --- LOGIN NATIVO OMIE (2 etapas) ---
            # Etapa 1: Email → clicar "Continuar"
            # Etapa 2: Senha → clicar "Entrar"

            log("Acessando página de login da Omie...")
            await page.goto("https://app.omie.com.br/login/", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(3000)

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "00_pagina_login.png"))

            # --- ETAPA 1: Preencher email ---
            log("Preenchendo email...")
            email_selectors = [
                'input[placeholder*="e-mail"]',
                'input[placeholder*="E-mail"]',
                'input[type="email"]',
                'input[name="email"]',
                '#email',
                'input[placeholder*="mail"]',
            ]
            for sel in email_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=3000)
                    if el:
                        await el.fill(OMIE_EMAIL)
                        log(f"Email preenchido (seletor: {sel})")
                        break
                except:
                    continue
            else:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_login_email.png"))
                raise Exception("Não encontrou campo de email no login da Omie")

            # Clicar em "Continuar" (NÃO "Entrar com o Google")
            await page.wait_for_timeout(500)
            continuar_selectors = [
                'button:has-text("Continuar")',
                'a:has-text("Continuar")',
                'input[value*="Continuar"]',
                'button[type="submit"]',
            ]
            for sel in continuar_selectors:
                try:
                    # Evitar o botão "Continuar com a Apple"
                    elements = await page.query_selector_all(sel)
                    for el in elements:
                        text = await el.text_content()
                        if text and "Apple" not in text and "Google" not in text:
                            await el.click()
                            log(f"Clicou 'Continuar' (seletor: {sel})")
                            break
                    else:
                        continue
                    break
                except:
                    continue
            else:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_login_continuar.png"))
                raise Exception("Não encontrou botão 'Continuar' no login")

            # Aguardar tela de senha carregar
            await page.wait_for_timeout(3000)

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "00b_tela_senha.png"))

            # --- ETAPA 2: Preencher senha ---
            log("Preenchendo senha...")
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
                'input[placeholder*="enha"]',
                'input[placeholder*="Senha"]',
            ]
            for sel in password_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=10000)
                    if el:
                        await el.fill(OMIE_PASSWORD)
                        log(f"Senha preenchida (seletor: {sel})")
                        break
                except:
                    continue
            else:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_login_senha.png"))
                raise Exception("Não encontrou campo de senha")

            # Clicar em "Entrar" (agora é seguro, a tela de senha não tem Google)
            await page.wait_for_timeout(500)
            entrar_selectors = [
                'button:has-text("Entrar")',
                'button[type="submit"]',
                'a:has-text("Entrar")',
                'input[type="submit"]',
                'button:has-text("Login")',
            ]
            for sel in entrar_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=3000)
                    if el:
                        await el.click()
                        log(f"Login submetido (seletor: {sel})")
                        break
                except:
                    continue
            else:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_login_entrar.png"))
                raise Exception("Não encontrou botão 'Entrar'")

            # Aguardar redirect pós-login (pode ir para seletor de apps ou direto para dashboard)
            log("Aguardando redirect pós-login...")
            await page.wait_for_load_state("domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            
            current_url = page.url
            log(f"URL pós-login: {current_url}")
            
            # Se não estiver no Mar Brasil, navegar para lá
            if "mar-8w7sxfya" not in current_url:
                log("Navegando para dashboard da Mar Brasil...")
                await page.goto("https://app.omie.com.br/gestao/mar-8w7sxfya/", wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(3000)
            
            log("Dashboard Mar Brasil carregado", "OK")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "01b_dashboard_mar_brasil.png"))

            # --- CLICAR NO CARD VERDE "FINANÇAS" ---
            log("Clicando no card Finanças (verde)...")
            # O card Finanças é um link grande (a) com fundo verde
            # Vamos ser mais específicos: procurar links que contenham Finanças E sejam grandes (cards)
            await page.wait_for_timeout(2000)  # Aguardar cards renderizarem
            
            financas_found = False
            try:
                # Estratégia 1: Clicar em qualquer elemento grande com "Finanças"
                # que NÃO esteja dentro de um nav/menu/sidebar
                all_financas = await page.query_selector_all('a, div')
                for el in all_financas:
                    text = await el.text_content()
                    if text and "Finanças" in text and "Finanças" == text.strip():
                        # Verificar se é um card (não menu)
                        box = await el.bounding_box()
                        if box and box['width'] > 100 and box['height'] > 100:  # Cards são grandes
                            await el.click()
                            await page.wait_for_timeout(3000)
                            log("Clicou no card Finanças (card verde grande)")
                            financas_found = True
                            break
            except:
                pass

            if not financas_found:
                # Estratégia 2: Procurar especificamente um link verde com "$" ou ícone financeiro
                try:
                    # No screenshot, Finanças tem um ícone de dólar ($)
                    financas_card = await page.wait_for_selector('a:has-text("Finanças"), div:has-text("Finanças")', timeout=5000)
                    if financas_card:
                        await financas_card.click()
                        await page.wait_for_timeout(3000)
                        log("Clicou no card Finanças (fallback)")
                        financas_found = True
                except:
                    pass

            if not financas_found:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_card_financas.png"))
                raise Exception("Não encontrou o card verde 'Finanças'. Verifique o screenshot.")

            # Aguardar página de Finanças carregar (menu lateral já estará visível)
            await page.wait_for_load_state("domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)
            log("Página de Finanças carregada (menu lateral visível)", "OK")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "02_pagina_financas.png"))

            # --- HOVER NO BOTÃO VERDE DA SIDEBAR (abre menu com "Meus Relatórios") ---
            log("Passando mouse sobre botão verde da sidebar...")
            # O botão verde está na sidebar lateral esquerda
            # Vamos procurar por botões/links verdes na sidebar
            green_button_selectors = [
                # Pode ser um link ou botão com ícone
                'aside a[class*="active"]',
                'aside button[class*="active"]',
                'nav a:first-of-type',
                'nav button:first-of-type',
                # Procurar por elemento verde na sidebar
                '.sidebar a:first-of-type',
                '.sidebar button:first-of-type',
                # Elemento com ícone na esquerda
                'aside > a:first-of-type',
                'aside > button:first-of-type',
            ]
            
            found_green_btn = False
            green_element = None
            
            for sel in green_button_selectors:
                try:
                    el = await page.query_selector(sel)
                    if el:
                        # Verificar se é visível e se tem cor verde (ou está destacado)
                        is_visible = await el.is_visible()
                        if is_visible:
                            green_element = el
                            found_green_btn = True
                            log(f"Encontrou botão verde (seletor: {sel})")
                            break
                except:
                    continue
            
            # Se não encontrou, tentar procurar todos os botões da sidebar e pegar o primeiro visível
            if not found_green_btn:
                try:
                    sidebar_buttons = await page.query_selector_all('aside button, aside a, nav button, nav a')
                    for btn in sidebar_buttons:
                        is_visible = await btn.is_visible()
                        if is_visible:
                            green_element = btn
                            found_green_btn = True
                            log("Encontrou primeiro botão visível da sidebar")
                            break
                except:
                    pass

            if not found_green_btn or not green_element:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_botao_verde.png"))
                raise Exception("Não encontrou o botão verde da sidebar. Verifique o screenshot.")

            # HOVER no botão verde para abrir o menu dropdown
            await green_element.hover()
            await page.wait_for_timeout(1500)
            log("Mouse sobre botão verde - menu dropdown deve estar visível")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "03_menu_dropdown.png"))

            # --- CLICAR EM "BASE PARA IA TRATAR" NO MENU DROPDOWN ---
            log(f"Procurando '{REPORT_NAME}' no menu dropdown...")
            # O menu dropdown deve estar visível agora. Procurar "Base para IA tratar"
            report_selectors = [
                f'a:has-text("{REPORT_NAME}")',
                f'span:has-text("{REPORT_NAME}")',
                f'li:has-text("{REPORT_NAME}")',
                f'div:has-text("{REPORT_NAME}")',
                f'text="{REPORT_NAME}"',
            ]
            found_report = False
            for sel in report_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=5000)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(3000)
                        log(f"Clicou no relatório (seletor: {sel})")
                        found_report = True
                        break
                except:
                    continue

            if not found_report:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_relatorio.png"))
                raise Exception(f"Não encontrou relatório '{REPORT_NAME}'. Verifique o screenshot.")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "04_tela_relatorio.png"))

            # --- CONFIGURAR PERÍODO (junho/2025 até mês anterior ao atual) ---
            from datetime import datetime
            current_date = datetime.now()
            # Mês anterior ao atual
            if current_date.month == 1:
                last_month = 12
                last_month_year = current_date.year - 1
            else:
                last_month = current_date.month - 1
                last_month_year = current_date.year

            # Nomes dos meses em português (para selectors)
            month_names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
            start_month_name = "Junho"
            end_month_name = month_names[last_month - 1]

            log(f"Configurando período: Junho/2025 até {end_month_name}/{last_month_year}...")

            # Mês inicial (Junho)
            try:
                # Procurar dropdown "Mês Inicial" e selecionar Junho
                mes_inicial_sel = await page.wait_for_selector('[id*="nicial"], select:has-text("Junho"), select[name*="mes"]', timeout=5000)
                if mes_inicial_sel:
                    await mes_inicial_sel.select_option(label=start_month_name)
                    log(f"Mês inicial: {start_month_name}")
            except:
                log("Não conseguiu definir mês inicial automaticamente", "WARN")

            # Ano inicial (2025)
            try:
                ano_inicial_sel = await page.wait_for_selector('[id*="no"][id*="nicial"], input[value="2026"]', timeout=3000)
                if ano_inicial_sel:
                    await ano_inicial_sel.fill("2025")
                    log("Ano inicial: 2025")
            except:
                log("Não conseguiu definir ano inicial automaticamente", "WARN")

            # Mês final
            try:
                mes_final_sel = await page.wait_for_selector('[id*="inal"], select:has-text("Janeiro")', timeout=3000)
                if mes_final_sel:
                    await mes_final_sel.select_option(label=end_month_name)
                    log(f"Mês final: {end_month_name}")
            except:
                log("Não conseguiu definir mês final automaticamente", "WARN")

            # Ano final
            try:
                ano_final_sel = await page.query_selector_all('input[value="2026"]')
                if len(ano_final_sel) >= 2:
                    await ano_final_sel[1].fill(str(last_month_year))
                    log(f"Ano final: {last_month_year}")
            except:
                log("Não conseguiu definir ano final automaticamente", "WARN")

            await page.wait_for_timeout(1000)

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "05_periodo_configurado.png"))

            # --- CLICAR EM "EXECUTAR" ---
            log("Clicando em 'Executar'...")
            executar_selectors = [
                'button:has-text("Executar")',
                'a:has-text("Executar")',
                'input[value*="Executar"]',
                'button[type="submit"]',
            ]
            found_exec = False
            for sel in executar_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=5000)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(3000)
                        log(f"Clicou em 'Executar' (seletor: {sel})")
                        found_exec = True
                        break
                except:
                    continue

            if not found_exec:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_executar.png"))
                raise Exception("Não encontrou botão 'Executar'. Verifique o screenshot.")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_executar_clicado.png"))

            # --- SELECIONAR "CONSOLIDADO COM O APLICATIVO D.Z.M LTDA" ---
            log("Selecionando opção consolidada (D.Z.M LTDA)...")
            consolidado_selectors = [
                'button:has-text("Consolidado com o aplicativo D.Z.M LTDA")',
                'a:has-text("Consolidado")',
                'span:has-text("Consolidado com")',
                'text="Consolidado com o aplicativo D.Z.M LTDA"',
            ]
            found_consol = False
            for sel in consolidado_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=10000)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(2000)
                        log(f"Selecionou consolidado (seletor: {sel})")
                        found_consol = True
                        break
                except:
                    continue

            if not found_consol:
                # Pode ser que já tenha carregado direto sem popup
                log("Popup de consolidação não apareceu (pode já estar em modo consolidado)", "WARN")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "07_consolidado_selecionado.png"))

            # --- AGUARDAR DADOS CARREGAREM ---
            log("Aguardando dados do relatório carregarem...")
            await page.wait_for_load_state("domcontentloaded", timeout=60000)
            await page.wait_for_timeout(5000)

            # Esperar grid/tabela aparecer
            grid_selectors = ['.fm-grid-view', '.fm-pivot', 'table', '.grid-container', '.report-container', '[class*="data"]']
            for sel in grid_selectors:
                try:
                    await page.wait_for_selector(sel, timeout=10000)
                    log(f"Grid de dados carregado (seletor: {sel})")
                    break
                except:
                    continue

            log("Relatório carregado com dados", "OK")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "08_relatorio_carregado.png"))

            # --- EXPORTAR → FONTE DE DADOS → CSV ---
            log("Iniciando exportação: Exportar → Fonte de Dados → CSV...")

            # Clique em "Exportar" (canto superior direito)
            export_selectors = [
                'button:has-text("Exportar")',
                'a:has-text("Exportar")',
                'span:has-text("Exportar")',
                '[title="Exportar"]',
                'text="Exportar"',
            ]
            found_export = False
            for sel in export_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=5000)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(1500)
                        log(f"Clicou em 'Exportar' (seletor: {sel})")
                        found_export = True
                        break
                except:
                    continue

            if not found_export:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_exportar.png"))
                raise Exception("Não encontrou botão 'Exportar'. Verifique o screenshot.")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "09_menu_exportar.png"))

            # Clique em "Fonte de Dados"
            data_source_selectors = [
                'a:has-text("Fonte de Dados")',
                'span:has-text("Fonte de Dados")',
                'li:has-text("Fonte de Dados")',
                'div:has-text("Fonte de Dados")',
                'button:has-text("Fonte de Dados")',
                'text="Fonte de Dados"',
            ]
            found_ds = False
            for sel in data_source_selectors:
                try:
                    el = await page.wait_for_selector(sel, timeout=5000)
                    if el:
                        await el.click()
                        await page.wait_for_timeout(1500)
                        log(f"Clicou em 'Fonte de Dados' (seletor: {sel})")
                        found_ds = True
                        break
                except:
                    continue

            if not found_ds:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_fonte_dados.png"))
                raise Exception("Não encontrou 'Fonte de Dados'. Verifique o screenshot.")

            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10_fonte_dados.png"))

            # Clique em "CSV" e captura o download
            csv_selectors = [
                'a:has-text("CSV")',
                'span:has-text("CSV")',
                'li:has-text("CSV")',
                'div:has-text("CSV")',
                'button:has-text("CSV")',
                'text="CSV"',
            ]

            async with page.expect_download(timeout=120000) as download_info:
                found_csv = False
                for sel in csv_selectors:
                    try:
                        el = await page.wait_for_selector(sel, timeout=5000)
                        if el:
                            await el.click()
                            log(f"Clicou em 'CSV' (seletor: {sel})")
                            found_csv = True
                            break
                    except:
                        continue

                if not found_csv:
                    await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_csv.png"))
                    raise Exception("Não encontrou opção 'CSV'. Verifique o screenshot.")

            download = await download_info.value
            await download.save_as(DOWNLOAD_FILE)
            log(f"Arquivo CSV salvo em: {DOWNLOAD_FILE}", "OK")


            if debug:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "06_download_ok.png"))

        except Exception as e:
            try:
                await page.screenshot(path=os.path.join(SCREENSHOT_DIR, "erro_geral.png"))
            except:
                pass
            log(f"Erro no download: {e}", "ERR")
            log(f"Screenshots de debug salvas em: {SCREENSHOT_DIR}", "WARN")
            raise
        finally:
            await browser.close()
            log("Browser fechado")


# ============================================================
# ETAPA 2 & 3: Processamento + Consolidação
# ============================================================

def process_and_consolidate():
    log("ETAPA 2: Processamento do CSV baixado", "STEP")

    if not os.path.exists(DOWNLOAD_FILE):
        log(f"Arquivo não encontrado: {DOWNLOAD_FILE}", "ERR")
        raise FileNotFoundError(f"Execute primeiro --step download para baixar o arquivo")

    # Carregar e processar o novo arquivo
    data = smart_load_data(DOWNLOAD_FILE)
    if data is None:
        log("Falha ao carregar o arquivo CSV do Omie", "ERR")
        raise ValueError("smart_load_data retornou None — formato do CSV pode ter mudado")

    df_new_long = process_omie_to_long(data)
    df_new_long = fix_swapped_columns(df_new_long)

    log(f"Dados novos processados: {len(df_new_long)} lançamentos", "OK")

    # Estatísticas
    if not df_new_long.empty:
        empresas = df_new_long['Empresa'].unique()
        competencias = sorted(df_new_long['Mes'].unique())
        log(f"Empresas: {', '.join(empresas)}")
        log(f"Competências: {competencias[0]} até {competencias[-1]} ({len(competencias)} meses)")

    # ETAPA 3: Consolidar com histórico
    log("ETAPA 3: Consolidação com dados históricos", "STEP")

    df_master_long = load_master_long(MASTER_FILE)
    consolidate_and_save(df_master_long, df_new_long, MASTER_FILE)

    log(f"Dados consolidados salvos em: {MASTER_FILE}", "OK")

    return df_new_long


# ============================================================
# ETAPA 4: Upload para Supabase
# ============================================================

def upload_to_supabase(df=None):
    log("ETAPA 4: Upload para Supabase", "STEP")

    if df is None:
        # Se chamado isoladamente, precisa processar o arquivo local
        if not os.path.exists(MASTER_FILE):
            log(f"Arquivo mestre não encontrado: {MASTER_FILE}", "ERR")
            raise FileNotFoundError("Execute --step process primeiro")

        log("Carregando dados do arquivo mestre para upload...")
        df = load_master_long(MASTER_FILE)

    if df.empty:
        log("Nenhum dado para enviar ao Supabase", "WARN")
        return

    # Conectar ao Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    log("Conectado ao Supabase", "OK")

    # Preparar dados para upsert
    records = []
    for _, row in df.iterrows():
        empresa = str(row['Empresa']).strip()
        projeto = str(row.get('Projeto', '')).strip()
        categoria = str(row.get('Categoria', '')).strip()
        mes = str(row['Mes']).strip()
        valor = int(row['Valor']) if pd.notna(row['Valor']) else 0

        if not empresa or empresa == 'nan' or valor == 0:
            continue

        records.append({
            "empresa": empresa,
            "projeto": projeto if projeto != 'nan' else '',
            "categoria": categoria if categoria != 'nan' else '',
            "competencia": mes,
            "valor": valor,
            "sync_source": "playwright",
            "updated_at": datetime.utcnow().isoformat()
        })

    total = len(records)
    log(f"Total de registros para upsert: {total}")

    if total == 0:
        log("Nenhum registro válido para enviar", "WARN")
        return

    # Upsert em batches
    sent = 0
    errors = 0
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table("omie_dre").upsert(
                batch,
                on_conflict="empresa,projeto,categoria,competencia"
            ).execute()
            sent += len(batch)
            pct = (sent / total) * 100
            log(f"Enviados: {sent}/{total} ({pct:.0f}%)")
        except Exception as e:
            errors += len(batch)
            log(f"Erro ao enviar batch {i}-{i+len(batch)}: {e}", "ERR")

    log(f"Upload concluído: {sent} enviados, {errors} erros", "OK" if errors == 0 else "WARN")


# ============================================================
# MAIN
# ============================================================

async def main():
    parser = argparse.ArgumentParser(description="Sync Omie DRE → Supabase")
    parser.add_argument("--debug", action="store_true", help="Modo debug (navegador visível)")
    parser.add_argument("--step", choices=["download", "process", "upload"], help="Executar apenas uma etapa")
    args = parser.parse_args()

    print("=" * 55)
    print("  🔄 SYNC OMIE DRE → SUPABASE")
    print(f"  📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 55)
    print()

    validate_env()

    start = time.time()

    try:
        if args.step == "download":
            await download_from_omie(debug=args.debug)
        elif args.step == "process":
            process_and_consolidate()
        elif args.step == "upload":
            upload_to_supabase()
        else:
            # Pipeline completo
            await download_from_omie(debug=args.debug)
            df = process_and_consolidate()
            upload_to_supabase(df)

        elapsed = time.time() - start
        print()
        print("=" * 55)
        log(f"SINCRONIZAÇÃO CONCLUÍDA em {elapsed:.1f}s", "OK")
        print("=" * 55)

    except Exception as e:
        elapsed = time.time() - start
        print()
        print("=" * 55)
        log(f"FALHA após {elapsed:.1f}s: {e}", "ERR")
        print("=" * 55)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
