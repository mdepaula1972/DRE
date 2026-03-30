-- SQL CORRIGIDO para views do dashboard de empréstimos
-- Correções: projeções reais, próximo encerramento dinâmico, cálculos corretos

-- View expandida: Contratos com datas calculadas
CREATE OR REPLACE VIEW contracts_expanded AS
SELECT 
    gen_random_uuid() as id,
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    (value->>'request_date')::date as start_date,
    (value->>'amount')::numeric as value,
    (value->>'amount')::numeric as original_value,
    (value->>'installments')::int as installments,
    (value->>'amount')::numeric / NULLIF((value->>'installments')::int, 0) as installment_value,
    -- Data de término calculada
    ((value->>'request_date')::date + ((value->>'installments')::int || ' months')::interval)::date as end_date,
    -- Parcelas restantes (simplificado: assume que começou no mês do request_date)
    GREATEST(0, (value->>'installments')::int - 
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, (value->>'request_date')::date))::int
    ) as remaining_installments,
    'ATIVO' as status,
    'Empréstimo ' || (value->>'start_cycle')::text as description,
    RIGHT(emp.id::text, 4) as operation_number,
    (value->>'start_cycle')::text as start_cycle
FROM employees emp,
jsonb_array_elements(COALESCE(emp.loans_data, '[]')::jsonb) as value
WHERE emp.loans_data IS NOT NULL 
  AND emp.loans_data != '[]'
  AND emp.loans_data != 'null';

-- View: Resumo de empréstimos por colaborador (CORRIGIDA)
CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    CASE 
        WHEN emp.pj_type IS NOT NULL THEN 'PJ'
        ELSE 'CLT'
    END as link_type,
    -- Remuneração (não existe campo específico, usando 0)
    0::numeric as remuneration,
    -- Total tomado: soma de todos os valores dos empréstimos
    COALESCE(
        (SELECT SUM(ce.value) 
         FROM contracts_expanded ce 
         WHERE ce.employee_id = emp.id),
        0
    ) as total_loaned,
    -- Total recebido: soma das parcelas já pagas
    COALESCE(
        (SELECT SUM(ce.installment_value * 
            GREATEST(0, ce.installments - ce.remaining_installments))
         FROM contracts_expanded ce 
         WHERE ce.employee_id = emp.id),
        0
    ) as total_received,
    -- Saldo devedor: soma das parcelas restantes
    COALESCE(
        (SELECT SUM(ce.installment_value * ce.remaining_installments)
         FROM contracts_expanded ce 
         WHERE ce.employee_id = emp.id),
        0
    ) as total_balance,
    -- Parcela mensal: soma das parcelas de todos os contratos ativos
    COALESCE(
        (SELECT SUM(ce.installment_value)
         FROM contracts_expanded ce 
         WHERE ce.employee_id = emp.id 
         AND ce.remaining_installments > 0),
        0
    ) as monthly_installment,
    -- Contratos ativos
    COALESCE(
        (SELECT COUNT(*) 
         FROM contracts_expanded ce 
         WHERE ce.employee_id = emp.id 
         AND ce.remaining_installments > 0),
        0
    )::int as active_contracts,
    emp.status
FROM employees emp
WHERE (emp.loans_data IS NOT NULL AND emp.loans_data != '[]')
   OR emp.loan_amount IS NOT NULL;

