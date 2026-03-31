-- Adicionar campo para postergação na tabela employee_loans
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE employee_loans 
ADD COLUMN postponed_months INTEGER DEFAULT 0;

-- Opcional: Adicionar comentário
COMMENT ON COLUMN employee_loans.postponed_months IS 'Número de meses postergados (empurrados para o final do empréstimo)';

-- Verificar se o campo foi adicionado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'employee_loans' AND column_name = 'postponed_months';
