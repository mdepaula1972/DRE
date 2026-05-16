-- v.01.08 - Fix: Corrigir view para usar full_name em vez de corporate_name
-- Problema: Muitos colaboradores têm corporate_name vazio, causando nomes em branco no app

-- ========================================
-- CORREÇÃO DA VIEW employee_loans_summary
-- ========================================

DROP VIEW IF EXISTS employee_loans_summary;

CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    emp.id as employee_id,
    COALESCE(NULLIF(TRIM(emp.full_name), ''), emp.corporate_name) as employee_name,
    emp.company,
    CASE WHEN emp.pj_type IS NOT NULL THEN 'PJ' ELSE 'CLT' END as link_type,
    0::numeric as remuneration,
    COALESCE((SELECT SUM(ce.value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_loaned,
    COALESCE((SELECT SUM(ce.total_received) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_received,
    COALESCE((SELECT SUM(ce.balance) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_balance,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce 
              WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO'), 0) as monthly_installment,
    (SELECT COUNT(*) FROM contracts_expanded ce 
     WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO')::int as active_contracts,
    emp.status,
    COALESCE(emp.is_test, FALSE) as is_test
FROM employees emp
WHERE emp.is_test = FALSE OR emp.is_test IS NULL;

-- ========================================
-- CORREÇÃO DA VIEW contracts_expanded (também usa employee_name)
-- ========================================

DROP VIEW IF EXISTS loan_projections;
DROP VIEW IF EXISTS loan_stats;
DROP VIEW IF EXISTS employee_loans_summary;
DROP VIEW IF EXISTS contracts;
DROP VIEW IF EXISTS contracts_expanded;

-- Recriar contracts_expanded com COALESCE para employee_name
CREATE OR REPLACE VIEW contracts_expanded AS
WITH json_contracts AS (
    SELECT 
        gen_random_uuid() as id,
        emp.id as employee_id,
        COALESCE(NULLIF(TRIM(emp.full_name), ''), emp.corporate_name) as employee_name,
        emp.company,
        (value->>'request_date')::date as request_date,
        (value->>'start_cycle')::text as start_cycle,
        ((value->>'start_cycle')::text || '-01')::date as start_date,
        (value->>'amount')::numeric as value,
        (value->>'amount')::numeric as original_value,
        (value->>'installments')::int as installments,
        (value->>'amount')::numeric / NULLIF((value->>'installments')::int, 0) as installment_value,
        (((value->>'start_cycle')::text || '-01')::date + (((value->>'installments')::int - 1) || ' months')::interval)::date as end_date,
        (value->>'installments')::int as total_installments,
        RIGHT(emp.id::text, 4) as operation_number,
        'Empréstimo ' || (value->>'start_cycle')::text as description
    FROM employees emp,
    jsonb_array_elements(COALESCE(emp.loans_data, '[]')::jsonb) as value
    WHERE emp.loans_data IS NOT NULL 
      AND emp.loans_data != '[]'
      AND emp.loans_data != 'null'
),
field_contracts AS (
    SELECT 
        gen_random_uuid() as id,
        emp.id as employee_id,
        COALESCE(NULLIF(TRIM(emp.full_name), ''), emp.corporate_name) as employee_name,
        emp.company,
        emp.loan_request_date::date as request_date,
        emp.loan_start_cycle::text as start_cycle,
        (emp.loan_start_cycle || '-01')::date as start_date,
        emp.loan_amount::numeric as value,
        emp.loan_amount::numeric as original_value,
        emp.loan_installments::int as installments,
        emp.loan_amount::numeric / NULLIF(emp.loan_installments, 0) as installment_value,
        ((emp.loan_start_cycle || '-01')::date + ((emp.loan_installments - 1) || ' months')::interval)::date as end_date,
        emp.loan_installments as total_installments,
        RIGHT(emp.id::text, 4) as operation_number,
        'Empréstimo ' || emp.loan_start_cycle::text as description
    FROM employees emp
    WHERE emp.loan_amount IS NOT NULL 
      AND emp.loan_amount > 0
),
all_contracts AS (
    SELECT * FROM json_contracts
    UNION ALL
    SELECT * FROM field_contracts
),
contract_stats AS (
    SELECT 
        ac.id as contract_id,
        COUNT(lp.id) FILTER (WHERE lp.status = 'PAGO') as installments_paid,
        COUNT(lp.id) FILTER (WHERE lp.status = 'PENDENTE') as installments_pending,
        COUNT(lp.id) FILTER (WHERE lp.status = 'POSTERGADO') as installments_postponed,
        COALESCE(SUM(lp.amount) FILTER (WHERE lp.status = 'PAGO'), 0) as total_received,
        COALESCE(SUM(lp.amount) FILTER (WHERE lp.status = 'PENDENTE'), 0) as balance,
        MIN(lp.due_date) FILTER (WHERE lp.status = 'PENDENTE') as next_due_date
    FROM all_contracts ac
    LEFT JOIN loan_payments lp ON lp.contract_id = ac.id
    GROUP BY ac.id
)
SELECT 
    ac.*,
    COALESCE(cs.installments_paid, 0) as installments_paid,
    COALESCE(cs.installments_pending, ac.total_installments) as remaining_installments,
    COALESCE(cs.installments_postponed, 0) as installments_postponed,
    COALESCE(cs.total_received, 0) as total_received,
    COALESCE(cs.balance, ac.value) as balance,
    COALESCE(cs.next_due_date, ac.start_date) as next_payment_date,
    CASE 
        WHEN COALESCE(cs.installments_pending, ac.total_installments) = 0 THEN 'LIQUIDADO'
        ELSE 'ATIVO'
    END as status
FROM all_contracts ac
LEFT JOIN contract_stats cs ON cs.contract_id = ac.id;

-- Recriar view contracts (para compatibilidade)
CREATE OR REPLACE VIEW contracts AS
SELECT * FROM contracts_expanded;

-- Recriar employee_loans_summary após contracts_expanded
CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    emp.id as employee_id,
    COALESCE(NULLIF(TRIM(emp.full_name), ''), emp.corporate_name) as employee_name,
    emp.company,
    CASE WHEN emp.pj_type IS NOT NULL THEN 'PJ' ELSE 'CLT' END as link_type,
    0::numeric as remuneration,
    COALESCE((SELECT SUM(ce.value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_loaned,
    COALESCE((SELECT SUM(ce.total_received) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_received,
    COALESCE((SELECT SUM(ce.balance) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_balance,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce 
              WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO'), 0) as monthly_installment,
    (SELECT COUNT(*) FROM contracts_expanded ce 
     WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO')::int as active_contracts,
    emp.status,
    COALESCE(emp.is_test, FALSE) as is_test
FROM employees emp
WHERE emp.is_test = FALSE OR emp.is_test IS NULL;

-- Recriar outras views dependentes
CREATE OR REPLACE VIEW loan_stats AS
SELECT 
    COALESCE((SELECT SUM(total_loaned) FROM employee_loans_summary), 0) as total_emprestado,
    COALESCE((SELECT SUM(total_balance) FROM employee_loans_summary), 0) as saldo_devedor,
    COALESCE((SELECT SUM(total_received) FROM employee_loans_summary), 0) as total_recebido,
    COALESCE((SELECT SUM(monthly_installment) FROM employee_loans_summary), 0) as recebivel_mes,
    (SELECT COUNT(*) FROM contracts_expanded WHERE status = 'ATIVO')::int as contratos_ativos,
    (SELECT COUNT(*) FROM contracts_expanded WHERE status = 'LIQUIDADO')::int as contratos_liquidados,
    COALESCE((SELECT MAX(value) FROM contracts_expanded), 0) as maior_emprestimo,
    COALESCE((SELECT employee_name FROM contracts_expanded ORDER BY value DESC LIMIT 1), '-') as maior_emprestimo_ref,
    COALESCE(TO_CHAR((SELECT MIN(end_date) FROM contracts_expanded WHERE remaining_installments <= 3 AND status = 'ATIVO'), 'DD/MM/YYYY'), '-') as proximo_encerrar,
    COALESCE((SELECT SUM(remaining_installments) FROM contracts_expanded WHERE status = 'ATIVO'), 0) as parcelas_restantes;

CREATE OR REPLACE VIEW loan_projections AS
WITH months AS (
    SELECT generate_series(
        DATE_TRUNC('month', CURRENT_DATE),
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '11 months',
        INTERVAL '1 month'
    )::date as month_date
)
SELECT 
    TO_CHAR(m.month_date, 'YYYY-MM') as month,
    COALESCE(SUM(lp.amount) FILTER (WHERE lp.status IN ('PENDENTE', 'PAGO')), 0) as total,
    COUNT(lp.id) FILTER (WHERE lp.status = 'PENDENTE') as previsto
FROM months m
LEFT JOIN loan_payments lp ON lp.month_cycle = TO_CHAR(m.month_date, 'YYYY-MM')
GROUP BY m.month_date
ORDER BY m.month_date;

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Testar se agora os nomes aparecem corretamente
SELECT 
    employee_id,
    employee_name,
    company,
    total_loaned
FROM employee_loans_summary 
WHERE employee_name = '' OR employee_name IS NULL
ORDER BY employee_name;
