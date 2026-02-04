# 🔧 Guia de Troubleshooting - Análise Setorial

## Como Debugar Problemas

### 1. Abrir o Console do Navegador

Para ver os logs de debug e identificar problemas:

**Chrome/Edge:**
- Pressione `F12` ou `Ctrl + Shift + I` (Windows)
- Ou clique com botão direito → "Inspecionar" → Aba "Console"

**Firefox:**
- Pressione `F12` ou `Ctrl + Shift + K`
- Ou clique com botão direito → "Inspecionar Elemento" → Aba "Console"

### 2. Verificar os Logs

Após carregar o CSV, você deve ver no console:

```
Processing parsed data... { data: [...], errors: [] }
First row: { Setor: "Operacional", Categoria: "Salários", ... }
Column headers: ["Setor", "Categoria", "Despesas", "01/25", "02/25", ...]
First processed row: { Setor: "Operacional", Categoria: "Salários", Despesas: 150000, "01/25": 12500, ... }
Total rows processed: 31
Sample row: { ... }
Extracted metadata:
Setores: ["Administrativo", "Comercial", "Financeiro", "Operacional", "RH", "TI"]
Categorias: ["Aluguel", "Auditoria", ...]
Períodos: ["01/25", "02/25", "03/25", ...]
Sorted periods: ["01/25", "02/25", "03/25", ...]
```

### 3. Problemas Comuns e Soluções

#### ❌ Problema: "Os meses não aparecem no filtro"

**Diagnóstico:**
- Verifique no console se "Períodos" está vazio: `Períodos: []`

**Soluções:**
1. Verifique se as colunas do CSV estão no formato exato `mm/aa` (ex: 01/25, 02/25)
2. Certifique-se de que não há espaços antes ou depois dos nomes das colunas
3. Abra o CSV em um editor de texto e verifique se os cabeçalhos estão corretos

**Exemplo correto:**
```csv
Setor,Categoria,Despesas,01/25,02/25,03/25
```

**Exemplo incorreto:**
```csv
Setor,Categoria,Despesas, 01/25 ,02/25,Mar/25
```

#### ❌ Problema: "Valores aparecem como R$ 0"

**Diagnóstico:**
- Verifique no console o "First processed row"
- Se os valores dos meses aparecem como 0, o problema é no parsing

**Soluções:**
1. Certifique-se de que os valores numéricos não têm caracteres especiais além de vírgulas e

 pontos
2. Evite usar aspas nos valores numéricos no CSV
3. Use apenas números (podem ter ponto ou vírgula decimal)

**Formato aceito:**
- `12500` ✅
- `12.500` ✅
- `12500.50` ✅
- `12500,50` ✅
- `12.500,50` ✅

**Formato NÃO aceito:**
- `"12500"` (com aspas) ❌
- `R$ 12500` (com símbolo - será removido automaticamente)
- `12500abc` ❌

#### ❌ Problema: "Encoding/Caracteres estranhos"

**Diagnóstico:**
- Se você vê caracteres como `Ã§`, `Ã£o`, `Ã©` no lugar de ç, ão, é

**Soluções:**
1. Salve o CSV com encoding UTF-8:
   - Excel: "Salvar Como" → "CSV UTF-8 (delimitado por vírgulas)"
   - Google Sheets: "Arquivo" → "Download" → "CSV"
   - Notepad++: "Encoding" → "Converter para UTF-8"

2. Se continuar com problema, o sistema tentará automaticamente ISO-8859-1

### 4. Testar com Arquivo de Exemplo

1. Use o arquivo `exemplo-analise-setorial.csv` fornecido
2. Se funcionar com o exemplo mas não com seu arquivo:
   - Compare o formato dos dois arquivos
   - Verifique diferenças nos cabeçalhos
   - Verifique o encoding

### 5. Verificar Estrutura do CSV

Seu CSV **DEVE** ter exatamente esta estrutura:

```csv
Setor,Categoria,Despesas,01/25,02/25,03/25,04/25
Operacional,Salários,150000,12500,12500,12500,12500
Operacional,Manutenção,80000,6000,7000,8000,9000
```

**Regras importantes:**
1. Primeira linha = cabeçalhos
2. Colunas obrigatórias: `Setor`, `Categoria`, `Despesas`
3. Colunas de meses: formato `mm/aa` (dois dígitos para mês, dois para ano)
4. Separador: vírgula
5. Encoding: UTF-8 (preferencial)

### 6. Copiar CSV de Exemplo Funcionando

Se tudo mais falhar, copie e cole este CSV de exemplo em um novo arquivo:

```csv
Setor,Categoria,Despesas,01/25,02/25,03/25
Operacional,Salários,150000,12500,12500,12500
Operacional,Manutenção,80000,6000,7000,8000
Administrativo,Aluguel,120000,10000,10000,10000
```

Salve como `teste.csv` e tente importar.

### 7. Mensagens de Erro Comuns

| Erro | Significado | Solução |
|------|-------------|---------|
| "Arquivo vazio ou sem dados válidos" | CSV não foi lido ou está vazio | Verifique se o arquivo tem conteúdo |
| "O CSV deve conter as colunas: Setor, Categoria, Despesas..." | Falta alguma coluna obrigatória | Adicione as colunas faltantes exatamente com esses nomes |
| "Erro ao ler arquivo" | Problema no parsing do arquivo | Verifique o encoding e formato |

### 8. Checklist Final

Antes de reportar um problema, verifique:

- [ ] O CSV tem as 3 colunas obrigatórias (Setor, Categoria, Despesas)
- [ ] As colunas de mês estão no formato mm/aa (ex: 01/25)
- [ ] Não há espaços extras nos nomes das colunas
- [ ] Os valores são números (sem aspas, sem texto)
- [ ] O arquivo está salvo como UTF-8
- [ ] Você abriu o console e verificou os logs
- [ ] Testou com o arquivo exemplo e funcionou

### 9. Informações para Suporte

Se precisar de ajuda, forneça:

1. Screenshot do console (F12) após carregar o arquivo
2. Primeira linha do seu CSV (cabeçalhos)
3. Segunda linha do seu CSV (um exemplo de dados)
4. Mensagem de erro exata (se houver)

---

**Atualizado:** 08/01/2026  
**Versão do Sistema:** 1.0.1
