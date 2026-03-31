-- v.01.11 - Relatório Completo de Empréstimos
-- Execute no Supabase SQL Editor

-- ========================================
-- RESUMO GERAL
-- ========================================

SELECT 
    '📊 RESUMO GERAL' as secao,
    ' ' as detalhe,
    ' ' as valor
UNION ALL
SELECT 
    'Total Emprestado',
    'Soma de todos os empréstimos ativos',
    'R$ ' || TO_CHAR(COALESCE(SUM(total_loaned), 0), 'FM999.999.999,00')
FROM employee_loans_summary
UNION ALL
SELECT 
    'Saldo Devedor',
    'Total ainda não recebido',
    'R$ ' || TO_CHAR(COALESCE(SUM(total_balance), 0), 'FM999.999.999,00')
FROM employee_loans_summary
UNION ALL
SELECT 
    'Total Recebido',
    'Soma de todas as parcelas pagas',
    'R$ ' || TO_CHAR(COALESCE(SUM(total_received), 0), 'FM999.999.999,00')
FROM employee_loans_summary
UNION ALL
SELECT 
    'Contratos Ativos',
    'Número de empréstimos em andamento',
    (SELECT COUNT(*)::text FROM contracts_expanded WHERE status = 'ATIVO')
UNION ALL
SELECT 
    'Contratos Liquidados',
    'Número de empréstimos quitados',
    (SELECT COUNT(*)::text FROM contracts_expanded WHERE status = 'LIQUIDADO')
UNION ALL
SELECT 
    'Recebível Mensal',
    'Total de parcelas a receber este mês',
    'R$ ' || TO_CHAR(COALESCE(SUM(monthly_installment), 0), 'FM999.999.999,00')
FROM employee_loans_summary
WHERE status = 'ATIVO';

-- ========================================
-- DETALHAMENTO POR COLABORADOR
-- ========================================

SELECT 
    'DETALHAMENTO POR COLABORADOR' as relatorio,
    e.employee_name as colaborador,
    e.company as empresa,
    e.link_type as vinculo,
    'R$ ' || TO_CHAR(e.total_loaned, 'FM999.999.999,00') as total_emprestado,
    'R$ ' || TO_CHAR(e.total_received, 'FM999.999.999,00') as total_recebido,
    'R$ ' || TO_CHAR(e.total_balance, 'FM999.999.999,00') as saldo_devedor,
    'R$ ' || TO_CHAR(e.monthly_installment, 'FM999.999.999,00') as parcela_mes,
    e.active_contracts::text as contratos_ativos,
    e.status
FROM employee_loans_summary e
ORDER BY e.total_loaned DESC;

-- ========================================
-- DETALHAMENTO POR CONTRATO
-- ========================================

SELECT 
    'DETALHAMENTO POR CONTRATO' as relatorio,
    c.employee_name as colaborador,
    c.company as empresa,
    c.operation_number as contrato,
    'R$ ' || TO_CHAR(c.value, 'FM999.999.999,00') as valor_total,
    c.total_installments::text || 'x R$ ' || TO_CHAR(c.installment_value, 'FM999.999,00') as parcelas,
    'R$ ' || TO_CHAR(c.total_received, 'FM999.999.999,00') as recebido,
    'R$ ' || TO_CHAR(c.balance, 'FM999.999.999,00') as saldo,
    c.installments_paid::text || '/' || c.total_installments::text as pagas,
    c.status,
    TO_CHAR(c.start_date, 'DD/MM/YYYY') as inicio,
    TO_CHAR(c.end_date, 'DD/MM/YYYY') as termino
FROM contracts_expanded c
ORDER BY c.value DESC;

-- ========================================
-- PROJEÇÃO DE RECEBIMENTOS
-- ========================================

SELECT 
    'PROJEÇÃO MENSAL' as relatorio,
    p.month as mes,
    'R$ ' || TO_CHAR(p.total, 'FM999.999.999,00') as total_previsto,
    p.previsto::text || ' parcelas' as quantidade
FROM loan_projections p
ORDER BY p.month;

-- ========================================
-- PARCELAS PENDENTES
-- ========================================

SELECT 
    'PARCELAS PENDENTES' as relatorio,
    COALESCE(NULLIF(TRIM(e.full_name), ''), e.corporate_name) as colaborador,
    e.company as empresa,
    lp.month_cycle as ciclo,
    TO_CHAR(lp.due_date, 'DD/MM/YYYY') as vencimento,
    'R$ ' || TO_CHAR(lp.amount, 'FM999.999.999,00') as valor,
    lp.status
FROM loan_payments lp
JOIN employees e ON e.id = lp.employee_id
WHERE lp.status = 'PENDENTE'
ORDER BY lp.due_date;

-- ========================================
-- PARCELAS PAGAS
-- ========================================

SELECT 
    'PARCELAS PAGAS' as relatorio,
    COALESCE(NULLIF(TRIM(e.full_name), ''), e.corporate_name) as colaborador,
    e.company as empresa,
    lp.month_cycle as ciclo,
    TO_CHAR(lp.payment_date, 'DD/MM/YYYY') as pagamento,
    'R$ ' || TO_CHAR(lp.amount, 'FM999.999.999,00') as valor,
    lp.payment_method as metodo
FROM loan_payments lp
JOIN employees e ON e.id = lp.employee_id
WHERE lp.status = 'PAGO'
ORDER BY lp.payment_date DESC
LIMIT 50;

-- ========================================
-- DADOS DE TESTE (SE EXISTIREM)
-- ========================================

SELECT 
    'DADOS DE TESTE' as relatorio,
    COALESCE(NULLIF(TRIM(e.full_name), ''), e.corporate_name) as colaborador,
    e.company as empresa,
    'R$ ' || TO_CHAR(e.loan_amount, 'FM999.999.999,00') as valor_emprestimo,
    e.loan_installments::text || ' parcelas' as parcelas,
    (SELECT COUNT(*) FROM loan_payments WHERE employee_id = e.id)::text || ' geradas' as parcelas_geradas,
    'SIM' as is_test
FROM employees e
WHERE e.is_test = TRUE;
