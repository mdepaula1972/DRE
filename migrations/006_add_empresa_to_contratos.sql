-- ==================================================
-- ADICIONAR CAMPO EMPRESA À TABELA CONTRATOS_BASE
-- ==================================================

-- Verificar se coluna existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contratos_base' AND column_name = 'empresa'
    ) THEN
        ALTER TABLE contratos_base ADD COLUMN empresa VARCHAR(100);
        RAISE NOTICE 'Coluna empresa adicionada';
    ELSE
        RAISE NOTICE 'Coluna empresa já existe';
    END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_contratos_empresa 
ON contratos_base(empresa);

-- Verificar estrutura
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contratos_base'
ORDER BY ordinal_position;
