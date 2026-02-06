-- ==================================================
-- CORRIGIR POLÍTICAS RLS - CONTRATOS_BASE
-- ==================================================

-- Opção 1: DESABILITAR RLS temporariamente (para teste)
-- ATENÇÃO: Isso remove toda proteção da tabela!
-- ALTER TABLE contratos_base DISABLE ROW LEVEL SECURITY;

-- Opção 2: CRIAR POLÍTICA PERMISSIVA (RECOMENDADO)
-- Permite leitura total, mas mantém controle em updates/deletes

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de contratos" ON contratos_base;
DROP POLICY IF EXISTS "Permitir todas operações em contratos" ON contratos_base;

-- Criar nova política permissiva para leitura
CREATE POLICY "Permitir leitura de contratos para todos"
ON contratos_base
FOR SELECT
USING (true);  -- Permite ler todos os contratos

-- Criar política para insert/update/delete (apenas autenticados)
CREATE POLICY "Permitir modificações para autenticados"
ON contratos_base
FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==================================================
-- VERIFICAR POLÍTICAS ATIVAS
-- ==================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contratos_base';

-- ==================================================
-- VERIFICAR STATUS DO RLS
-- ==================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_ativado
FROM pg_tables
WHERE tablename = 'contratos_base';
