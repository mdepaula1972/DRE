# Importação DRE - Duas Fontes

## Arquivos Processados

- **dados_mai25.csv** → Jan/2024 até Mai/2025 (124 registros)
- **dados_tratado_jun25_em_diante.csv** → Jun/2025 em diante (322 registros)

## Execução

```bash
node import-dre-dual-source.js
```

## Resultado

- **2.527 lançamentos** processados
- Formato normalizado: `{empresa, projeto, categoria, competencia, valor}`
- Arquivo gerado: `dados_dre_merged.json`

## Distribuição por Período

| Competência | Lançamentos |
|-------------|-------------|
| 2024-01     | 51          |
| 2024-02     | 53          |
| ...         | ...         |
| 2025-06     | 176         |
| 2025-12     | 204         |

## Próximos Passos

1. ✅ Teste o script (já executado)
2. Validar dados em `dados_dre_merged.json`
3. Integrar com aplicação DRE
