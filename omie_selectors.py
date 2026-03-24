"""
Seletores CSS/XPath para elementos da Omie.
Centraliza todos os seletores em um único lugar para facilitar manutenção.
"""

# URLs dos apps
APPS = {
    "mar_brasil": {
        "url": "https://app.omie.com.br/gestao/mar-8w7sxfya/#FIN",
        "nome": "Mar Brasil"
    },
    "dzm": {
        "url": "https://app.omie.com.br/gestao/dzm-8w7t3s0f/#FIN",
        "nome": "DZM"
    }
}

# Seletores para navegação
NAVEGACAO = {
    # Coluna do kanban
    "coluna_pagamentos_pendentes": [
        'div:has-text("Pagamentos Pendentes")',
        '.kanban-column:has-text("Pagamentos Pendentes")',
        '[data-status="pendente"]',
    ],
    
    # Cards de lançamentos
    "lancamento_card": [
        '.payment-card',
        '.kanban-card',
        'div[class*="card"]',
    ],
    
    # Botão/coluna para mover para Simular Pagamentos
    "simular_pagamentos": [
        'div:has-text("Simular Pagamentos")',
        '.kanban-column:has-text("Simular")',
        '[data-status="simular"]',
    ],
}

# Seletores para campos de dados do lançamento
CAMPOS_LANCAMENTO = {
    # Campos visíveis no card
    "favorecido": [
        '.card-title',
        '[data-field="favorecido"]',
        'span:has-text("Fornecedor")',
    ],
    
    "valor": [
        '.card-value',
        '[data-field="valor"]',
        'span:has-text("R$")',
    ],
    
    "data_pagamento": [
        'input[name="data_pagamento"]',
        'input[placeholder*="Data"]',
        '[data-field="data_pagamento"]',
    ],
    
    "projeto": [
        'select[name="projeto"]',
        'input[name="projeto"]',
        '[data-field="projeto"]',
    ],
    
    "departamento": [
        'select[name="departamento"]',
        'input[name="departamento"]',
        '[data-field="departamento"]',
    ],
    
    "observacoes": [
        'textarea[name="observacoes"]',
        '[data-field="observacoes"]',
        'textarea[placeholder*="Observ"]',
    ],
    
    # Integração bancária
    "integracao_bancaria": [
        '[data-field="integracao_bancaria"]',
        'div:has-text("Integração Bancária")',
    ],
    
    # Anexos
    "area_anexos": [
        '.attachment-area',
        'div:has-text("Anexos")',
        '[data-field="anexos"]',
    ],
    
    "lista_anexos": [
        '.attachment-list a',
        'a[href*="anexo"]',
    ],
}

# Projetos que requerem departamento
PROJETOS_COM_DEPARTAMENTO = [
    "São Paulo",
    "Bertioga",
    "Santos",
    "STS",
]
