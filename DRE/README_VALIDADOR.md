# 🤖 Validador de Lançamentos Omie - Fase 1

Agente automatizado para validar lançamentos de contas a pagar na Omie antes da aprovação.

## 🎯 O Que o Agente Faz

✅ **Valida automaticamente:**

- Data de pagamento = hoje
- Campo projeto preenchido
- Regra de departamento por projeto (SP/Bertioga/Santos/STS)
- Integração bancária preenchida
- Anexos existem

✅ **Ações:**

- Gera relatório CSV de problemas encontrados
- Move lançamentos válidos para "Simular Pagamentos"

---

## 🚀 Como Usar

### 📋 Pré-requisitos

- Python 3.8+
- Playwright instalado: `pip install playwright`

### Passo 1️⃣: Abrir Chrome em Modo Debug

Duplo-clique em: **`abrir_chrome_debug.bat`**

Isso abre o Chrome com uma porta especial que permite o script conectar-se a ele.

> **💡 Dica:** Você só precisa fazer isso UMA VEZ. Pode deixar o Chrome aberto o dia todo!

### Passo 2️⃣: Navegar até a Omie

No Chrome que abriu:

1. Faça login na Omie
2. Acesse o app desejado:
   - **Mar Brasil**: <https://app.omie.com.br/gestao/mar-8w7sxfya/#FIN>
   - **DZM**: <https://app.omie.com.br/gestao/dzm-8w7t3s0f/#FIN>
3. **Filtre** a coluna "Pagamentos Pendentes" com os lançamentos que deseja validar

### Passo 3️⃣: Executar o Validador

No terminal/PowerShell:

```powershell
python validar_lancamentos_omie.py
```

### Passo 4️⃣: Aguardar Resultados

O script irá:

1. Conectar ao Chrome aberto
2. Ler todos os lançamentos de "Pagamentos Pendentes"
3. Validar cada um
4. Mostrar resultados no console
5. Gerar CSV de problemas (se houver)

---

## 📊 Exemplo de Saída

```
======================================================================
  🤖 VALIDADOR DE LANÇAMENTOS OMIE - FASE 1
  📅 11/02/2026 17:30:15
======================================================================

[17:30:15] ✅ App detectado: Mar Brasil
[17:30:15] 🔍 Procurando coluna 'Pagamentos Pendentes'...
[17:30:16] ✅ Coluna encontrada!
[17:30:16] ✅ Lançamentos encontrados: 8

──────────────────────────────────────────────────────────────────────
[17:30:17] ℹ️ Processando [1/8]...
[17:30:18] ℹ️ Favorecido: Fornecedor ABC Ltda
[17:30:18] ℹ️ Valor: R$ 1.500,00
[17:30:19] ❌ Problemas encontrados (2):
[17:30:19] ❌   • Data de pagamento é 12/02/2026 (esperado: 11/02/2026)
[17:30:19] ❌   • Campo 'Projeto' está vazio

──────────────────────────────────────────────────────────────────────
[17:30:20] ℹ️ Processando [2/8]...
[17:30:21] ℹ️ Favorecido: Fornecedor XYZ S/A
[17:30:21] ℹ️ Valor: R$ 3.200,00
[17:30:22] ✅ Todas as validações OK!
[17:30:22] ➡️  Movendo para 'Simular Pagamentos'...
[17:30:23] ✅ Movido com sucesso!

...

======================================================================
  📊 RESUMO
======================================================================
[17:30:45] ℹ️ Total processados: 8
[17:30:45] ✅ Válidos: 5
[17:30:45] ❌ Com problemas: 3

[17:30:45] ✅ Relatório salvo: problemas_lancamentos_20260211_173045.csv
======================================================================
```

---

## 📄 Relatório CSV

O script gera um arquivo `problemas_lancamentos_YYYYMMDD_HHMMSS.csv` com:

| Favorecido          | Valor        | Problemas                                          |
|---------------------|--------------|---------------------------------------------------|
| Fornecedor ABC Ltda | R$ 1.500,00  | Data != hoje; Projeto vazio                       |
| Fornecedor DEF SA   | R$ 800,00    | Projeto 'São Paulo' requer departamento           |

---

## ⚙️ Validações Implementadas

### 1. Data de Pagamento

✅ Deve ser igual a **HOJE**  
❌ Falha se: data futura, data passada, ou vazia

### 2. Projeto Preenchido

✅ Campo projeto deve ter um valor  
❌ Falha se: vazio, "Selecione", "-"

### 3. Departamento por Projeto
✅ **Regra:**

- Projetos com "São Paulo", "Bertioga", "Santos" ou "STS" → **REQUER** departamento
- Outros projetos → **NÃO DEVE** ter departamento

❌ Falha se: regra violada

### 4. Integração Bancária

✅ Deve ter dados preenchidos  
❌ Falha se: vazio ou com menos de 10 caracteres

### 5. Anexos

✅ Deve ter pelo menos 1 anexo  
❌ Falha se: nenhum anexo encontrado

---

## 🐛 Troubleshooting

### Erro: "Erro ao conectar ao Chrome"

**Solução:** Verifique se executou `abrir_chrome_debug.bat` antes

### Erro: "Nenhuma aba aberta no Chrome"

**Solução:** Abra pelo menos uma aba no Chrome

### Erro: "Não foi possível detectar o app"

**Solução:** Certifique-se de estar em uma URL que contém:

- `mar-8w7sxfya` (Mar Brasil) OU
- `dzm-8w7t3s0f` (DZM)

### Erro: "Não encontrou coluna 'Pagamentos Pendentes'"

**Solução:**

1. Verifique se está na página correta (#FIN)
2. Certifique-se de que a coluna "Pagamentos Pendentes" está visível
3. Se os seletores mudaram, edite `omie_selectors.py`

### Lançamentos não são movidos automaticamente

**Solução:**

1. Edite `validar_lancamentos_omie.py`
2. Altere `MOVER_VALIDADOS = False` se quiser apenas validar sem mover
3. Verifique os seletores em `omie_selectors.py` → `NAVEGACAO["simular_pagamentos"]`

---

## 🔧 Configurações

Edite o arquivo `validar_lancamentos_omie.py` na seção `CONFIGURAÇÃO`:

```python
CDP_URL = "http://localhost:9222"  # Porta do Chrome debug
GERAR_CSV = True  # Gerar relatório CSV?
MOVER_VALIDADOS = True  # Mover lançamentos válidos?
```

---

## 📝 Arquivos do Projeto

- **`abrir_chrome_debug.bat`** - Abre Chrome em modo debug
- **`validar_lancamentos_omie.py`** - Script principal
- **`omie_selectors.py`** - Seletores CSS/XPath (editar se a Omie mudar)
- **`validadores.py`** - Lógica de validações
- **`problemas_lancamentos_*.csv`** - Relatórios gerados

---

## 🚀 Próximas Fases (Futuro)

### Fase 2 (Planejado)

- ✅ Validar link em observações (verificar assinatura)
- ✅ Validação detalhada de integração bancária

### Fase 3 (Planejado)

- ✅ Comparar NF vs favorecido (OCR)
- ✅ Comparar boleto vs NF (OCR)
- ✅ Validar código de barras (OCR)

---

**Dúvidas?** Veja o código-fonte para detalhes técnicos ou ajuste os seletores conforme necessário.
