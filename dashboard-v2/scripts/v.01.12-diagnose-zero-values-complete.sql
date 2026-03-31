-- v.01.12 - Diagnóstico completo de valores zerados
-- Execute no Supabase SQL Editor

-- 1. Verificar se contracts_expanded está sendo usada corretamente
SELECT 'STEP 1 - Verificar contracts_expanded' as info;
SELECT 
    'Total contratos em contracts_expanded' as metrica,
    COUNT(*) as valor
FROM contracts_expanded;

-- 2. Verificar se employee_loans_summary está calculando corretamente
SELECT 'STEP 2 - Verificar employee_loans_summary' as info;
SELECT 
    'Total em employee_loans_summary' as metrica,
    COUNT(*) as valor
FROM employee_loans_summary;

-- 3. Verificar se os valores estão sendo calculados (não nulos)
SELECT 'STEP 3 - Verificar valores calculados' as info;
SELECT 
    'Com total_loaned > 0' as metrica,
    COUNT(*) as valor
FROM employee_loans_summary 
WHERE total_loaned > 0;

-- 4. Verificar se os contratos têm parcelas vinculadas
SELECT 'STEP 4 - Verificar vinculação contratos-parcelas' as info;
SELECT 
    'Contratos com parcelas' as metrica,
    COUNT(DISTINCT ce.id) as valor
FROM contracts_expanded ce
JOIN loan_payments lp ON lp.contract_id = ce.id;

-- 5. Verificar um exemplo específico
SELECT 'STEP 5 - Exemplo: 3 contratos aleatórios' as info;
SELECT 
    ce.employee_name,
    ce.value as valor_contrato,
    ce.total_received,
    ce.balance,
    COUNT(lp.id) as parcelas_vinculadas
FROM contracts_expanded ce
LEFT JOIN loan_payments lp ON lp.contract_id = ce.id
GROUP BY ce.id, ce.employee_name, ce.value, ce.total_received, ce.balance
ORDER BY ce.value DESC
LIMIT 3;

-- 6. Verificar se o problema está na view employee_loans_summary
SELECT 'STEP 6 - Comparação direta employees vs employee_loans_summary' as info;
SELECT 
    e.full_name,
    e.loan_amount as valor_em_tabela,
    els.total_loaned as valor_na_view,
    CASE WHEN e.loan_amount > 0 AND els.total_loaned = 0 THEN 'PROBLEMA' ELSE 'OK' END as status
FROM employees e
LEFT JOIN employee_loans_summary els ON els.employee_id = e.id
WHERE e.loan_amount > 0
LIMIT 5;

-- 7. Verificar se contracts_expanded está filtrando corretamente
SELECT 'STEP 7 - Verificar filtros em contracts_expanded' as info;
SELECT 
    'Funcionários com loan_amount > 0' as metrica,
    COUNT(*) as valor
FROM employees 
WHERE loan_amount > 0;

-- 8. Verificar se o problema está no JOIN com loan_payments
SELECT 'STEP 8 - Testar contracts_expanded sem JOIN com loan_payments' as info;
SELECT 
    'Contratos sem JOIN' as metrica,
    COUNT(*) as valor
FROM (
    SELECT 
        emp.id as id,
        emp.id as employee_id,
        COALESCE(NULLIF(TRIM(emp.full_name), ''), emp.corporate_name) as employee_name,
        emp.company,
        emp.loan_amount::numeric as value,
        emp.loan_installments::int as installments
    FROM employees emp
    WHERE emp.loan_amount IS NOT NULL 
      AND emp.loan_amount > 0
) base_contracts;
