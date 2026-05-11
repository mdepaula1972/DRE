-- Tabela Unificada de Finanças (Omie 360)
CREATE TABLE IF NOT EXISTS omie_financas_unificado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_nome TEXT NOT NULL,
    omie_id BIGINT,
    tipo_registro TEXT NOT NULL, -- PAGAR, RECEBER, MOVIMENTO
    status TEXT,
    valor_total NUMERIC(15,2),
    valor_alocado NUMERIC(15,2),
    data_emissao DATE,
    data_registro DATE,
    data_vencimento DATE,
    data_previsao DATE,
    data_pagamento DATE,
    categoria_codigo TEXT,
    categoria_nome TEXT,
    projeto_nome TEXT,
    departamento_nome TEXT,
    cliente_fornecedor TEXT,
    numero_documento TEXT,
    selecionado BOOLEAN DEFAULT TRUE,
    conciliado BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Performance
CREATE INDEX IF NOT EXISTS idx_omie_unificado_empresa ON omie_financas_unificado(empresa_nome);
CREATE INDEX IF NOT EXISTS idx_omie_unificado_data_registro ON omie_financas_unificado(data_registro);
CREATE INDEX IF NOT EXISTS idx_omie_unificado_data_vencimento ON omie_financas_unificado(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_omie_unificado_data_pagamento ON omie_financas_unificado(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_omie_unificado_omie_id ON omie_financas_unificado(omie_id);
CREATE INDEX IF NOT EXISTS idx_omie_unificado_tipo ON omie_financas_unificado(tipo_registro);

-- Habilitar RLS
ALTER TABLE omie_financas_unificado ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "service_role_all" ON omie_financas_unificado FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON omie_financas_unificado FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated_all" ON omie_financas_unificado FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_omie_financas_unificado_updated_at
    BEFORE UPDATE ON omie_financas_unificado
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
