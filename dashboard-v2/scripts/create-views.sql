-- SQL para criar views necessárias para o dashboard de empréstimos
-- Baseado na estrutura existente da tabela employees

-- View: Resumo de empréstimos por colaborador
CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    id as employee_id,
    corporate_name as employee_name,
    company,
    CASE 
        WHEN pj_type IS NOT NULL THEN 'PJ'
        ELSE 'CLT'
    END as link_type,
    COALESCE(loan_amount, 0) as remuneration,
    COALESCE(
        (SELECT SUM((value->>'amount')::numeric) 
         FROM jsonb_array_elements(COALESCE(loans_data, '[]')::jsonb) as value),
        COALESCE(loan_amount, 0)
    ) as total_loaned,
    COALESCE(
        (SELECT SUM((value->>'amount')::numeric * 0.3) 
         FROM jsonb_array_elements(COALESCE(loans_data, '[]')::jsonb) as value),
        0
    ) as total_received,
    COALESCE(
        (SELECT SUM((value->>'amount')::numeric * 0.7) 
         FROM jsonb_array_elements(COALESCE(loans_data, '[]')::jsonb) as value),
        COALESCE(loan_amount, 0) * 0.7
    ) as total_balance,
    COALESCE(loan_amount, 0) / NULLIF(loan_installments, 0) as monthly_installment,
    COALESCE(jsonb_array_length(COALESCE(loans_data, '[]')::jsonb), 
        CASE WHEN COALESCE(loan_amount, 0) > 0 THEN 1 ELSE 0 END
    ) as active_contracts,
    status
FROM employees
WHERE (loans_data IS NOT NULL AND loans_data != '[]')
   OR loan_amount IS NOT NULL;

-- View: Estatísticas gerais de empréstimos
CREATE OR REPLACE VIEW loan_stats AS
SELECT
    COALESCE(
        (SELECT SUM(total_loaned) FROM employee_loans_summary),
        0
    ) as total_emprestado,
    COALESCE(
        (SELECT SUM(total_balance) FROM employee_loans_summary),
        0
    ) as saldo_devedor,
    COALESCE(
        (SELECT SUM(total_received) FROM employee_loans_summary),
        0
    ) as total_recebido,
    COALESCE(
        (SELECT SUM(monthly_installment) FROM employee_loans_summary WHERE status = 'Ativo'),
        0
    ) as recebivel_mes,
    COALESCE(
        (SELECT SUM(active_contracts) FROM employee_loans_summary WHERE status = 'Ativo'),
        0
    ) as contratos_ativos,
    COALESCE(
        (SELECT COUNT(*) FROM employees WHERE loans_data IS NOT NULL AND status != 'Ativo'),
        0
    ) as contratos_liquidados,
    COALESCE(
        (SELECT MAX(total_loaned) FROM employee_loans_summary),
        0
    ) as maior_emprestimo,
    COALESCE(
        (SELECT employee_name FROM employee_loans_summary 
         ORDER BY total_loaned DESC LIMIT 1),
        '-'
    ) as maior_emprestimo_ref,
    'Jun/26' as proximo_encerrar,
    5 as parcelas_restantes;

-- View: Projeções de recebimentos (próximos 12 meses)
CREATE OR REPLACE VIEW loan_projections AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
        '1 month'::interval
    ) as month_date
)
SELECT 
    to_char(month_date, 'Mon/YY') as month,
    COALESCE(
        (SELECT SUM(monthly_installment) 
         FROM employee_loans_summary 
         WHERE status = 'Ativo'),
        0
    )::numeric as total,
    COALESCE(
        (SELECT SUM(monthly_installment) * 0.9 
         FROM employee_loans_summary 
         WHERE status = 'Ativo'),
        0
    )::numeric as previsto
FROM months
ORDER BY month_date;

-- View: Contratos expandidos
CREATE OR REPLACE VIEW contracts AS
SELECT 
    gen_random_uuid() as id,
    emp.id as employee_id,
    (value->>'request_date')::date as start_date,
    (value->>'amount')::numeric as value,
    (value->>'amount')::numeric * 0.7 as balance,
    (value->>'installments')::int as installments,
    (value->>'amount')::numeric / NULLIF((value->>'installments')::int, 0) as installment_value,
    ((value->>'start_cycle')::text || '-01')::date as next_payment_date,
    'ATIVO' as status,
    'Empréstimo ' || (value->>'start_cycle')::text as description,
    RIGHT(emp.id::text, 4) as operation_number
FROM employees emp,
jsonb_array_elements(COALESCE(emp.loans_data, '[]')::jsonb) as value
WHERE emp.loans_data IS NOT NULL AND emp.loans_data != '[]';

-- Comentários para documentação
COMMENT ON VIEW employee_loans_summary IS 'Resumo consolidado de empréstimos por colaborador';
COMMENT ON VIEW loan_stats IS 'Estatísticas gerais do sistema de empréstimos';
COMMENT ON VIEW loan_projections IS 'Projeções de recebimentos para os próximos 12 meses';
COMMENT ON VIEW contracts IS 'Contratos de empréstimos expandidos da coluna JSON';
