-- v.01.10 - Diagnóstico de dados em contracts_expanded
-- Verificar porque saldo, recebido e outras colunas estão zeradas

-- 1. Verificar se contracts_expanded está retornando dados
SELECT 'contracts_expanded total' as info, COUNT(*) as valor FROM contracts_expanded;

-- 2. Verificar se contracts_expanded tem os campos calculados preenchidos
SELECT 
    'Campos calculados preenchidos' as info,
    COUNT(*) FILTER (WHERE total_received > 0) as com_recebido,
    COUNT(*) FILTER (WHERE balance > 0) as com_saldo,
    COUNT(*) FILTER (WHERE installments_paid > 0) as com_parcelas_pagas,
    COUNT(*) total_contratos
FROM contracts_expanded;

-- 3. Verificar se loan_payments tem dados vinculados aos contratos
SELECT 
    'loan_payments vinculados' as info,
    COUNT(*) as total,
    COUNT(DISTINCT contract_id) as contratos_distintos,
    COUNT(DISTINCT employee_id) as funcionarios_distintos
FROM loan_payments;

-- 4. Verificar se os IDs de contrato batem
SELECT 
    'Mapeamento contrato-parcela' as info,
    ce.id as contract_id,
    ce.employee_id,
    COUNT(lp.id) as parcelas_encontradas
FROM contracts_expanded ce
LEFT JOIN loan_payments lp ON lp.contract_id = ce.id
GROUP BY ce.id, ce.employee_id
ORDER BY parcelas_encontradas DESC
LIMIT 10;

-- 5. Verificar se o problema é que contract_id na loan_payments é diferente
-- Os dados foram inseridos via generate_installments que usava o employee_id como contract_id
-- Mas contracts_expanded gera IDs aleatórios com gen_random_uuid()

-- Verificar um contrato específico e suas parcelas
WITH um_contrato AS (
    SELECT id, employee_id, employee_name 
    FROM contracts_expanded 
    LIMIT 1
)
SELECT 
    uc.employee_name,
    uc.id as contract_id,
    uc.employee_id,
    lp.id as parcela_id,
    lp.contract_id as parcela_contract_id,
    lp.employee_id as parcela_employee_id,
    lp.status
FROM um_contrato uc
LEFT JOIN loan_payments lp ON lp.employee_id = uc.employee_id
LIMIT 5;
