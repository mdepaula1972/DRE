# 📊 Análise Setorial - Mar Brasil

## Descrição

A página de **Análise Setorial** é uma ferramenta de análise de despesas organizada por setores e categorias. Ela permite importar dados via CSV e visualizar informações através de gráficos interativos, cards e tabelas detalhadas.

## 🎯 Funcionalidades

### 1. **Importação de Dados**
- Suporta arquivos CSV com as seguintes colunas obrigatórias:
  - `Setor`: Nome do setor (ex: Operacional, Administrativo, Comercial)
  - `Categoria`: Nome da categoria de despesa
  - `Despesas`: Valor total de despesas (pode ser usado como referência)
  - Colunas de meses no formato `mm/aa` ou `mmm/aa` (ex: 01/25, jun/25)

### 2. **Rateio Automático (Novo!)**
O sistema realiza automaticamente o rateio das despesas do setor **Administrativo** para os demais setores.

**Como funciona:**
1. O sistema busca linhas onde a Categoria contém **"Equipe"**.
2. Os valores nessas linhas representam a **quantidade de pessoas** no setor naquele mês.
3. Todas as despesas do setor **Administrativo** são somadas.
4. O valor total é distribuído proporcionalmente aos outros setores baseando-se no número de pessoas.
5. As despesas rateadas aparecem nos outros setores com o sufixo `(Rateado)`.

**Visualização:**
- O setor **Administrativo** original é removido dos gráficos e KPIs para evitar duplicidade.
- Na tabela, ele aparece separadamente no final (em cinza) apenas para fins de conferência/auditoria.

### 3. **Filtros Inteligentes**
- **Período**: Selecione um ou múltiplos meses para análise
- **Setor**: Filtre por setores específicos
- **Categoria**: Filtre por categorias específicas
- Suporte para seleção múltipla (Ctrl + Clique)
- Botão de limpar filtros

### 4. **Cards de KPI**
Exibe 4 cards principais:
- **Total Despesas**: Soma total das despesas (incluindo valores rateados)
- **Média Mensal**: Média das despesas por mês
- **Setores Ativos**: Quantidade de setores diferentes
- **Categorias**: Quantidade de categorias diferentes

### 5. **Gráficos**

#### 📊 Despesas por Setor (Coluna Empilhada)
- Exibe despesas mensais empilhadas por setor
- **Nota:** Inclui os valores rateados do Administrativo dentro de cada setor
- Permite visualizar o Custo Real de cada setor

#### 🥧 Composição por Setor (Pizza)
- Mostra a proporção de cada setor no total de despesas
- Baseado nos valores pós-rateio

#### 📈 Evolução Temporal (Linha)
- Aparece quando **2 ou mais meses** são selecionados
- Mostra a tendência de cada setor ao longo do tempo

#### 🏆 Top 10 Categorias
- Lista as 10 categorias com maiores despesas
- Gráfico de barras horizontais

#### 📊 Variação Mensal
- Mostra a variação percentual entre períodos consecutivos

### 6. **Tabela Detalhada**
- Mostra todos os dados filtrados organizados por Setor e Categoria
- Linhas rateadas aparecem destacadas em azul claro
- Setor Administrativo original aparece em destaque cinza no final

## 📋 Como Usar

### Passo 1: Preparar o CSV
Para que o rateio funcione, você precisa incluir as linhas de contagem de equipe:

```csv
Setor,Categoria,Despesas,jun/25,jul/25,ago/25
Operacional,Equipe,-,10,10,12
Comercial,Equipe,-,5,5,6
Administrativo,Aluguel,10000,2000,2000,2000
```

**Regras Importantes:**
1. **Setor Administrativo**: Deve estar escrito exatamente `Administrativo`
2. **Categoria Equipe**: Deve conter a palavra `Equipe` (ex: "Equipe", "Equipe Operacional")
3. **Formatos**:
   - Meses: `mm/aa` (01/25) ou `mmm/aa` (jun/25)
   - Valores: Números com vírgula ou ponto decimal
   - Encoding: Preferencialmente UTF-8 ou ANSI

### Passo 2: Importar Dados
1. Clique em **"Carregar Análise Setorial"** na sidebar
2. Selecione seu arquivo CSV
3. O sistema calculará o rateio automaticamente

### Passo 3: Aplicar Filtros
1. Selecione os períodos desejados (Ctrl + Clique para múltiplos)
2. Filtre por Setores específicos (opcional)
3. Filtre por Categorias específicas (opcional)
4. Os gráficos e tabelas serão atualizados automaticamente

### Passo 4: Analisar
- Explore os diferentes gráficos
- Observe tendências no gráfico de linha
- Identifique maiores gastos no Top 10
- Analise variações percentuais
- Exporte a tabela se necessário

## 🎨 Recursos Visuais

### Paleta de Cores
A página utiliza a identidade visual da Mar Brasil:
- **Primária**: Laranja (#F2911B)
- **Secundária**: Cinza Escuro (#262223)
- **Sucesso**: Verde (#2ecc71)
- **Perigo**: Vermelho (#e74c3c)
- **Info**: Azul (#3498db)

### Design Responsivo
- Funciona em desktop, tablet e mobile
- Sidebar colapsável
- Gráficos adaptáveis

## 📤 Exportação

### Exportar Tabela (CSV)
Clique no botão "Exportar" no canto superior direito da tabela para baixar os dados filtrados em formato CSV.

### Exportar PDF
Funcionalidade em desenvolvimento.

## 🔧 Características Técnicas

### Bibliotecas Utilizadas
- **Chart.js**: Criação de gráficos interativos
- **ChartDataLabels**: Plugin para rótulos em gráficos
- **PapaParse**: Parser de CSV robusto
- **Bootstrap 5**: Framework CSS responsivo
- **Bootstrap Icons**: Ícones

### Compatibilidade
- Navegadores modernos (Chrome, Firefox, Edge, Safari)
- Suporte a arquivos UTF-8 e ISO-8859-1

### Performance
- Processamento otimizado para arquivos grandes
- Atualização dinâmica e eficiente de gráficos
- Filtragem em tempo real

## 📝 Exemplo de Uso

Um arquivo de exemplo está disponível em: `exemplo-analise-setorial.csv`

Este arquivo contém dados fictícios de 6 setores:
- Operacional
- Administrativo
- Comercial
- Financeiro
- TI
- RH

Com 30 categorias diferentes e 12 meses de dados (Jan/25 a Dez/25).

## 🆘 Solução de Problemas

### O arquivo não carrega
- Verifique se o CSV tem as colunas obrigatórias: Setor, Categoria, Despesas
- Certifique-se de que os meses estão no formato `mm/aa`
- Tente salvar o CSV com encoding UTF-8

### Os gráficos não aparecem
- Verifique se há dados após aplicar os filtros
- Selecione pelo menos um período
- Limpe os filtros e tente novamente

### O gráfico de linha não aparece
- O gráfico de linha só aparece quando **2 ou mais períodos** são selecionados
- Selecione múltiplos meses usando Ctrl + Clique

## 🔄 Navegação

Para voltar para outras páginas:
- **DRE**: Demonstração do Resultado do Exercício
- **Parcelamentos**: Gestão de parcelamentos
- **Seguros**: Gestão de seguros

---

**Versão:** 1.0.0  
**Data:** 08/01/2026  
**Desenvolvido para:** Mar Brasil
