-- SQL v9 - Sistema de pagamento manual com controle de parcelas

-- ========================================
-- 1. CRIAR TABELA DE PAGAMENTOS
-- ========================================

CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  month_cycle TEXT NOT NULL, -- ex: "2026-03" (ano-mês)
  due_date DATE NOT NULL,
  paid_date DATE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'PAGO', 'POSTERGADO'
  postponed_to DATE, -- nova data se postergado
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_loan_payments_contract ON loan_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_employee ON loan_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_month ON loan_payments(month_cycle);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON loan_payments(status);

-- ========================================
-- 2. FUNÇÃO PARA GERAR PARCELAS AUTOMATICAMENTE
-- ========================================

CREATE OR REPLACE FUNCTION generate_installments(p_contract_id UUID)
RETURNS VOID AS $$
DECLARE
  v_contract RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_installment_value NUMERIC;
  v_current_date DATE;
  v_month_count INT := 0;
BEGIN
  -- Buscar dados do contrato
  SELECT * INTO v_contract FROM contracts_expanded WHERE id = p_contract_id;
  
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;
  
  v_start_date := v_contract.start_date;
  v_installment_value := v_contract.installment_value;
  
  -- Gerar parcelas
  FOR i IN 0..(v_contract.installments - 1) LOOP
    v_current_date := v_start_date + (i || ' months')::interval;
    
    INSERT INTO loan_payments (contract_id, employee_id, month_cycle, due_date, amount, status)
    VALUES (
      p_contract_id,
      v_contract.employee_id,
      to_char(v_current_date, 'YYYY-MM'),
      v_current_date,
      v_installment_value,
      'PENDENTE'
    )
    ON CONFLICT DO NOTHING; -- Evita duplicatas
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. DROPAR VIEWS EXISTENTES
-- ========================================

DROP VIEW IF EXISTS loan_projections;
DROP VIEW IF EXISTS loan_stats;
DROP VIEW IF EXISTS employee_loans_summary;
DROP VIEW IF EXISTS contracts;
DROP VIEW IF EXISTS contracts_expanded;

-- ========================================
-- 4. VIEW: CONTRATOS EXPANDIDOS (com status baseado em pagamentos reais)
-- ========================================

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
    FROM employees emp
    WHERE emp.loan_amount IS NOT NULL 
      AND emp.loan_amount > 0
),
all_contracts AS (
    SELECT * FROM json_contracts
    UNION ALL
    SELECT * FROM field_contracts
),
-- Calcular estatísticas baseadas em pagamentos reais
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
    COALESCE(cs.installments_pending, ac.installments) as remaining_installments,
    COALESCE(cs.installments_postponed, 0) as installments_postponed,
    COALESCE(cs.total_received, 0) as total_received,
    COALESCE(cs.balance, ac.value) as balance,
    COALESCE(cs.next_due_date, ac.start_date) as next_payment_date,
    -- Status baseado em pagamentos reais
    CASE 
        WHEN COALESCE(cs.installments_pending, ac.installments) = 0 THEN 'LIQUIDADO'
        ELSE 'ATIVO'
    END as status
FROM all_contracts ac
LEFT JOIN contract_stats cs ON cs.contract_id = ac.id;

-- ========================================
-- 5. VIEWS RESTANTES (atualizadas)
-- ========================================

CREATE OR REPLACE VIEW employee_loans_summary AS
SELECT 
    emp.id as employee_id,
    emp.corporate_name as employee_name,
    emp.company,
    CASE WHEN emp.pj_type IS NOT NULL THEN 'PJ' ELSE 'CLT' END as link_type,
    0::numeric as remuneration,
    COALESCE((SELECT SUM(ce.value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_loaned,
    COALESCE((SELECT SUM(ce.total_received) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_received,
    COALESCE((SELECT SUM(ce.balance) FROM contracts_expanded ce WHERE ce.employee_id = emp.id), 0) as total_balance,
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0) as monthly_installment,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded ce WHERE ce.employee_id = emp.id AND ce.remaining_installments > 0), 0)::int as active_contracts,
    emp.status
FROM employees emp
WHERE (emp.loans_data IS NOT NULL AND emp.loans_data != '[]' AND emp.loans_data != 'null')
   OR (emp.loan_amount IS NOT NULL AND emp.loan_amount > 0);

CREATE OR REPLACE VIEW loan_stats AS
SELECT
    COALESCE((SUM(original_value)), 0) as total_emprestado,
    COALESCE((SUM(balance)), 0) as saldo_devedor,
    COALESCE((SUM(total_received)), 0) as total_recebido,
    COALESCE((SELECT SUM(installment_value) FROM contracts_expanded WHERE remaining_installments > 0), 0) as recebivel_mes,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments > 0), 0)::int as contratos_ativos,
    COALESCE((SELECT COUNT(*) FROM contracts_expanded WHERE remaining_installments = 0), 0)::int as contratos_liquidados,
    COALESCE((SELECT MAX(value) FROM contracts_expanded), 0) as maior_emprestimo,
    COALESCE((SELECT employee_name || ' - OP. #' || operation_number FROM contracts_expanded ORDER BY value DESC LIMIT 1), '-') as maior_emprestimo_ref,
    COALESCE((SELECT to_char(next_payment_date, 'DD/MM/YYYY') FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY next_payment_date ASC LIMIT 1), '-') as proximo_encerrar,
    COALESCE((SELECT remaining_installments::int FROM contracts_expanded WHERE remaining_installments > 0 ORDER BY next_payment_date ASC LIMIT 1), 0) as parcelas_restantes
FROM contracts_expanded;

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
    COALESCE((
        SELECT SUM(ce.installment_value) 
        FROM contracts_expanded ce 
        WHERE ce.remaining_installments > 0 
        AND EXISTS (
            SELECT 1 FROM loan_payments lp 
            WHERE lp.contract_id = ce.id 
            AND lp.month_cycle = to_char(m.month_date, 'YYYY-MM')
            AND lp.status = 'PENDENTE'
        )
    ), 0)::numeric as total,
    COALESCE((
        SELECT SUM(ce.installment_value) * 0.9 
        FROM contracts_expanded ce 
        WHERE ce.remaining_installments > 0 
        AND EXISTS (
            SELECT 1 FROM loan_payments lp 
            WHERE lp.contract_id = ce.id 
            AND lp.month_cycle = to_char(m.month_date, 'YYYY-MM')
            AND lp.status = 'PENDENTE'
        )
    ), 0)::numeric as previsto
FROM months m
ORDER BY m.month_date;

CREATE OR REPLACE VIEW contracts AS
SELECT 
    id, employee_id, start_date, value,
    balance,
    installments, installment_value, installments_paid,
    next_payment_date, end_date, status, description, operation_number, remaining_installments
FROM contracts_expanded;

-- ========================================
-- 6. TRIGGER PARA ATUALIZAR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loan_payments_updated_at ON loan_payments;
CREATE TRIGGER update_loan_payments_updated_at
BEFORE UPDATE ON loan_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
