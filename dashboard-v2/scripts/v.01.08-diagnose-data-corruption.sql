-- v.01.08 - Diagnóstico de integridade de dados
-- Execute no Supabase SQL Editor para verificar corrupção

-- ========================================
-- 1. VERIFICAR ESTRUTURA DAS TABELAS
-- ========================================

-- Verificar se loan_payments existe e tem dados
SELECT 
    'loan_payments' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT employee_id) as total_funcionarios,
    COUNT(DISTINCT contract_id) as total_contratos
FROM loan_payments;

-- Verificar se employees tem colaborador teste
SELECT 
    'employees (teste)' as categoria,
    COUNT(*) as total,
    STRING_AGG(corporate_name, ', ') as nomes
FROM employees 
WHERE is_test = TRUE;

-- Verificar employees normais (excluindo teste)
SELECT 
    'employees (reais)' as categoria,
    COUNT(*) as total
FROM employees 
WHERE is_test = FALSE OR is_test IS NULL;

-- ========================================
-- 2. VERIFICAR CONSISTÊNCIA DOS DADOS
-- ========================================

-- Verificar parcelas sem funcionário associado (órfãs)
SELECT 
    'parcelas orfas' as problema,
    COUNT(*) as quantidade
FROM loan_payments lp
LEFT JOIN employees e ON lp.employee_id = e.id
WHERE e.id IS NULL;

-- Verificar parcelas com valores nulos ou zero
SELECT 
    'parcelas com valor zero' as problema,
    COUNT(*) as quantidade
FROM loan_payments 
WHERE amount IS NULL OR amount = 0;

-- Verificar parcelas com datas inválidas
SELECT 
    'parcelas sem data' as problema,
    COUNT(*) as quantidade
FROM loan_payments 
WHERE due_date IS NULL;

-- Verificar funcionários com empréstimo mas sem parcelas
SELECT 
    e.corporate_name,
    e.loan_amount,
    e.loan_installments,
    COUNT(lp.id) as parcelas_geradas
FROM employees e
LEFT JOIN loan_payments lp ON lp.employee_id = e.id
WHERE e.loan_amount > 0
GROUP BY e.id, e.corporate_name, e.loan_amount, e.loan_installments
HAVING COUNT(lp.id) = 0;

-- ========================================
-- 3. VERIFICAR VIEWS
-- ========================================

-- Testar se view employee_loans_summary retorna dados
SELECT 
    'employee_loans_summary' as view,
    COUNT(*) as total_registros,
    SUM(total_loaned) as total_emprestado,
    SUM(total_balance) as total_saldo
FROM employee_loans_summary;

-- Verificar se contracts_expanded funciona
SELECT 
    'contracts_expanded' as view,
    COUNT(*) as total_contratos,
    COUNT(DISTINCT employee_id) as total_funcionarios
FROM contracts_expanded;

-- ========================================
-- 4. VERIFICAR DADOS DO COLABORADOR TESTE
-- ========================================

SELECT 
    e.id,
    e.corporate_name,
    e.is_test,
    COUNT(lp.id) as total_parcelas,
    SUM(CASE WHEN lp.status = 'PAGO' THEN 1 ELSE 0 END) as parcelas_pagas,
    SUM(CASE WHEN lp.status = 'PENDENTE' THEN 1 ELSE 0 END) as parcelas_pendentes,
    SUM(lp.amount) as valor_total_parcelas
FROM employees e
LEFT JOIN loan_payments lp ON lp.employee_id = e.id
WHERE e.is_test = TRUE
GROUP BY e.id, e.corporate_name, e.is_test;

-- ========================================
-- 5. RESUMO DE INTEGRIDADE
-- ========================================

SELECT 
    'RESUMO' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM loan_payments WHERE employee_id IS NULL) > 0 THEN 'PROBLEMA: Parcelas sem funcionário'
        WHEN (SELECT COUNT(*) FROM loan_payments WHERE amount IS NULL OR amount = 0) > 0 THEN 'PROBLEMA: Parcelas sem valor'
        WHEN (SELECT COUNT(*) FROM loan_payments WHERE due_date IS NULL) > 0 THEN 'PROBLEMA: Parcelas sem data'
        ELSE 'OK: Dados consistentes'
    END as status_integridade;
