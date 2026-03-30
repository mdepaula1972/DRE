-- SQL v9-test - Ambiente de teste isolado (cópia segura dos dados)

-- ========================================
-- 1. CRIAR TABELA DE TESTE (cópia da employees)
-- ========================================

-- Criar tabela de teste com mesma estrutura
CREATE TABLE IF NOT EXISTS employees_test (
  id UUID PRIMARY KEY,
  email TEXT,
  corporate_name TEXT,
  status TEXT,
  company TEXT,
  pj_type TEXT,
  remuneration NUMERIC,
  loans_data TEXT,
  loan_amount NUMERIC,
  loan_installments INTEGER,
  loan_start_cycle TEXT,
  loan_request_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- ========================================
-- 2. COPIAR DADOS DA TABELA ORIGINAL
-- ========================================

-- Limpar dados de teste anteriores (se existirem)
TRUNCATE TABLE employees_test;

-- Copiar todos os dados da employees para employees_test
INSERT INTO employees_test (
  id, email, corporate_name, status, company, 
  pj_type, remuneration, loans_data, loan_amount, 
  loan_installments, loan_start_cycle, loan_request_date, 
  created_at, updated_at
)
SELECT 
  id, email, corporate_name, status, company, 
  pj_type, remuneration, loans_data, loan_amount, 
  loan_installments, loan_start_cycle, loan_request_date, 
  created_at, updated_at
FROM employees;

-- Verificar quantidade de registros copiados
-- SELECT COUNT(*) as total_copied FROM employees_test;

-- ========================================
-- 3. CRIAR TABELA DE PAGAMENTOS DE TESTE
-- ========================================

CREATE TABLE IF NOT EXISTS loan_payments_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  month_cycle TEXT NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  postponed_to DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_loan_payments_test_contract ON loan_payments_test(contract_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_test_employee ON loan_payments_test(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_test_month ON loan_payments_test(month_cycle);
CREATE INDEX IF NOT EXISTS idx_loan_payments_test_status ON loan_payments_test(status);

-- ========================================
-- 4. FUNÇÃO PARA GERAR PARCELAS (VERSÃO TESTE)
-- ========================================

CREATE OR REPLACE FUNCTION generate_installments_test(p_contract_id UUID)
RETURNS VOID AS $$
DECLARE
  v_contract RECORD;
  v_start_date DATE;
  v_installment_value NUMERIC;
  v_current_date DATE;
BEGIN
  SELECT * INTO v_contract FROM contracts_expanded_test WHERE id = p_contract_id;
  
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;
  
  v_start_date := v_contract.start_date;
  v_installment_value := v_contract.installment_value;
  
  FOR i IN 0..(v_contract.total_installments - 1) LOOP
    v_current_date := v_start_date + (i || ' months')::interval;
    
    INSERT INTO loan_payments_test (contract_id, employee_id, month_cycle, due_date, amount, status)
    VALUES (
      p_contract_id,
      v_contract.employee_id,
      to_char(v_current_date, 'YYYY-MM'),
      v_current_date,
      v_installment_value,
      'PENDENTE'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. VIEWS DE TESTE (apontando para employees_test)
-- ========================================

DROP VIEW IF EXISTS loan_projections_test;
DROP VIEW IF EXISTS loan_stats_test;
DROP VIEW IF EXISTS employee_loans_summary_test;
DROP VIEW IF EXISTS contracts_test;
DROP VIEW IF EXISTS contracts_expanded_test;

-- View: Contratos expandidos (VERSÃO TESTE)
CREATE OR REPLACE VIEW contracts_expanded_test AS
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
        (((value->>'start_cycle')::text || '-01')::date + (((value->>'installments')::int - 1) || ' months')::interval)::date as end_date,
        (value->>'installments')::int as total_installments,
        RIGHT(emp.id::text, 4) as operation_number,
        'Empréstimo ' || (value->>'start_cycle')::text as description
    FROM employees_test emp,
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
        ((emp.loan_start_cycle || '-01')::date + ((emp.loan_installments - 1) || ' months')::interval)::date as end_date,
        emp.loan_installments as total_installments,
        RIGHT(emp.id::text, 4) as operation_number,
        'Empréstimo ' || emp.loan_start_cycle::text as description
    FROM employees_test emp
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
    LEFT JOIN loan_payments_test lp ON lp.contract_id = ac.id
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

-- View: Resumo de funcionários (VERSÃO TESTE)
CREATE OR REPLACE VIEW employee_loans_summary_test AS
SELECT 
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    CASE WHEN emp.pj_type IS NOT NULL THEN 'PJ' ELSE 'CLT' END as link_type,
    0::numeric as remuneration,
    COALESCE((SELECT SUM(ce.value) FROM contracts_expanded_test ce WHERE ce.employee_id = emp.id), 0) as total_loaned,
    COALESCE((SELECT SUM(ce.total_received) FROM contracts_expanded_test ce WHERE ce.employee_id = emp.id), 0) as total_received,
    COALESCE((SELECT SUM(ce.balance) FROM contracts_expanded_test ce WHERE ce.employee_id = emp.id), 0) as total_balance,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded_test ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0) as monthly_installment,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded_test ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0)::int as active_contracts,
    emp.status
FROM employees_test emp
WHERE (emp.loans_data IS NOT NULL AND emp.loans_data != '[]' AND emp.loans_data != 'null')
   OR (emp.loan_amount IS NOT NULL AND emp.loan_amount > 0);

-- View: Estatísticas (VERSÃO TESTE)
CREATE OR REPLACE VIEW loan_stats_test AS
SELECT
    COALESCE((SUM(original_value)), 0) as total_emprestado,
    COALESCE((SUM(balance)), 0) as saldo_devedor,
    COALESCE((SUM(total_received)), 0) as total_recebido,
    COALESCE((SELECT SUM(installment_value) FROM contracts_expanded_test WHERE remaining_installments > 0), 0) as recebivel_mes,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded_test WHERE remaining_installments > 0), 0)::int as contratos_ativos,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded_test WHERE remaining_installments = 0), 0)::int as contratos_liquidados,
    COALESCE((SELECT MAX(value) FROM contracts_expanded_test), 0) as maior_emprestimo,
    COALESCE((SELECT employee_name || ' - OP. #' || operation_number FROM contracts_expanded_test ORDER BY value DESC LIMIT 1), '-') as maior_emprestimo_ref,
    COALESCE((SELECT to_char(next_payment_date, 'DD/MM/YYYY') FROM contracts_expanded_test WHERE remaining_installments > 0 ORDER BY next_payment_date ASC LIMIT 1), '-') as proximo_encerrar,
    COALESCE((SELECT remaining_installments::int FROM contracts_expanded_test WHERE remaining_installments > 0 ORDER BY next_payment_date ASC LIMIT 1), 0) as parcelas_restantes
