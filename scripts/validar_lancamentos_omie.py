#!/usr/bin/env python3
"""
🤖 VALIDADOR DE LANÇAMENTOS OMIE - FASE 1

Script para validar lançamentos de contas a pagar na Omie.
Conecta-se a uma sessão do Chrome já aberta (remote debugging).

COMO USAR:
1. Execute: abrir_chrome_debug.bat (duplo-clique)
2. Faça login na Omie e navegue até a página de pagamentos (#FIN)
3. Filtre a coluna "Pagamentos Pendentes" com os lançamentos desejados
4. Execute: python validar_lancamentos_omie.py

O script irá:
- Ler todos os lançamentos da coluna "Pagamentos Pendentes"
- Validar cada um (data, projeto, departamento, integração, anexos)
- Gerar relatório de problemas
- Mover lançamentos válidos para "Simular Pagamentos"
"""

import asyncio
import csv
import sys
from datetime import datetime
from playwright.async_api import async_playwright, Page

from omie_selectors import NAVEGACAO, CAMPOS_LANCAMENTO, APPS
from validadores import validar_lancamento


# ==================
# CONFIGURAÇÃO
# ==================

CDP_URL = "http://localhost:9222"  # Porta do remote debugging
GERAR_CSV = True  # Gerar relatório CSV de problemas
MOVER_VALIDADOS = True  # Mover lançamentos válidos para "Simular Pagamentos"


# ==================
# FUNÇÕES AUXILIARES
# ==================

