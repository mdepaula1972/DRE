-- ==================================================
-- VERIFICAR E CORRIGIR CONTRATOS
-- ==================================================

-- 1. Ver todos os contratos e seu status
SELECT 
    id,
    nome_contrato,
    ativo,
    tem_iss,
    aliquota_iss,
    tem_icms,
    aliquota_icms,
    contrato_por_equipamentos
FROM contratos_base
ORDER BY nome_contrato;

-- 2. Ativar TODOS os contratos (se estiverem inativos)
UPDATE contratos_base
SET ativo = true
WHERE ativo IS NULL OR ativo = false;

-- 3. Garantir que os novos campos tenham valores padrão
UPDATE contratos_base
SET 
    tem_iss = COALESCE(tem_iss, false),
    aliquota_iss = COALESCE(aliquota_iss, 0),
    tem_icms = COALESCE(tem_icms, false),
    aliquota_icms = COALESCE(aliquota_icms, 0),
    contrato_por_equipamentos = COALESCE(contrato_por_equipamentos, false)
WHERE tem_iss IS NULL 
   OR aliquota_iss IS NULL 
   OR tem_icms IS NULL 
   OR aliquota_icms IS NULL 
   OR contrato_por_equipamentos IS NULL;

-- 4. Verificar resultado final
SELECT 
    COUNT(*) as total_contratos,
    COUNT(*) FILTER (WHERE ativo = true) as contratos_ativos,
    COUNT(*) FILTER (WHERE tem_iss = true) as com_iss,
    COUNT(*) FILTER (WHERE tem_icms = true) as com_icms,
    COUNT(*) FILTER (WHERE contrato_por_equipamentos = true) as por_equipamentos
FROM contratos_base;

-- 5. Listar contratos ativos (estes devem aparecer na página)
SELECT 
    id,
    nome_contrato,
    numero_contrato,
    ativo,
    tem_iss,
    aliquota_iss,
    tem_icms,
    aliquota_icms,
    contrato_por_equipamentos
FROM contratos_base
WHERE ativo = true
ORDER BY nome_contrato;
