-- Script de diagnóstico para verificar ambiente de teste
-- Execute no Supabase SQL Editor para identificar o problema

-- 1. Verificar se a tabela employees_test existe e tem dados
SELECT 'employees_test' as tabela, COUNT(*) as total_registros FROM employees_test
UNION ALL
SELECT 'employees (produção)', COUNT(*) FROM employees;

-- 2. Verificar se as views de teste existem
SELECT 
    schemaname,
    viewname,
    'EXISTS' as status
FROM pg_views 
WHERE viewname LIKE '%_test' 
AND schemaname = 'public';

-- 3. Testar se a view contracts_expanded_test retorna dados
SELECT 
    'contracts_expanded_test' as view_name,
    COUNT(*) as total_contratos,
    COUNT(DISTINCT employee_id) as total_funcionarios
FROM contracts_expanded_test;

-- 4. Testar se a view employee_loans_summary_test retorna dados
SELECT 
    'employee_loans_summary_test' as view_name,
    COUNT(*) as total_registros
FROM employee_loans_summary_test;

-- 5. Verificar estrutura da employees_test vs employees original
SELECT 
    column_name,
    data_type,
    'employees_test' as tabela
FROM information_schema.columns 
WHERE table_name = 'employees_test'
UNION ALL
SELECT 
    column_name,
    data_type,
    'employees'
FROM information_schema.columns 
WHERE table_name = 'employees'
ORDER BY column_name, tabela;

-- 6. Testar consulta simples na employees_test
SELECT id, corporate_name, company, loan_amount 
FROM employees_test 
WHERE loan_amount IS NOT NULL 
LIMIT 5;
