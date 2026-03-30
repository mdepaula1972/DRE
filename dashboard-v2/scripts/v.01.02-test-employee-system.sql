-- v.01.02 - Simplificação: Colaborador Teste com Revert
-- Estratégia: Um colaborador fictício nas tabelas originais, com capacidade de revert

-- ========================================
-- 1. ADICIONAR FLAG DE TESTE
-- ========================================

-- Adicionar coluna is_test se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'employees' AND column_name = 'is_test') THEN
        ALTER TABLE employees ADD COLUMN is_test BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_employees_is_test ON employees(is_test) WHERE is_test = TRUE;

-- ========================================
-- 2. CRIAR COLABORADOR TESTE
-- ========================================

-- Função para criar colaborador teste
CREATE OR REPLACE FUNCTION create_test_employee()
RETURNS UUID AS $$
DECLARE
    v_employee_id UUID;
    v_contract_id UUID;
BEGIN
    -- Gerar ID único
    v_employee_id := gen_random_uuid();
    
    -- Inserir colaborador teste
    INSERT INTO employees (
        id,
        email,
        full_name,
        corporate_name,
        status,
        company,
        pj_type,
        remuneration,
        loans_data,
        loan_amount,
        loan_installments,
        loan_start_cycle,
        loan_request_date,
        created_at,
        is_test
    ) VALUES (
        v_employee_id,
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
    
    -- Buscar o ID do contrato criado
    SELECT id INTO v_contract_id 
    FROM contracts_expanded 
    WHERE employee_id = v_employee_id 
    LIMIT 1;
    
    -- Gerar parcelas se contrato encontrado
    IF v_contract_id IS NOT NULL THEN
        PERFORM generate_installments(v_contract_id);
    END IF;
    
    RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. SISTEMA DE AUDIT/HISTÓRICO PARA REVERT
-- ========================================

-- Tabela de histórico de operações (se não existir)
CREATE TABLE IF NOT EXISTS loan_operations_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL, -- 'PAYMENT', 'POSTPONE', 'ANTICIPATE', 'REVERT'
    contract_id UUID,
    employee_id UUID,
    payment_ids UUID[], -- IDs das parcelas afetadas
    previous_status TEXT, -- Status anterior (para revert)
    new_status TEXT, -- Novo status
    previous_due_date DATE, -- Data anterior (para postergação)
    new_due_date DATE, -- Nova data
    amount NUMERIC,
    performed_by TEXT,
    performed_at TIMESTAMP DEFAULT NOW(),
    reverted_at TIMESTAMP,
    reverted_by TEXT,
    is_reverted BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_loan_operations_contract ON loan_operations_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_loan_operations_employee ON loan_operations_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_operations_is_reverted ON loan_operations_history(is_reverted);

-- ========================================
-- 4. FUNÇÃO DE REVERT
-- ========================================

CREATE OR REPLACE FUNCTION revert_operation(p_operation_id UUID, p_reverted_by TEXT DEFAULT 'system')
RETURNS BOOLEAN AS $$
DECLARE
    v_operation RECORD;
    v_payment_id UUID;
BEGIN
    -- Buscar operação
    SELECT * INTO v_operation FROM loan_operations_history 
    WHERE id = p_operation_id AND is_reverted = FALSE;
    
    IF v_operation IS NULL THEN
        RAISE EXCEPTION 'Operação não encontrada ou já revertida';
    END IF;
    
    -- Reverter conforme tipo
    CASE v_operation.operation_type
        WHEN 'PAYMENT' THEN
            -- Voltar parcelas para PENDENTE
            UPDATE loan_payments 
            SET status = 'PENDENTE', 
                paid_at = NULL,
                updated_at = NOW()
            WHERE id = ANY(v_operation.payment_ids);
            
        WHEN 'POSTPONE' THEN
            -- Voltar data original
            UPDATE loan_payments 
            SET due_date = v_operation.previous_due_date,
                status = v_operation.previous_status,
                updated_at = NOW()
            WHERE id = ANY(v_operation.payment_ids);
            
        WHEN 'ANTICIPATE' THEN
            -- Remover pagamentos antecipados (marcar como PENDENTE novamente)
            UPDATE loan_payments 
            SET status = 'PENDENTE',
                paid_at = NULL,
                updated_at = NOW()
            WHERE id = ANY(v_operation.payment_ids);
    END CASE;
    
    -- Marcar operação como revertida
    UPDATE loan_operations_history 
    SET is_reverted = TRUE,
        reverted_at = NOW(),
        reverted_by = p_reverted_by
    WHERE id = p_operation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. FUNÇÃO PARA REMOVER DADOS DE TESTE
-- ========================================

CREATE OR REPLACE FUNCTION remove_test_data()
RETURNS TEXT AS $$
DECLARE
    v_count_payments INTEGER;
    v_count_operations INTEGER;
    v_employee_id UUID;
BEGIN
    -- Buscar colaborador teste
    SELECT id INTO v_employee_id FROM employees WHERE is_test = TRUE LIMIT 1;
    
    IF v_employee_id IS NULL THEN
        RETURN 'Nenhum colaborador teste encontrado';
    END IF;
    
    -- Remover pagamentos de teste
    DELETE FROM loan_payments WHERE employee_id = v_employee_id;
    GET DIAGNOSTICS v_count_payments = ROW_COUNT;
    
    -- Remover operações de histórico de teste
    DELETE FROM loan_operations_history WHERE employee_id = v_employee_id;
    GET DIAGNOSTICS v_count_operations = ROW_COUNT;
    
    -- Remover colaborador teste
    DELETE FROM employees WHERE id = v_employee_id;
    
    RETURN format('Removido: %s parcelas, %s operações, 1 colaborador teste', 
                  v_count_payments, v_count_operations);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. ATUALIZAR VIEWS PARA EXCLUIR TESTE DOS TOTAIS
-- ========================================

-- Atualizar view employee_loans_summary (adicionar filtro is_test)
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
    COALESCE((SELECT SUM(ce.installment_value) FROM contracts_expanded ce 
              WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO'), 0) as monthly_installment,
    (SELECT COUNT(*) FROM contracts_expanded ce 
     WHERE ce.employee_id = emp.id AND ce.status = 'ATIVO')::int as active_contracts,
    emp.status,
    COALESCE(emp.is_test, FALSE) as is_test
FROM employees emp
WHERE emp.is_test = FALSE OR emp.is_test IS NULL; -- Excluir teste dos totais

-- ========================================
-- 7. VIEW ESPECÍFICA PARA VER DADOS DE TESTE
-- ========================================

CREATE OR REPLACE VIEW test_data_only AS
SELECT 
    emp.*,
    COALESCE((SELECT COUNT(*) FROM loan_payments lp WHERE lp.employee_id = emp.id), 0) as total_payments
FROM employees emp
WHERE emp.is_test = TRUE;

-- ========================================
-- COMANDOS ÚTEIS
-- ========================================

-- Criar colaborador teste:
-- SELECT create_test_employee();

-- Ver dados de teste:
-- SELECT * FROM test_data_only;

-- Reverter uma operação:
-- SELECT revert_operation('UUID_DA_OPERACAO', 'usuario');

-- Ver histórico de operações:
-- SELECT * FROM loan_operations_history WHERE is_reverted = FALSE ORDER BY performed_at DESC;

-- Remover todos os dados de teste:
-- SELECT remove_test_data();

-- ========================================
-- FIM
-- ========================================
