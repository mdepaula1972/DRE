-- v.01.11 - Relatório CSV Exportável
-- Execute no Supabase SQL Editor e exporte os resultados

-- ========================================
-- RELATÓRIO RESUMO (1 linha por colaborador)
-- ========================================

-- Para exportar como CSV no Supabase:
-- 1. Execute a query
-- 2. Clique em "Export" → "CSV"

SELECT 
    e.employee_name as "Nome do Colaborador",
    e.company as "Empresa",
    e.link_type as "Vínculo",
    e.status as "Status",
    e.total_loaned as "Total Emprestado (R$)",
    e.total_received as "Total Recebido (R$)",
    e.total_balance as "Saldo Devedor (R$)",
    e.monthly_installment as "Parcela Mensal (R$)",
    e.active_contracts as "Contratos Ativos"
FROM employee_loans_summary e
ORDER BY e.total_loaned DESC;

-- ========================================
-- RELATÓTIO DETALHADO POR CONTRATO
-- ========================================

SELECT 
    c.employee_name as "Colaborador",
    c.company as "Empresa",
    c.operation_number as "Nº Contrato",
    c.value as "Valor Total (R$)",
    c.total_installments as "Qtd Parcelas",
    c.installment_value as "Valor Parcela (R$)",
    c.total_received as "Recebido (R$)",
    c.balance as "Saldo (R$)",
    c.installments_paid as "Parcelas Pagas",
    c.remaining_installments as "Parcelas Restantes",
    c.status as "Status",
    c.start_date as "Data Início",
    c.end_date as "Data Término",
    c.next_payment_date as "Próx. Vencimento"
FROM contracts_expanded c
ORDER BY c.employee_name, c.start_date;

-- ========================================
-- RELATÓRIO DE PARCELAS
-- ========================================

SELECT 
    COALESCE(NULLIF(TRIM(e.full_name), ''), e.corporate_name) as "Colaborador",
    e.company as "Empresa",
    lp.month_cycle as "Ciclo",
    lp.due_date as "Data Vencimento",
    lp.amount as "Valor (R$)",
    lp.status as "Status",
    lp.payment_date as "Data Pagamento",
    lp.payment_method as "Forma Pagamento"
FROM loan_payments lp
JOIN employees e ON e.id = lp.employee_id
ORDER BY e.full_name, lp.due_date;

-- ========================================
-- RESUMO EXECUTIVO (para dashboard)
-- ========================================

SELECT 
    'Total Emprestado' as "Métrica",
    COALESCE(SUM(total_loaned), 0) as "Valor (R$)",
    (SELECT COUNT(*) FROM contracts_expanded) as "Quantidade"
FROM employee_loans_summary
UNION ALL
SELECT 
    'Saldo Devedor',
    COALESCE(SUM(total_balance), 0),
    (SELECT COUNT(*) FROM contracts_expanded WHERE status = 'ATIVO')
FROM employee_loans_summary
UNION ALL
SELECT 
    'Total Recebido',
    COALESCE(SUM(total_received), 0),
    (SELECT COUNT(*) FROM loan_payments WHERE status = 'PAGO')
FROM employee_loans_summary
UNION ALL
SELECT 
    'A Receber Este Mês',
    COALESCE(SUM(monthly_installment), 0),
    (SELECT COUNT(*) FROM loan_payments WHERE month_cycle = TO_CHAR(CURRENT_DATE, 'YYYY-MM') AND status = 'PENDENTE')
FROM employee_loans_summary;
