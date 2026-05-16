# Importação de Dados do CSV para Supabase

## Instruções

1. **Instalar dependências** (se ainda não tiver):

   ```bash
   npm install @supabase/supabase-js
   ```

2. **Executar importação**:

   ```bash
   node import-csv-to-supabase.js
   ```

## O que o script faz

✅ Lê `Consolidado Faturamento.csv` (218 registros)  
✅ Extrai contratos únicos e insere em `contratos_base`  
✅ Cria notas fiscais e insere em `notas_fiscais`  
✅ Mapeia campos corretamente (datas, valores, competências)  
✅ Gera números de NF automáticos  

## Campos Mapeados

**CSV → Supabase:**

- Contrato → contratos_base (nome_contrato, empresa)
- Ciclo (nov-25) → competencia (2025-11)
- Emissão → data_emissao
- Valor Faturado → valor_faturado
- Valor líquido → valor_liquido
- Impostos → impostos_total
- Status → status

## Após Importação

Você precisará:

1. Configurar ISS/ICMS dos contratos via `editar-contratos.html`
2. Adicionar novas NFs normalmente pela interface
