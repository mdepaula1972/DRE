# Dashboard DRE - Guia de Dados

O Dashboard agora está configurado para carregar automaticamente o arquivo **`dados.csv`** que estiver na pastaraiz.

## Como Atualizar os Dados

Para que o Dashboard mostre as informações mais recentes, você deve garantir que o arquivo `dados.csv` contenha toda a base consolidada (histórico + novos dados).

### 1. Preparação da Planilha

1. Mantenha sua planilha master de controle (Excel).
2. Certifique-se de que ela tenha as colunas: `Empresa`, `Projeto`, `Categoria` e os meses (ex: `jan/24`, `jun/25`).
3. **Salve como CSV (separado por ponto e vírgula)** com o nome exato de `dados.csv` na pasta do projeto.

### 2. Carregamento Automático

- Ao abrir o arquivo `dre.html`, o sistema buscará o `dados.csv` automaticamente.
- Se você fizer alterações no arquivo, basta **atualizar a página** do navegador.
- O sistema detecta automaticamente:
  - Separador `;` (ponto e vírgula)
  - Acentos e caracteres especiais (ISO-8859-1)

## Estrutura Esperada do CSV

| Empresa | Projeto | Categoria | jan/24 | ... | jun/25 |
|---------|---------|-----------|--------|-----|--------|
| Mar_BR  | Exemplo | Ativos    | 1500   | ... | 2000   |

## Dicas Adicionais

- **Consórcios**: O app agrupa automaticamente "Consórcios - a contemplar" e "Consórcios - contemplados" em uma única linha visual.
- **Equipamentos**: Itens na categoria "Equipamentos" são somados automaticamente à linha de **Ativos**.
- **Limpeza de Filtros**: Use o botão "Limpar" no menu lateral se as opções parecerem travadas.
