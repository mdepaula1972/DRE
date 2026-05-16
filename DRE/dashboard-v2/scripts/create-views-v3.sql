-- SQL CORRIGIDO v3 - Baseado na auditoria
-- Correções: parcelas restantes por start_cycle, projeções decrescentes, próximo encerramento correto

-- Dropar views existentes para permitir alterações na estrutura
DROP VIEW IF EXISTS loan_projections;
DROP VIEW IF EXISTS loan_stats;
DROP VIEW IF EXISTS employee_loans_summary;
DROP VIEW IF EXISTS contracts;
DROP VIEW IF EXISTS contracts_expanded;

-- View expandida: Contratos com datas calculadas CORRETAMENTE
CREATE VIEW contracts_expanded AS
SELECT 
    gen_random_uuid() as id,
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    (value->>'request_date')::date as request_date,
    -- Início real é o start_cycle (mês/ano)
    (value->>'start_cycle')::text as start_cycle,
    -- Converter start_cycle para data (primeiro dia do mês)
    ((value->>'start_cycle')::text || '-01')::date as start_date,
    (value->>'amount')::numeric as value,
    (value->>'amount')::numeric as original_value,
    (value->>'installments')::int as installments,
    (value->>'amount')::numeric / NULLIF((value->>'installments')::int, 0) as installment_value,
    -- Data de término = início + número de parcelas
    (((value->>'start_cycle')::text || '-01')::date + ((value->>'installments')::int || ' months')::interval)::date as end_date,
    -- Parcelas restantes: baseado no start_cycle, não no request_date
    GREATEST(0, 
        (value->>'installments')::int - 
        GREATEST(0, 
            (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM ((value->>'start_cycle')::text || '-01')::date)) * 12 +
            (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM ((value->>'start_cycle')::text || '-01')::date))
        )
    )::int as remaining_installments,
    -- Parcelas já pagas
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
  AND emp.loans_data != 'null';

-- View: Resumo por colaborador
CREATE VIEW employee_loans_summary AS
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
WHERE (emp.loans_data IS NOT NULL AND emp.loans_data != '[]') OR emp.loan_amount IS NOT NULL;

-- View: Estatísticas gerais
CREATE VIEW loan_stats AS
SELECT
    COALESCE((SELECT SUM(original_value) FROM contracts_expanded), 0) as total_emprestado,
    COALESCE((SELECT SUM(installment_value * remaining_installments) FROM contracts_expanded WHERE remaining_installments > 0), 0) as saldo_devedor,
    COALESCE((SELECT SUM(installment_value * installments_paid) FROM contracts_expanded), 0) as total_recebido,
    COALESCE((SELECT SUM(installment_value) FROM contracts_expanded WHERE remaining_installments > 0), 0) as recebivel_mes,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments > 0), 0)::int as contratos_ativos,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments = 0), 0)::int as contratos_liquidados,
    COALESCE((SELECT MAX(value) FROM contracts_expanded), 0) as maior_emprestimo,
    COALESCE((SELECT employee_name || ' - OP. #' || operation_number FROM contracts_expanded ORDER BY value DESC LIMIT 1), '-') as maior_emprestimo_ref,
    -- Próximo a encerrar: contrato com menor data de término E ainda ativo
    COALESCE(
        (SELECT to_char(end_date, 'Mon/YY') FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY end_date ASC LIMIT 1),
        '-'
    ) as proximo_encerrar,
    -- Parcelas restantes do próximo
    COALESCE(
        (SELECT remaining_installments::int FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY end_date ASC LIMIT 1),
        0
    ) as parcelas_restantes;

-- View: Projeções com decaimento REAL
-- Cada mês mostra apenas os contratos que ainda estarão ativos naquele mês
CREATE VIEW loan_projections AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
        '1 month'::interval
    ) as month_date
)
SELECT 
    to_char(m.month_date, 'Mon/YY') as month,
    -- Total: soma das parcelas de contratos ATIVOS naquele mês específico
    COALESCE((
        SELECT SUM(ce.installment_value)
        FROM contracts_expanded ce
        WHERE ce.remaining_installments > 0
        -- Contrato está ativo se: data atual <= data de término
        AND m.month_date <= ce.end_date
        -- E já começou: data atual >= data de início
        AND m.month_date >= ce.start_date
    ), 0)::numeric as total,
    -- Previsto: 90% do total
    COALESCE((
        SELECT SUM(ce.installment_value) * 0.9
        FROM contracts_expanded ce
        WHERE ce.remaining_installments > 0
        AND m.month_date <= ce.end_date
        AND m.month_date >= ce.start_date
    ), 0)::numeric as previsto
FROM months m
ORDER BY m.month_date;

-- View: Contratos para exibição
CREATE VIEW contracts AS
SELECT 
    id,
    employee_id,
    start_date,
    value,
    (installment_value * remaining_installments) as balance,
    installments,
    installment_value,
    installments_paid,
    end_date as next_payment_date,
    end_date,
    status,
    description,
    operation_number,
    remaining_installments
FROM contracts_expanded;

COMMENT ON VIEW contracts_expanded IS 'Contratos com cálculos corretos de parcelas baseados em start_cycle';
COMMENT ON VIEW loan_projections IS 'Projeções mensais com decaimento real conforme contratos terminam';
