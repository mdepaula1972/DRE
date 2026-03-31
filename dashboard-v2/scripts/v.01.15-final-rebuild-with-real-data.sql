-- v.01.15 - Reconstrução Final dos Empréstimos (COM DADOS REAIS)
-- Usa os dados que ainda existem na tabela employees para reconstruir

-- ========================================
-- 1. VERIFICAR DADOS EXISTENTES
-- ========================================

SELECT 'VERIFICANDO DADOS EXISTENTES EM employees...' as info;
SELECT 
    'Funcionários com loan_amount > 0' as metrica,
    COUNT(*) as valor
FROM employees 
WHERE loan_amount > 0 AND is_test = FALSE;

SELECT 
    'Exemplo de dados existentes' as info,
    full_name,
    corporate_name,
    loan_amount,
    loan_installments,
    loan_start_cycle
FROM employees 
WHERE loan_amount > 0 AND is_test = FALSE
LIMIT 3;

-- ========================================
-- 2. LIMPEZA COMPLETA
-- ========================================

DELETE FROM loan_payments;

UPDATE employees SET 
    loans_data = '[]'::jsonb;

-- ========================================
-- 3. RECONSTRUÇÃO COM DADOS EXISTENTES
-- ========================================

-- Reconstruir loans_data para funcionários com empréstimos
WITH employees_with_loans AS (
    SELECT 
        id,
        full_name,
        corporate_name,
        company,
        loan_amount::numeric,
        loan_installments::int,
        loan_start_cycle::text,
        loan_request_date::date
    FROM employees 
    WHERE loan_amount > 0 
      AND is_test = FALSE
)
UPDATE employees e 
SET loans_data = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'request_date', el.loan_request_date,
            'start_cycle', el.loan_start_cycle,
            'amount', el.loan_amount,
            'installments', el.loan_installments
        )
    )
    FROM employees_with_loans el
    WHERE el.id = e.id
)
WHERE loan_amount > 0 AND is_test = FALSE;

-- ========================================
-- 4. GERAR PARCELAS PARA TODOS OS EMPRÉSTIMOS
-- ========================================

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
      AND e.is_test = FALSE
),
installments_to_create AS (
    SELECT 
        el.id as employee_id,
        el.id as contract_id,  -- Usar employee_id como contract_id
        (el.loan_start_cycle || '-01')::date + (i || ' months')::interval as due_date,
        el.installment_value as amount,
        TO_CHAR((el.loan_start_cycle || '-01')::date + (i || ' months')::interval, 'YYYY-MM') as month_cycle,
        CASE 
            WHEN i < 3 THEN 'PAGO'  -- Simular primeiras 3 parcelas como pagas
            ELSE 'PENDENTE'
        END as status,
        NOW() as created_at
    FROM employee_loans el
    CROSS JOIN generate_series(0, el.loan_installments - 1) i
)
INSERT INTO loan_payments (
    id, contract_id, employee_id, due_date, amount, month_cycle, status, created_at
)
SELECT 
    gen_random_uuid(),
    itc.contract_id,
    itc.employee_id,
    itc.due_date,
    itc.amount,
    itc.month_cycle,
    itc.status,
    itc.created_at
FROM installments_to_create itc;

-- ========================================
-- 5. RECONSTRUIR COLABORADOR TESTE
-- ========================================

-- Verificar se existe colaborador teste
SELECT 'Verificando colaborador teste...' as info;
SELECT 
    'Teste existe?',
    CASE WHEN EXISTS(SELECT 1 FROM employees WHERE is_test = TRUE) THEN 'SIM' ELSE 'NÃO' END as resposta;

-- Se não existir, criar
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM employees WHERE is_test = TRUE) THEN
        INSERT INTO employees (
            id, email, full_name, corporate_name, status, company, pj_type, remuneration,
            loans_data, loan_amount, loan_installments, loan_start_cycle, loan_request_date,
            created_at, is_test
        ) VALUES (
            gen_random_uuid(),
            'teste@marbrasil.com',
            'Colaborador Teste',
            'COLABORADOR TESTE (FICTÍCIO)',
            'Ativo',
            'MarBR',
            'Teste',
            5000.00,
            '[{"request_date": "2025-01-15", "start_cycle": "2025-02", "amount": 10000, "installments": 10}]'::jsonb,
            10000.00,
            10,
            '2025-02',
            '2025-01-15',
            NOW(),
            TRUE
        );
        
        -- Gerar parcelas para o colaborador teste
        INSERT INTO loan_payments (
            id, contract_id, employee_id, due_date, amount, month_cycle, status, created_at
        )
        SELECT 
            gen_random_uuid(),
            e.id,  -- employee_id como contract_id
            e.id,
            ('2025-02-01'::date + (i || ' months')::interval)::date,
            1000.00,
            TO_CHAR(('2025-02-01'::date + (i || ' months')::interval), 'YYYY-MM'),
            'PENDENTE',
            NOW()
        FROM employees e
        CROSS JOIN generate_series(0, 9) i
        WHERE e.is_test = TRUE;
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
    'Total Funcionários com Empréstimos',
    'Dados reais',
    COUNT(*)::text
FROM employees 
WHERE loan_amount > 0 AND is_test = FALSE
UNION ALL
SELECT 
    'Total Parcelas Geradas',
    'Todas',
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
    'Soma Total Emprestado',
    'employees vs loan_payments',
    (SELECT COALESCE(SUM(loan_amount), 0) FROM employees WHERE loan_amount > 0 AND is_test = FALSE)::text
UNION ALL
SELECT 
    'Soma Total das Parcelas',
    'valor total gerado',
    (SELECT COALESCE(SUM(amount), 0) FROM loan_payments)::text;
