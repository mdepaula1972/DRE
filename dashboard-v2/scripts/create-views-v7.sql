-- SQL v7 - Corrige cálculo de end_date (não adicionar mês extra)

-- Dropar views
DROP VIEW IF EXISTS loan_projections;
DROP VIEW IF EXISTS loan_stats;
DROP VIEW IF EXISTS employee_loans_summary;
DROP VIEW IF EXISTS contracts;
DROP VIEW IF EXISTS contracts_expanded;

-- View: Contratos expandidos (ambos os tipos de empréstimo)
CREATE OR REPLACE VIEW contracts_expanded AS
WITH json_contracts AS (
    SELECT 
        gen_random_uuid() as id,
        emp.id as employee_id,
        emp.corporate_name as employee_name,
        emp.company,
        (value->>'request_date')::date as request_date,
        (value->>'start_cycle')::text as start_cycle,
        ((value->>'start_cycle')::text || '-01')::date as start_date,
        (value->>'amount')::numeric as value,
        (value->>'amount')::numeric as original_value,
        (value->>'installments')::int as installments,
        (value->>'amount')::numeric / NULLIF((value->>'installments')::int, 0) as installment_value,
        -- CORREÇÃO: subtrair 1 mês do cálculo (parcelas contadas corretamente)
        (((value->>'start_cycle')::text || '-01')::date + (((value->>'installments')::int - 1) || ' months')::interval)::date as end_date,
        GREATEST(0, 
            (value->>'installments')::int - 
            GREATEST(0, 
                (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ((value->>'start_cycle')::text || '-01')::date)) * 12 +
                (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM ((value->>'start_cycle')::text || '-01')::date))
            )
        )::int as remaining_installments,
        LEAST(
            (value->>'installments')::int,
            GREATEST(0, 
                (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ((value->>'start_cycle')::text || '-01')::date)) * 12 +
                (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM ((value->>'start_cycle')::text || '-01')::date)) + 1
            )
        )::int as installments_paid,
        'ATIVO' as status,
        'Empréstimo ' || (value->>'start_cycle')::text as description,
        RIGHT(emp.id::text, 4) as operation_number
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
        emp.corporate_name as employee_name,
        emp.company,
        emp.loan_request_date::date as request_date,
        emp.loan_start_cycle::text as start_cycle,
        (emp.loan_start_cycle || '-01')::date as start_date,
        emp.loan_amount::numeric as value,
        emp.loan_amount::numeric as original_value,
        emp.loan_installments::int as installments,
        emp.loan_amount::numeric / NULLIF(emp.loan_installments, 0) as installment_value,
        -- CORREÇÃO: subtrair 1 mês do cálculo
        ((emp.loan_start_cycle || '-01')::date + ((emp.loan_installments - 1) || ' months')::interval)::date as end_date,
        GREATEST(0, 
            emp.loan_installments - 
            GREATEST(0, 
                (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM (emp.loan_start_cycle || '-01')::date)) * 12 +
                (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM (emp.loan_start_cycle || '-01')::date))
            )
        )::int as remaining_installments,
        LEAST(
            emp.loan_installments,
            GREATEST(0, 
                (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM (emp.loan_start_cycle || '-01')::date)) * 12 +
                (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM (emp.loan_start_cycle || '-01')::date)) + 1
            )
        )::int as installments_paid,
        'ATIVO' as status,
        'Empréstimo ' || emp.loan_start_cycle::text as description,
        RIGHT(emp.id::text, 4) as operation_number
    FROM employees emp
    WHERE emp.loan_amount IS NOT NULL 
      AND emp.loan_amount > 0
)
SELECT * FROM json_contracts
UNION ALL
SELECT * FROM field_contracts;

-- View: Resumo
CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    CASE WHEN emp.pj_type IS NOT NULL THEN 'PJ' ELSE 'CLT' END as link_type,
    0::numeric as remuneration,
    COALESCE((SELECT SUM(ce.value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_loaned,
    COALESCE((SELECT SUM(ce.installment_value * ce.installments_paid) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_received,
    COALESCE((SELECT SUM(ce.installment_value * ce.remaining_installments) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_balance,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0) as monthly_installment,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0)::int as active_contracts,
    emp.status
FROM employees emp
WHERE (emp.loans_data IS NOT NULL AND emp.loans_data != '[]' AND emp.loans_data != 'null')
   OR (emp.loan_amount IS NOT NULL AND emp.loan_amount > 0);

-- View: Estatísticas
CREATE OR REPLACE VIEW loan_stats AS
SELECT
    COALESCE((SELECT SUM(original_value) FROM contracts_expanded), 0) as total_emprestado,
    COALESCE((SELECT SUM(installment_value * remaining_installments) FROM contracts_expanded WHERE remaining_installments > 0), 0) as saldo_devedor,
    COALESCE((SELECT SUM(installment_value * installments_paid) FROM contracts_expanded), 0) as total_recebido,
    COALESCE((SELECT SUM(installment_value) FROM contracts_expanded WHERE remaining_installments > 0), 0) as recebivel_mes,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments > 0), 0)::int as contratos_ativos,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments = 0), 0)::int as contratos_liquidados,
    COALESCE((SELECT MAX(value) FROM contracts_expanded), 0) as maior_emprestimo,
    COALESCE((SELECT employee_name || ' - OP. #' || operation_number FROM contracts_expanded ORDER BY value DESC LIMIT 1), '-') as maior_emprestimo_ref,
    -- CORREÇÃO: formato dd/mm/aaaa
    COALESCE((SELECT to_char(end_date, 'DD/MM/YYYY') FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY end_date ASC LIMIT 1), '-') as proximo_encerrar,
    COALESCE((SELECT remaining_installments::int FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY end_date ASC LIMIT 1), 0) as parcelas_restantes;

-- View: Projeções
CREATE OR REPLACE VIEW loan_projections AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
        '1 month'::interval
    ) as month_date
)
SELECT 
    to_char(m.month_date, 'Mon/YY') as month,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce WHERE ce.remaining_installments > 0 AND m.month_date <= ce.end_date AND m.month_date >= ce.start_date), 0)::numeric as total,
    COALESCE((SELECT SUM(ce.installment_value) * 0.9 FROM contracts_expanded ce WHERE ce.remaining_installments > 0 AND m.month_date <= ce.end_date AND m.month_date >= ce.start_date), 0)::numeric as previsto
FROM months m
ORDER BY m.month_date;

-- View: Contratos
CREATE OR REPLACE VIEW contracts AS
SELECT 
    id, employee_id, start_date, value,
    (installment_value * remaining_installments) as balance,
    installments, installment_value, installments_paid,
    end_date as next_payment_date, end_date, status, description, operation_number, remaining_installments
FROM contracts_expanded;
