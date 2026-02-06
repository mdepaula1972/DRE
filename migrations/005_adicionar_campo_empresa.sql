-- ==================================================
-- ADICIONAR CAMPO EMPRESA À TABELA NOTAS_FISCAIS
-- ==================================================

-- Adicionar coluna empresa
ALTER TABLE notas_fiscais
ADD COLUMN IF NOT EXISTS empresa VARCHAR(50);

-- Criar índice para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_empresa 
ON notas_fiscais(empresa);

-- Atualizar notas existentes com valor padrão (se necessário)
-- UPDATE notas_fiscais SET empresa = 'Mar_BR' WHERE empresa IS NULL;

-- Verificar estrutura atualizada
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notas_fiscais'
ORDER BY ordinal_position;

-- Comentado porque valor_bruto pode não existir ainda
-- Verificar distribuição por empresa
-- SELECT 
--     empresa,
--     COUNT(*) as total_notas
-- FROM notas_fiscais
-- GROUP BY empresa
-- ORDER BY empresa;
