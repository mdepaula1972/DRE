-- Tabela para salvar as simulações do DRE (Goal-Seek)
CREATE TABLE IF NOT EXISTS dre_simulations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    titulo TEXT NOT NULL,
    empresa_context TEXT NOT NULL, -- Para filtrar as simulações por empresa (Global da Empresa)
    revenue_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    costs_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    expenses_multiplier NUMERIC NOT NULL DEFAULT 1.0,
    fcl_target NUMERIC -- Qual era a meta de Fluxo de Caixa (se usou Goal Seek)
);

-- Configurações de Segurança e RLS (Row Level Security)
-- Permitir select e insert públicos para o MVP (já que o DRE não usa auth por enquanto)
ALTER TABLE dre_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública das simulações" 
ON dre_simulations FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública de simulações" 
ON dre_simulations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de simulações" 
ON dre_simulations FOR UPDATE 
USING (true);

CREATE POLICY "Permitir deleção pública de simulações" 
ON dre_simulations FOR DELETE 
USING (true);
