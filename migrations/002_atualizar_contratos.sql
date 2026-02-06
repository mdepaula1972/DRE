-- ==================================================
-- SCRIPT DE ATUALIZAÇÃO DE CONTRATOS EXISTENTES
-- ==================================================
-- Este script atualiza os contratos existentes com valores padrão
-- para os novos campos de impostos

-- IMPORTANTE: Ajuste os valores conforme a realidade de cada contrato!

-- Opção 1: Atualizar TODOS os contratos com valores padrão
-- (2.5% ISS, sem ICMS, sem faturamento por equipamentos)
UPDATE contratos_base
SET 
    tem_iss = true,
    aliquota_iss = 2.5,
    tem_icms = false,
    aliquota_icms = 0,
    contrato_por_equipamentos = false
WHERE tem_iss IS NULL;  -- Apenas contratos que ainda não foram atualizados

-- Opção 2: Atualizar contratos específicos por nome
-- Substitua 'NOME_DO_CONTRATO' pelo nome real do contrato

-- Exemplo: Contrato com ISS 2.5% e sem ICMS
UPDATE contratos_base
SET 
    tem_iss = true,
    aliquota_iss = 2.5,
    tem_icms = false,
    aliquota_icms = 0,
    contrato_por_equipamentos = false
WHERE nome_contrato = 'NOME_DO_CONTRATO' AND tem_iss IS NULL;

-- Exemplo: Contrato com ISS 3% e ICMS 12%
/*
UPDATE contratos_base
SET 
    tem_iss = true,
    aliquota_iss = 3.0,
    tem_icms = true,
    aliquota_icms = 12.0,
    contrato_por_equipamentos = false
WHERE nome_contrato = 'OUTRO_CONTRATO' AND tem_iss IS NULL;
*/

-- Exemplo: Contrato faturado por equipamentos
/*
UPDATE contratos_base
SET 
    tem_iss = true,
    aliquota_iss = 2.5,
    tem_icms = false,
    aliquota_icms = 0,
    contrato_por_equipamentos = true
WHERE nome_contrato = 'CONTRATO_EQUIPAMENTOS' AND tem_iss IS NULL;
*/

-- ==================================================
-- VERIFICAÇÃO: Ver todos os contratos e seus impostos
-- ==================================================
SELECT 
    id,
    nome_contrato,
    tem_iss,
    aliquota_iss,
    tem_icms,
    aliquota_icms,
    contrato_por_equipamentos,
    ativo
FROM contratos_base
ORDER BY nome_contrato;