def log(msg, level="INFO"):
    """Log com timestamp e ícone."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    icons = {
        "INFO": "ℹ️",
        "OK": "✅",
        "WARN": "⚠️",
        "ERROR": "❌",
        "SEARCH": "🔍",
        "MOVE": "➡️"
    }
    icon = icons.get(level, "ℹ️")
    print(f"[{timestamp}] {icon} {msg}")


def detectar_app(url: str) -> str | None:
    """Detecta qual app está aberto (Mar Brasil ou DZM)."""
    if "mar-8w7sxfya" in url:
        return "mar_brasil"
    elif "dzm-8w7t3s0f" in url:
        return "dzm"
    return None


async def try_selectors(page: Page, selectors: list[str], timeout: int = 5000):
    """Tenta múltiplos seletores até encontrar um que funcione."""
    for sel in selectors:
        try:
            el = await page.wait_for_selector(sel, timeout=timeout)
            if el:
                return el
        except:
            continue
    return None


async def extrair_texto(page: Page, selectors: list[str]) -> str:
    """Extrai texto usando múltiplos seletores."""
    el = await try_selectors(page, selectors, timeout=2000)
    if el:
        return await el.text_content() or ""
    return ""


# ==================
# FUNÇÕES PRINCIPAIS
# ==================

async def extrair_dados_lancamento(page: Page, card_element) -> dict:
    """
    Extrai todos os dados de um lançamento clicando nele.
    
    Returns:
        dict com: favorecido, valor, data_pagamento, projeto, 
                  departamento, integracao_bancaria, anexos_count, observacoes
    """
    # Clicar no card para abrir detalhes
    try:
        await card_element.click()
        await page.wait_for_timeout(1500)  # Aguardar modal/drawer abrir
    except Exception as e:
        log(f"Erro ao clicar no lançamento: {e}", "ERROR")
        return {}
    
    dados = {}
    
    # Extrair campos
    try:
        dados["favorecido"] = await extrair_texto(page, CAMPOS_LANCAMENTO["favorecido"])
        dados["valor"] = await extrair_texto(page, CAMPOS_LANCAMENTO["valor"])
        
        # Campos de input - pegar value
        data_el = await try_selectors(page, CAMPOS_LANCAMENTO["data_pagamento"])
        if data_el:
            dados["data_pagamento"] = await data_el.get_attribute("value") or ""
        else:
            dados["data_pagamento"] = ""
        
        projeto_el = await try_selectors(page, CAMPOS_LANCAMENTO["projeto"])
        if projeto_el:
            # Se for select, pegar texto da opção selecionada
            if await projeto_el.evaluate("el => el.tagName") == "SELECT":
                dados["projeto"] = await projeto_el.evaluate("el => el.options[el.selectedIndex]?.text || ''")
            else:
                dados["projeto"] = await projeto_el.get_attribute("value") or ""
        else:
            dados["projeto"] = ""
        
        departamento_el = await try_selectors(page, CAMPOS_LANCAMENTO["departamento"])
        if departamento_el:
            if await departamento_el.evaluate("el => el.tagName") == "SELECT":
                dados["departamento"] = await departamento_el.evaluate("el => el.options[el.selectedIndex]?.text || ''")
            else:
                dados["departamento"] = await departamento_el.get_attribute("value") or ""
        else:
            dados["departamento"] = ""
        
        dados["integracao_bancaria"] = await extrair_texto(page, CAMPOS_LANCAMENTO["integracao_bancaria"])
        dados["observacoes"] = await extrair_texto(page, CAMPOS_LANCAMENTO["observacoes"])
        
        # Contar anexos
        anexos = await page.query_selector_all(", ".join(CAMPOS_LANCAMENTO["lista_anexos"]))
        dados["anexos_count"] = len(anexos)
        
    except Exception as e:
        log(f"Erro ao extrair dados: {e}", "ERROR")
    
    return dados


async def mover_para_simular(page: Page) -> bool:
    """
    Move o lançamento atual para a coluna "Simular Pagamentos".
    
    Returns:
        True se moveu com sucesso, False caso contrário
    """
    try:
        # Procurar botão ou área de "Simular Pagamentos"
        simular_el = await try_selectors(page, NAVEGACAO["simular_pagamentos"], timeout=3000)
        
        if not simular_el:
            log("Não encontrou coluna 'Simular Pagamentos'", "WARN")
            return False
        
        # Clicar para mover (ou arrastar, dependendo da interface)
        await simular_el.click()
        await page.wait_for_timeout(1000)
        
        return True
        
    except Exception as e:
        log(f"Erro ao mover para Simular: {e}", "ERROR")
        return False


async def processar_lancamentos(page: Page):
    """
    Função principal que processa todos os lançamentos.
    """
    print("=" * 70)
    print("  🤖 VALIDADOR DE LANÇAMENTOS OMIE - FASE 1")
    print(f"  📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 70)
    print()
    
    # Detectar app
    url_atual = page.url
    app_key = detectar_app(url_atual)
    
    if not app_key:
        log("Não foi possível detectar o app (Mar Brasil ou DZM)", "ERROR")
        log(f"URL atual: {url_atual}", "INFO")
        log("Certifique-se de estar em uma página #FIN", "INFO")
        return
    
    app_nome = APPS[app_key]["nome"]
    log(f"App detectado: {app_nome}", "OK")
    log(f"URL: {url_atual}", "INFO")
    print()
    
    # Localizar coluna "Pagamentos Pendentes"
    log("Procurando coluna 'Pagamentos Pendentes'...", "SEARCH")
    coluna_el = await try_selectors(page, NAVEGACAO["coluna_pagamentos_pendentes"], timeout=10000)
    
    if not coluna_el:
        log("Não encontrou coluna 'Pagamentos Pendentes'!", "ERROR")
        log("Verifique se a página está correta e se a coluna existe", "INFO")
        return
    
    log("Coluna encontrada!", "OK")
    
    # Buscar lançamentos (cards) dentro da coluna
    log("Buscando lançamentos...", "SEARCH")
    
    # Tentar localizar cards dentro da coluna
    cards = []
    for sel in NAVEGACAO["lancamento_card"]:
        try:
            # Procurar cards dentro da coluna
            cards = await coluna_el.query_selector_all(sel)
            if cards:
                break
        except:
            continue
    
    if not cards:
        log("Nenhum lançamento encontrado na coluna!", "WARN")
        log("A coluna pode estar vazia ou os seletores precisam de ajuste", "INFO")
        return
    
    total = len(cards)
    log(f"Lançamentos encontrados: {total}", "OK")
    print()
    
    # Processar cada lançamento
    validados = []
    com_problemas = []
    
    for i, card in enumerate(cards, start=1):
        print(f"{'─' * 70}")
        log(f"Processando [{i}/{total}]...", "INFO")
        
        # Extrair dados
        dados = await extrair_dados_lancamento(page, card)
        
        if not dados:
            log("Não foi possível extrair dados deste lançamento", "ERROR")
            continue
        
        favorecido = dados.get("favorecido", "N/A")
        valor = dados.get("valor", "N/A")
        
        log(f"Favorecido: {favorecido}", "INFO")
        log(f"Valor: {valor}", "INFO")
        
        # Validar
        is_valid, erros = validar_lancamento(dados)
        
        if is_valid:
            log("Todas as validações OK!", "OK")
            validados.append({
                "favorecido": favorecido,
                "valor": valor,
                "dados": dados
            })
            
            # Mover para Simular Pagamentos
            if MOVER_VALIDADOS:
                log("Movendo para 'Simular Pagamentos'...", "MOVE")
                if await mover_para_simular(page):
                    log("Movido com sucesso!", "OK")
                else:
                    log("Não foi possível mover automaticamente", "WARN")
        else:
            log(f"Problemas encontrados ({len(erros)}):", "ERROR")
            for erro in erros:
                log(f"  • {erro}", "ERROR")
            
            com_problemas.append({
                "favorecido": favorecido,
                "valor": valor,
                "problemas": erros
            })
        
        print()
        
        # Fechar modal/drawer (tecla ESC ou clicar fora)
        try:
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(500)
        except:
            pass
    
    # Resumo final
    print("=" * 70)
    print("  📊 RESUMO")
    print("=" * 70)
    log(f"Total processados: {total}", "INFO")
    log(f"Válidos: {len(validados)}", "OK")
    log(f"Com problemas: {len(com_problemas)}", "ERROR" if com_problemas else "INFO")
    print()
    
    # Gerar CSV de problemas
    if com_problemas and GERAR_CSV:
        csv_file = f"problemas_lancamentos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        with open(csv_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Favorecido", "Valor", "Problemas"])
            
            for item in com_problemas:
                writer.writerow([
                    item["favorecido"],
                    item["valor"],
                    "; ".join(item["problemas"])
                ])
        
        log(f"Relatório salvo: {csv_file}", "OK")
    
    print("=" * 70)


# ==================
# MAIN
# ==================

async def main():
    """Função principal."""
    
    try:
        async with async_playwright() as p:
            # Conectar ao Chrome em modo debug
            log("Conectando ao Chrome (porta 9222)...", "INFO")
            
            try:
                browser = await p.chromium.connect_over_cdp(CDP_URL)
            except Exception as e:
                log(f"Erro ao conectar ao Chrome: {e}", "ERROR")
                log("Certifique-se de que o Chrome foi aberto com abrir_chrome_debug.bat", "ERROR")
                sys.exit(1)
            
            log("Conectado!", "OK")
            
            # Pegar o contexto e página atual
            contexts = browser.contexts
            if not contexts:
                log("Nenhuma aba aberta no Chrome!", "ERROR")
                sys.exit(1)
            
            context = contexts[0]
            pages = context.pages
            
            if not pages:
                log("Nenhuma página aberta!", "ERROR")
                sys.exit(1)
            
            page = pages[0]  # Usar a primeira aba
            
            log(f"Usando aba: {page.url[:60]}...", "INFO")
            print()
            
            # Processar lançamentos
            await processar_lancamentos(page)
            
            # Não fechar o navegador (ele continua aberto)
            
    except KeyboardInterrupt:
        log("\nInterrompido pelo usuário", "WARN")
    except Exception as e:
        log(f"Erro fatal: {e}", "ERROR")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