-- View: Estatísticas gerais (CORRIGIDA)
CREATE OR REPLACE VIEW loan_stats AS
SELECT
    -- Total emprestado (soma de todos os valores originais)
    COALESCE((SELECT SUM(original_value) FROM contracts_expanded), 0) as total_emprestado,
    
    -- Saldo devedor (soma dos saldos restantes)
    COALESCE(
        (SELECT SUM(installment_value * remaining_installments) 
         FROM contracts_expanded 
         WHERE remaining_installments > 0), 
        0
    ) as saldo_devedor,
    
    -- Total já recebido
    COALESCE(
        (SELECT SUM(installment_value * 
            GREATEST(0, installments - remaining_installments))
         FROM contracts_expanded),
        0
    ) as total_recebido,
    
    -- Recebível no mês atual (soma das parcelas de contratos ativos)
    COALESCE(
        (SELECT SUM(installment_value) 
         FROM contracts_expanded 
         WHERE remaining_installments > 0),
        0
    ) as recebivel_mes,
    
    -- Contratos ativos
    COALESCE(
        (SELECT COUNT(*) 
         FROM contracts_expanded 
         WHERE remaining_installments > 0),
        0
    ) as contratos_ativos,
    
    -- Contratos liquidados (sem parcelas restantes)
    COALESCE(
        (SELECT COUNT(*) 
         FROM contracts_expanded 
         WHERE remaining_installments = 0),
        0
    ) as contratos_liquidados,
    
    -- Maior empréstimo individual
    COALESCE(
        (SELECT MAX(value) FROM contracts_expanded),
        0
    ) as maior_emprestimo,
    
    -- Referência do maior empréstimo
    COALESCE(
        (SELECT employee_name || ' - OP. #' || operation_number
         FROM contracts_expanded 
         ORDER BY value DESC 
         LIMIT 1),
        '-'
    ) as maior_emprestimo_ref,
    
    -- Próximo a encerrar: contrato com menor data de término e ainda ativo
    COALESCE(
        (SELECT to_char(end_date, 'Mon/YY')
         FROM contracts_expanded 
         WHERE remaining_installments > 0
         ORDER BY end_date ASC 
         LIMIT 1),
        '-'
    ) as proximo_encerrar,
    
    -- Parcelas restantes do próximo a encerrar
    COALESCE(
        (SELECT remaining_installments::int
         FROM contracts_expanded 
         WHERE remaining_installments > 0
         ORDER BY end_date ASC 
         LIMIT 1),
        0
    ) as parcelas_restantes;

-- View: Projeções de recebimentos (CORRIGIDA - com decaimento real)
CREATE OR REPLACE VIEW loan_projections AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
        '1 month'::interval
    ) as month_date
),
contract_projections AS (
    SELECT 
        ce.id,
        ce.installment_value,
        ce.end_date,
        ce.remaining_installments,
        -- Calcular quantas parcelas serão pagas em cada mês futuro
        generate_series(
            0,
            GREATEST(0, ce.remaining_installments - 1)
        ) as month_offset
    FROM contracts_expanded ce
    WHERE ce.remaining_installments > 0
)
SELECT 
    to_char(m.month_date, 'Mon/YY') as month,
    COALESCE(
        (SELECT SUM(cp.installment_value)
         FROM contract_projections cp
         WHERE m.month_date <= (cp.end_date + INTERVAL '1 month')
         AND cp.month_offset = EXTRACT(MONTH FROM AGE(m.month_date, CURRENT_DATE))::int
         AND cp.month_offset < cp.remaining_installments),
        0
    )::numeric as total,
    -- Previsto: 90% do total (considerando inadimplência)
    COALESCE(
        (SELECT SUM(cp.installment_value) * 0.9
         FROM contract_projections cp
         WHERE m.month_date <= (cp.end_date + INTERVAL '1 month')
         AND cp.month_offset = EXTRACT(MONTH FROM AGE(m.month_date, CURRENT_DATE))::int
         AND cp.month_offset < cp.remaining_installments),
        0
    )::numeric as previsto
FROM months m
ORDER BY m.month_date;

-- View simplificada: Contratos para exibição
CREATE OR REPLACE VIEW contracts AS
SELECT 
    id,
    employee_id,
    start_date,
    value,
    (installment_value * remaining_installments) as balance,
    installments,
    installment_value,
    end_date as next_payment_date,
    status,
    description,
    operation_number,
    remaining_installments as installments_paid,
    end_date
FROM contracts_expanded;

-- Comentários
COMMENT ON VIEW contracts_expanded IS 'Contratos expandidos com cálculos de datas e parcelas';
COMMENT ON VIEW employee_loans_summary IS 'Resumo consolidado por colaborador (valores corrigidos)';
COMMENT ON VIEW loan_stats IS 'Estatísticas gerais (cálculos dinâmicos e corretos)';
COMMENT ON VIEW loan_projections IS 'Projeções mensais com decaimento real dos valores';
COMMENT ON VIEW contracts IS 'View pública de contratos para o frontend';
