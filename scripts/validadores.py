"""
Funções de validação para lançamentos Omie.
Cada função retorna (is_valid, error_message).
"""

from datetime import datetime
from omie_selectors import PROJETOS_COM_DEPARTAMENTO


def validar_data_pagamento(data_str: str) -> tuple[bool, str]:
    """
    Valida se a data de pagamento é igual a hoje.
    
    Args:
        data_str: Data no formato DD/MM/YYYY ou similar
        
    Returns:
        (True, "") se válido
        (False, "mensagem de erro") se inválido
    """
    try:
        # Tentar parsear diferentes formatos
        for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"]:
            try:
                data_pagamento = datetime.strptime(data_str.strip(), fmt).date()
                break
            except ValueError:
                continue
        else:
            return False, f"Formato de data inválido: {data_str}"
        
        hoje = datetime.now().date()
        
        if data_pagamento != hoje:
            return False, f"Data de pagamento é {data_pagamento.strftime('%d/%m/%Y')} (esperado: {hoje.strftime('%d/%m/%Y')})"
        
        return True, ""
        
    except Exception as e:
        return False, f"Erro ao validar data: {str(e)}"


def validar_projeto_preenchido(projeto: str) -> tuple[bool, str]:
    """
    Valida se o campo projeto está preenchido.
    
    Args:
        projeto: Valor do campo projeto
        
    Returns:
        (True, "") se preenchido
        (False, "mensagem de erro") se vazio
    """
    if not projeto or projeto.strip() == "" or projeto.strip().lower() in ["selecione", "nenhum", "-"]:
        return False, "Campo 'Projeto' está vazio"
    
    return True, ""


def validar_departamento_projeto(projeto: str, departamento: str) -> tuple[bool, str]:
    """
    Valida regra de departamento baseado no projeto.
    
    Regra:
    - Se projeto contém "São Paulo", "Bertioga", "Santos" ou "STS" → REQUER departamento
    - Outros projetos → NÃO deve ter departamento
    
    Args:
        projeto: Nome do projeto
        departamento: Valor do campo departamento
        
    Returns:
        (True, "") se válido
        (False, "mensagem de erro") se inválido
    """
    projeto = projeto.strip()
    departamento = departamento.strip() if departamento else ""
    
    # Verificar se é um projeto que requer departamento
    requer_departamento = any(cidade in projeto for cidade in PROJETOS_COM_DEPARTAMENTO)
    
    tem_departamento = departamento and departamento.lower() not in ["selecione", "nenhum", "-", ""]
    
    if requer_departamento and not tem_departamento:
        return False, f"Projeto '{projeto}' requer departamento, mas está vazio"
    
    if not requer_departamento and tem_departamento:
        return False, f"Projeto '{projeto}' não deve ter departamento, mas tem: '{departamento}'"
    
    return True, ""


def validar_integracao_bancaria(integracao: str) -> tuple[bool, str]:
    """
    Valida se há dados de integração bancária preenchidos.
    
    Args:
        integracao: Texto/dados da integração bancária
        
    Returns:
        (True, "") se preenchido
        (False, "mensagem de erro") se vazio
    """
    if not integracao or integracao.strip() == "":
        return False, "Integração bancária não preenchida"
    
    # Verificar se tem conteúdo mínimo (não é só placeholder)
    if len(integracao.strip()) < 10:
        return False, "Integração bancária com dados insuficientes"
    
    return True, ""


def validar_anexos(anexos_count: int) -> tuple[bool, str]:
    """
    Valida se há anexos no lançamento.
    
    Args:
        anexos_count: Número de anexos encontrados
        
    Returns:
        (True, "") se tem anexos
        (False, "mensagem de erro") se não tem
    """
    if anexos_count == 0:
        return False, "Nenhum anexo encontrado"
    
    return True, ""


def validar_link_observacoes(observacoes: str) -> tuple[bool, str | None]:
    """
    Verifica se há link nas observações que precisa ser validado.
    
    Args:
        observacoes: Texto das observações
        
    Returns:
        (True, None) se não há link
        (True, "URL") se há link (deve ser validado depois)
        (False, "erro") se há problema
    """
    if not observacoes:
        return True, None
    
    # Procurar por URLs
    import re
    urls = re.findall(r'https?://[^\s]+', observacoes)
    
    if not urls:
        return True, None
    
    # Se há URL, retornar para validação posterior
    return True, urls[0]


# Função auxiliar para executar todas as validações
def validar_lancamento(dados: dict) -> tuple[bool, list[str]]:
    """
    Executa todas as validações em um lançamento.
    
    Args:
        dados: Dicionário com dados do lançamento
        {
            "data_pagamento": "11/02/2026",
            "projeto": "São Paulo - Torre A",
            "departamento": "Financeiro",
            "integracao_bancaria": "...",
            "anexos_count": 2,
            "observacoes": "..."
        }
    
    Returns:
        (is_valid, lista_de_erros)
    """
    erros = []
    
    # Validação 1: Data
    valido, erro = validar_data_pagamento(dados.get("data_pagamento", ""))
    if not valido:
        erros.append(erro)
    
    # Validação 2: Projeto preenchido
    valido, erro = validar_projeto_preenchido(dados.get("projeto", ""))
    if not valido:
        erros.append(erro)
    
    # Validação 3: Departamento (só valida se projeto está preenchido)
    if dados.get("projeto", "").strip():
        valido, erro = validar_departamento_projeto(
            dados.get("projeto", ""),
            dados.get("departamento", "")
        )
        if not valido:
            erros.append(erro)
    
    # Validação 4: Integração bancária
    valido, erro = validar_integracao_bancaria(dados.get("integracao_bancaria", ""))
    if not valido:
        erros.append(erro)
    
    # Validação 5: Anexos
    valido, erro = validar_anexos(dados.get("anexos_count", 0))
    if not valido:
        erros.append(erro)
    
    # Validação 6: Link em observações (apenas detecta, não valida ainda - Fase 2)
    valido, url = validar_link_observacoes(dados.get("observacoes", ""))
    if url:
        erros.append(f"⚠️  Link encontrado nas observações (validação manual): {url}")
    
    return len(erros) == 0, erros
