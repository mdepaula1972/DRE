-- v.01.02 - Script para recriar employees_test corretamente
-- Primeiro, veja as colunas da tabela original:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees'
ORDER BY ordinal_position;
