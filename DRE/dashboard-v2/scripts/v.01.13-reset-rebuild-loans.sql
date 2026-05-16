-- v.01.13 - Reset e Reestruturação Completa dos Empréstimos
-- ATENÇÃO: Este script vai APAGAR e RECONSTRUIR todos os dados de empréstimos
-- Execute com cuidado e faça backup antes se necessário

-- ========================================
-- 1. BACKUP DOS DADOS ATUAIS (OPCIONAL)
-- ========================================

-- Criar tabela de backup antes de apagar
CREATE TABLE IF NOT EXISTS loan_payments_backup AS 
SELECT * FROM loan_payments;

CREATE TABLE IF NOT EXISTS employees_loan_backup AS 
SELECT 
    id, full_name, corporate_name, company, status, pj_type, remuneration,
    loans_data, loan_amount, loan_installments, loan_start_cycle, 
    loan_request_date, created_at, is_test
FROM employees;

-- ========================================
-- 2. LIMPEZA COMPLETA DOS DADOS DE EMPRÉSTIMOS
-- ========================================

-- Apagar todas as parcelas
DELETE FROM loan_payments;

-- Resetar campos de empréstimos na tabela employees
UPDATE employees SET 
    loan_amount = NULL,
    loan_installments = NULL,
    loan_start_cycle = NULL,
    loan_request_date = NULL,
    loans_data = '[]'::jsonb;

-- ========================================
-- 3. RECONSTRUÇÃO AUTOMÁTICA DOS EMPRÉSTIMOS
-- ========================================

-- Identificar funcionários que tinham empréstimos (baseado no backup)
WITH employees_with_loans AS (
    SELECT DISTINCT id 
    FROM employees_loan_backup 
    WHERE loan_amount > 0 
      AND is_test = FALSE
),
-- Reconstruir dados para cada funcionário
reconstruction AS (
    SELECT 
        e.id as employee_id,
        COALESCE(NULLIF(TRIM(e.full_name), ''), e.corporate_name) as employee_name,
        e.company,
        e.loan_amount::numeric as loan_amount,
        e.loan_installments::int as loan_installments,
        e.loan_start_cycle::text as loan_start_cycle,
        e.loan_request_date::date as loan_request_date,
        ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY e.loan_request_date) as loan_sequence
    FROM employees e
    JOIN employees_with_loans ewl ON e.id = ewl.id
    WHERE e.loan_amount > 0
),
-- Gerar loans_data corretamente
loans_data_reconstruction AS (
    SELECT 
        r.employee_id,
        jsonb_build_object(
            'request_date', r.loan_request_date,
            'start_cycle', r.loan_start_cycle,
            'amount', r.loan_amount,
            'installments', r.loan_installments
        ) as loan_item
    FROM reconstruction r
)
-- Atualizar employees com loans_data correto
UPDATE employees e 
SET loans_data = (
    SELECT jsonb_agg(ld.loan_item)
    FROM loans_data_reconstruction ld
    WHERE ld.employee_id = e.id
)
WHERE EXISTS (
    SELECT 1 FROM loans_data_reconstruction ld 
    WHERE ld.employee_id = e.id
);

-- ========================================
-- 4. RECONSTRUÇÃO AUTOMÁTICA DAS PARCELAS
-- ========================================

-- Gerar parcelas para todos os empréstimos
WITH employee_loans AS (
    SELECT 
        e.id,
        e.loan_amount,
        e.loan_installments,
        e.loan_start_cycle,
        e.loan_request_date,
        COALESCE(e.loan_amount, 0) / NULLIF(e.loan_installments, 0) as installment_value
    FROM employees e
    WHERE e.loan_amount > 0
      AND e.loan_installments > 0
),
installments_to_create AS (
    SELECT 
        el.id as employee_id,
        el.id as contract_id,  -- Usar employee_id como contract_id
        (el.loan_start_cycle || '-01')::date + (i || ' months')::interval as due_date,
        el.installment_value as amount,
        TO_CHAR((el.loan_start_cycle || '-01')::date + (i || ' months')::interval, 'YYYY-MM') as month_cycle,
        CASE 
            WHEN i = 0 THEN 'PAGO'
            ELSE 'PENDENTE'
        END as status,
        CASE 
            WHEN i = 0 THEN el.loan_request_date
            ELSE NULL
        END as payment_date,
        CASE 
            WHEN i = 0 THEN 'BANCO'
            ELSE NULL
        END as payment_method,
        NOW() as created_at
    FROM employee_loans el
    CROSS JOIN generate_series(0, el.loan_installments - 1) i
)
-- Inserir todas as parcelas
INSERT INTO loan_payments (
    id, contract_id, employee_id, due_date, amount, month_cycle, 
    status, payment_date, payment_method, created_at
)
SELECT 
    gen_random_uuid(),
    itc.contract_id,
    itc.employee_id,
    itc.due_date,
    itc.amount,
    itc.month_cycle,
    itc.status,
    itc.payment_date,
    itc.payment_method,
    itc.created_at
FROM installments_to_create itc;

-- ========================================
-- 5. RECONSTRUÇÃO DO COLABORADOR TESTE (SE EXISTIR)
-- ========================================

-- Verificar se existia colaborador teste antes
DO $$
DECLARE
    v_has_test BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM employees_loan_backup 
        WHERE is_test = TRUE 
        LIMIT 1
    ) INTO v_has_test;
    
    IF v_has_test THEN
        -- Recriar colaborador teste
        PERFORM create_test_employee();
    END IF;
END $$;

-- ========================================
-- 6. VERIFICAÇÃO FINAL
-- ========================================

SELECT 
    'VERIFICAÇÃO FINAL' as secao,
    ' ' as detalhe,
    ' ' as valor
UNION ALL
SELECT 
    'Total Funcionários',
    'Com empréstimos reconstruídos',
    COUNT(*)::text
FROM employees 
WHERE loan_amount > 0 AND is_test = FALSE
UNION ALL
SELECT 
    'Total Parcelas Geradas',
    'Para todos os empréstimos',
    COUNT(*)::text
FROM loan_payments
UNION ALL
SELECT 
    'Parcelas Pagas',
    'Status PAGO',
    COUNT(*) FILTER (WHERE status = 'PAGO')::text
FROM loan_payments
UNION ALL
SELECT 
    'Parcelas Pendentes',
    'Status PENDENTE',
    COUNT(*) FILTER (WHERE status = 'PENDENTE')::text
FROM loan_payments
UNION ALL
SELECT 
    'Colaborador Teste',
    'Recriado se existia',
    CASE WHEN EXISTS(SELECT 1 FROM employees WHERE is_test = TRUE) THEN 'SIM' ELSE 'NÃO' END;

-- ========================================
-- 7. LIMPEZA DOS BACKUPS (OPCIONAL)
-- ========================================

-- Descomente as linhas abaixo se quiser apagar os backups após verificação
-- DROP TABLE IF EXISTS loan_payments_backup;
-- DROP TABLE IF EXISTS employees_loan_backup;