FROM contracts_expanded_test;

-- View: Projeções (VERSÃO TESTE)
CREATE OR REPLACE VIEW loan_projections_test AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '11 months',
        '1 month'::interval
    ) as month_date
)
SELECT 
    to_char(m.month_date, 'Mon/YY') as month,
    COALESCE((
        SELECT SUM(ce.installment_value) 
        FROM contracts_expanded_test ce 
        WHERE ce.remaining_installments > 0 
        AND EXISTS (
            SELECT 1 FROM loan_payments_test lp 
            WHERE lp.contract_id = ce.id 
            AND lp.month_cycle = to_char(m.month_date, 'YYYY-MM')
            AND lp.status = 'PENDENTE'
        )
    ), 0)::numeric as total,
    COALESCE((
        SELECT SUM(ce.installment_value) * 0.9 
        FROM contracts_expanded_test ce 
        WHERE ce.remaining_installments > 0 
        AND EXISTS (
            SELECT 1 FROM loan_payments_test lp 
            WHERE lp.contract_id = ce.id 
            AND lp.month_cycle = to_char(m.month_date, 'YYYY-MM')
            AND lp.status = 'PENDENTE'
        )
    ), 0)::numeric as previsto
FROM months m
ORDER BY m.month_date;

-- View: Contratos (VERSÃO TESTE)
CREATE OR REPLACE VIEW contracts_test AS
SELECT 
    id, employee_id, start_date, value,
    balance,
    installments, installment_value, installments_paid,
    next_payment_date, end_date, status, description, operation_number, remaining_installments
FROM contracts_expanded_test;

-- ========================================
-- 6. TRIGGER PARA ATUALIZAR updated_at (VERSÃO TESTE)
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loan_payments_test_updated_at ON loan_payments_test;
CREATE TRIGGER update_loan_payments_test_updated_at
BEFORE UPDATE ON loan_payments_test
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMANDOS PARA TROCAR ENTRE TESTE E PRODUÇÃO
-- ========================================

-- Para usar dados de TESTE no frontend (rode após criar views de teste):
-- 1. Renomear views de produção para _prod
-- 2. Renomear views de teste para nome original

-- Exemplo de troca:
/*
-- Trocar para TESTE:
ALTER VIEW contracts_expanded RENAME TO contracts_expanded_prod;
ALTER VIEW contracts_expanded_test RENAME TO contracts_expanded;
ALTER VIEW employee_loans_summary RENAME TO employee_loans_summary_prod;
ALTER VIEW employee_loans_summary_test RENAME TO employee_loans_summary;
ALTER VIEW loan_stats RENAME TO loan_stats_prod;
ALTER VIEW loan_stats_test RENAME TO loan_stats;
ALTER VIEW loan_projections RENAME TO loan_projections_prod;
ALTER VIEW loan_projections_test RENAME TO loan_projections;
ALTER VIEW contracts RENAME TO contracts_prod;
ALTER VIEW contracts_test RENAME TO contracts;

-- Trocar de volta para PRODUÇÃO:
ALTER VIEW contracts_expanded RENAME TO contracts_expanded_test;
ALTER VIEW contracts_expanded_prod RENAME TO contracts_expanded;
ALTER VIEW employee_loans_summary RENAME TO employee_loans_summary_test;
ALTER VIEW employee_loans_summary_prod RENAME TO employee_loans_summary;
ALTER VIEW loan_stats RENAME TO loan_stats_test;
ALTER VIEW loan_stats_prod RENAME TO loan_stats;
ALTER VIEW loan_projections RENAME TO loan_projections_test;
ALTER VIEW loan_projections_prod RENAME TO loan_projections;
ALTER VIEW contracts RENAME TO contracts_test;
ALTER VIEW contracts_prod RENAME TO contracts;
*/
