# 📊 Importação DRE Omie → Supabase

Script para importar dados da DRE baixados manualmente da Omie.

## 📋 Pré-requisitos

- Python 3.8+
- Credenciais Supabase no arquivo `.env`
- CSV da Omie baixado manualmente

## 🚀 Como Usar

### 1️⃣ Baixar o CSV da Omie

1. Acesse a Omie: <https://app.omie.com.br>
2. Navegue até: **Finanças** → **Meus Relatórios** → **Base para IA tratar**
3. Configure o período desejado (ex: Junho/2025 até mês anterior)
4. Clique em **Executar**
5. Selecione **"Consolidado com o aplicativo D.Z.M LTDA"**
6. Clique em **Exportar** → **Fonte de Dados** → **CSV**

### 2️⃣ Preparar o CSV

1. Renomeie o arquivo baixado para: `omie_dre.csv`
2. Coloque o arquivo na pasta do projeto: `DRE-V20 - automação/`

### 3️⃣ Executar a Importação

```powershell
python import_omie_dre.py
```

## 📁 Estrutura do CSV Esperada

O script espera um CSV com as seguintes colunas (nomes podem variar):

| Coluna       | Descrição                     | Exemplo          |
|--------------|-------------------------------|------------------|
| `empresa`    | Nome da empresa               | "MAR BRASIL"     |
| `projeto`    | Projeto (opcional)            | "Projeto A"      |
| `categoria`  | Categoria da DRE              | "Receitas"       |
| `competencia`| Mês/Ano                       | "jan/25"         |
| `valor`      | Valor em reais                | "1.234,56"       |

> **Nota:** Se as colunas do seu CSV tiverem nomes diferentes, edite a seção de mapeamento no arquivo `import_omie_dre.py` (linha ~100).

## ✅ O Que o Script Faz

1. **Lê o CSV** - Carrega todos os registros do arquivo
2. **Normaliza os dados**:
   - Converte competência para formato `mmm/yy` (ex: `jan/25`)
   - Converte valores para centavos (integer)
   - Remove espaços e caracteres especiais
3. **Valida** - Verifica campos obrigatórios
4. **UPSERT no Supabase**:
   - **Insere** registros novos
   - **Atualiza** registros existentes (mesma empresa + projeto + categoria + competência)

## 🔄 Atualizações Incrementais

Você pode rodar o script múltiplas vezes:

- Registros duplicados (mesma chave única) serão **atualizados**
- Novos registros serão **inseridos**
- Nenhum dado será perdido

## 🐛 Troubleshooting

### Erro: "Arquivo omie_dre.csv não encontrado"

- Certifique-se de que o arquivo está na pasta do projeto
- Verifique se o nome está correto: `omie_dre.csv`

### Erro: "Formato de competência não reconhecido"

- Verifique se a coluna de competência está no formato: `MM/AAAA` ou `jan/25`
- Edite a função `normalizar_competencia()` se necessário

### Erro: "Colunas não encontradas"

- Abra o CSV e verifique os nomes das colunas
- Edite o mapeamento de colunas no script (linha ~100)

## 📊 Visualizar Dados Importados

Após a importação, os dados estarão disponíveis na tabela `omie_dre` do Supabase.

Você pode consultar via SQL:

```sql
SELECT 
  empresa,
  projeto,
  categoria,
  competencia,
  valor / 100.0 as valor_reais,
  created_at
FROM omie_dre
ORDER BY competencia DESC, empresa, categoria;
```

## 📝 Logs

O script exibe logs detalhados durante a execução:

- ℹ️ Informações gerais
- ✅ Sucesso
- ⚠️ Avisos (linhas ignoradas)
- ❌ Erros

---

**Dúvidas?** Veja o código em `import_omie_dre.py` para detalhes técnicos.
