-- v.01.16 - Verificar dados reais no Supabase
-- Execute para confirmar se os dados foram reconstruídos corretamente

-- 1. Verificar employees com empréstimos
SELECT 'STEP 1 - Employees com empréstimos' as info;
SELECT 
    'Com loan_amount > 0' as metrica,
    COUNT(*) as valor,
    COALESCE(SUM(loan_amount), 0) as total
FROM employees 
WHERE loan_amount > 0 AND is_test = FALSE;

-- 2. Verificar loan_payments
SELECT 'STEP 2 - Loan Payments' as info;
SELECT 
    'Total de parcelas' as metrica,
    COUNT(*) as valor,
    COALESCE(SUM(amount), 0) as total
FROM loan_payments;

-- 3. Verificar employee_loans_summary
SELECT 'STEP 3 - Employee Loans Summary' as info;
SELECT 
    'Com total_loaned > 0' as metrica,
    COUNT(*) as valor,
    COALESCE(SUM(total_loaned), 0) as total
FROM employee_loans_summary;

-- 4. Verificar contracts_expanded
SELECT 'STEP 4 - Contracts Expanded' as info;
SELECT 
    'Total de contratos' as metrica,
    COUNT(*) as valor,
    COALESCE(SUM(value), 0) as total
FROM contracts_expanded;

-- 5. Verificar se as views estão filtrando teste
SELECT 'STEP 5 - Verificar filtro de teste' as info;
SELECT 
    'Funcionários reais (sem teste)' as metrica,
    COUNT(*) as valor
FROM employee_loans_summary 
WHERE is_test = FALSE;

-- 6. Verificar se o problema é no cache do app
SELECT 'STEP 6 - Comparação direta' as info;
SELECT 
    e.full_name as nome,
    e.loan_amount as valor_original,
    COALESCE(els.total_loaned, 0) as valor_na_view,
    CASE 
        WHEN e.loan_amount > 0 AND COALESCE(els.total_loaned, 0) = 0 THEN 'PROBLEMA NA VIEW'
        WHEN e.loan_amount = COALESCE(els.total_loaned, 0) THEN 'OK'
        ELSE 'DIFERENÇA'
    END as status
FROM employees e
LEFT JOIN employee_loans_summary els ON els.employee_id = e.id
WHERE e.loan_amount > 0 
  AND e.is_test = FALSE
LIMIT 10;
