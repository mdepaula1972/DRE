-- ============================================================
-- MIGRATION: Sistema de Gestão Integrada de Faturamento
-- Data: 2026-02-06
-- Descrição: Cria tabelas para NFs, impostos trimestrais
--            e estende contratos_base com campos de impostos
-- ============================================================

-- ====================
-- 1. ATUALIZAR contratos_base
-- ====================

-- Adicionar campos de configuração de impostos
ALTER TABLE contratos_base 
  ADD COLUMN IF NOT EXISTS tem_iss boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS aliquota_iss numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tem_icms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS aliquota_icms numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contrato_por_equipamentos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_contratos_ativo ON contratos_base(ativo) WHERE ativo = true;

COMMENT ON COLUMN contratos_base.tem_iss IS 'Indica se o contrato tem retenção de ISS';
COMMENT ON COLUMN contratos_base.aliquota_iss IS 'Alíquota de ISS em % (ex: 2.50 para 2.5%)';
COMMENT ON COLUMN contratos_base.tem_icms IS 'Indica se o contrato tem retenção de ICMS';
COMMENT ON COLUMN contratos_base.aliquota_icms IS 'Alíquota de ICMS em % (ex: 12.00 para 12%)';
COMMENT ON COLUMN contratos_base.contrato_por_equipamentos IS 'Indica se o faturamento é por número de equipamentos';

-- ====================
-- 2. CRIAR TABELA notas_fiscais
-- ====================

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com contrato
  contrato_id uuid REFERENCES contratos_base(id) ON DELETE CASCADE NOT NULL,
  
  -- Dados da Nota Fiscal
  numero_nf text NOT NULL,
  data_emissao date NOT NULL,
  competencia text NOT NULL,  -- Formato: "2026-01" (YYYY-MM)
  
  -- Valores Base
  valor_faturado numeric(12,2) NOT NULL CHECK (valor_faturado >= 0),
  numero_equipamentos integer CHECK (numero_equipamentos >= 0),  -- NULL se não for por equipamentos
  
  -- Retenções
  houve_retencao boolean DEFAULT false,
  valor_retido numeric(12,2) DEFAULT 0 CHECK (valor_retido >= 0),
  
  -- Impostos Calculados Automaticamente
  pis numeric(12,2) DEFAULT 0 CHECK (pis >= 0),
  cofins numeric(12,2) DEFAULT 0 CHECK (cofins >= 0),
  iss numeric(12,2) DEFAULT 0 CHECK (iss >= 0),
  icms numeric(12,2) DEFAULT 0 CHECK (icms >= 0),
  trimestral_provisao numeric(12,2) DEFAULT 0 CHECK (trimestral_provisao >= 0),
  total_impostos numeric(12,2) DEFAULT 0 CHECK (total_impostos >= 0),
  valor_liquido numeric(12,2) DEFAULT 0 CHECK (valor_liquido >= 0),
  
  -- Status e Recebimento
  status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago')),
  data_recebimento date,
  
  -- Comissões (JSON Array de {favorecido, aliquota, valor})
  comissoes jsonb DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_nf_numero UNIQUE(numero_nf),
  CONSTRAINT check_data_recebimento CHECK (
    (status = 'Pago' AND data_recebimento IS NOT NULL) OR 
    (status = 'Pendente')
  )
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_nf_contrato ON notas_fiscais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_nf_competencia ON notas_fiscais(competencia);
CREATE INDEX IF NOT EXISTS idx_nf_status ON notas_fiscais(status);
CREATE INDEX IF NOT EXISTS idx_nf_data_emissao ON notas_fiscais(data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_nf_data_recebimento ON notas_fiscais(data_recebimento DESC) WHERE data_recebimento IS NOT NULL;

-- Comentários
COMMENT ON TABLE notas_fiscais IS 'Notas fiscais emitidas com cálculos automáticos de impostos';
COMMENT ON COLUMN notas_fiscais.competencia IS 'Mês/Ano de competência no formato YYYY-MM';
COMMENT ON COLUMN notas_fiscais.trimestral_provisao IS 'Provisão mensal do imposto trimestral rateado';
COMMENT ON COLUMN notas_fiscais.comissoes IS 'Array JSON com distribuição de comissões: [{favorecido, aliquota, valor}]';

-- ====================
-- 3. CRIAR TABELA impostos_trimestrais
-- ====================

CREATE TABLE IF NOT EXISTS impostos_trimestrais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do Trimestre
  ano integer NOT NULL CHECK (ano >= 2026 AND ano <= 2050),
  trimestre integer NOT NULL CHECK (trimestre >= 1 AND trimestre <= 4),
  
  -- Configuração
  imposto_bruto numeric(12,2) NOT NULL CHECK (imposto_bruto >= 0),
  
  -- Auditoria
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Garantir unicidade
  CONSTRAINT unique_trimestre UNIQUE(ano, trimestre)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_imposto_trim_ano_tri ON impostos_trimestrais(ano DESC, trimestre DESC);

-- Comentários
COMMENT ON TABLE impostos_trimestrais IS 'Configuração de impostos trimestrais únicos (válido apenas para 2026+)';
COMMENT ON COLUMN impostos_trimestrais.imposto_bruto IS 'Valor bruto total do imposto trimestral antes das retenções';

-- ====================
-- 4. ROW LEVEL SECURITY (RLS)
-- ====================

-- Habilitar RLS nas novas tabelas
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostos_trimestrais ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para notas_fiscais
DROP POLICY IF EXISTS "Permitir leitura autenticada NF" ON notas_fiscais;
CREATE POLICY "Permitir leitura autenticada NF" ON notas_fiscais
  FOR SELECT 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir escrita autenticada NF" ON notas_fiscais;
CREATE POLICY "Permitir escrita autenticada NF" ON notas_fiscais
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas de Segurança para impostos_trimestrais
DROP POLICY IF EXISTS "Permitir leitura autenticada IT" ON impostos_trimestrais;
CREATE POLICY "Permitir leitura autenticada IT" ON impostos_trimestrais
  FOR SELECT 
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir escrita autenticada IT" ON impostos_trimestrais;
CREATE POLICY "Permitir escrita autenticada IT" ON impostos_trimestrais
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ====================
-- 5. TRIGGERS PARA updated_at
-- ====================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para contratos_base
DROP TRIGGER IF EXISTS update_contratos_base_updated_at ON contratos_base;
CREATE TRIGGER update_contratos_base_updated_at
  BEFORE UPDATE ON contratos_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para notas_fiscais
DROP TRIGGER IF EXISTS update_notas_fiscais_updated_at ON notas_fiscais;
CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para impostos_trimestrais
DROP TRIGGER IF EXISTS update_impostos_trimestrais_updated_at ON impostos_trimestrais;
CREATE TRIGGER update_impostos_trimestrais_updated_at
  BEFORE UPDATE ON impostos_trimestrais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 6. VIEWS ÚTEIS
-- ====================

-- View: NFs com dados de contrato (para facilitar consultas)
CREATE OR REPLACE VIEW v_notas_fiscais_completas AS
SELECT 
  nf.id,
  nf.numero_nf,
  nf.data_emissao,
  nf.competencia,
  nf.valor_faturado,
  nf.numero_equipamentos,
  nf.houve_retencao,
  nf.valor_retido,
  nf.pis,
  nf.cofins,
  nf.iss,
  nf.icms,
  nf.trimestral_provisao,
  nf.total_impostos,
  nf.valor_liquido,
  nf.status,
  nf.data_recebimento,
  nf.comissoes,
  -- Dados do contrato
  c.id as contrato_id,
  c.nome_contrato,
  c.tem_iss as contrato_tem_iss,
  c.aliquota_iss as contrato_aliquota_iss,
  c.tem_icms as contrato_tem_icms,
  c.aliquota_icms as contrato_aliquota_icms,
  c.contrato_por_equipamentos,
  -- Metadados
  nf.created_at,
  nf.updated_at
FROM notas_fiscais nf
INNER JOIN contratos_base c ON nf.contrato_id = c.id;

COMMENT ON VIEW v_notas_fiscais_completas IS 'View denormalizada de NFs com dados completos de contrato';

-- ====================
-- 7. FUNÇÕES AUXILIARES
-- ====================

-- Função para obter trimestre de uma competência
CREATE OR REPLACE FUNCTION get_trimestre_from_competencia(comp text)
RETURNS integer AS $$
DECLARE
  mes integer;
BEGIN
  -- Extrair mês de "YYYY-MM"
  mes := CAST(SPLIT_PART(comp, '-', 2) AS integer);
  
  -- Retornar trimestre (1-4)
  RETURN CASE
    WHEN mes BETWEEN 1 AND 3 THEN 1
    WHEN mes BETWEEN 4 AND 6 THEN 2
    WHEN mes BETWEEN 7 AND 9 THEN 3
    ELSE 4
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_trimestre_from_competencia IS 'Retorna o número do trimestre (1-4) a partir de uma competência no formato YYYY-MM';

-- Função para obter ano de uma competência
CREATE OR REPLACE FUNCTION get_ano_from_competencia(comp text)
RETURNS integer AS $$
BEGIN
  RETURN CAST(SPLIT_PART(comp, '-', 1) AS integer);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_ano_from_competencia IS 'Retorna o ano a partir de uma competência no formato YYYY-MM';

-- ====================
-- 8. DADOS DE EXEMPLO (OPCIONAL - COMENTAR SE NÃO DESEJAR)
-- ====================

/*
-- Exemplo de imposto trimestral para 2026 Q1
INSERT INTO impostos_trimestrais (ano, trimestre, imposto_bruto)
VALUES (2026, 1, 50000.00)
ON CONFLICT (ano, trimestre) DO NOTHING;
*/

-- ====================
-- FIM DA MIGRATION
-- ====================

-- Mensagem de sucesso
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration concluída com sucesso! Tabelas criadas: notas_fiscais, impostos_trimestrais. Tabela atualizada: contratos_base';
END $$;
