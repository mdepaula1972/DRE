-- =========================================================
-- V2.3: COMPANY PARTNERS MODULE
-- =========================================================

-- 1. Create Partners Table
CREATE TABLE IF NOT EXISTS public.company_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL, -- CPF or CNPJ
    participation_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    role TEXT DEFAULT 'Sócio', -- Sócio-Administrador, Sócio Quotista, etc.
    is_administrator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT participation_range CHECK (participation_percentage >= 0 AND participation_percentage <= 100)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_partners_company_id ON public.company_partners(company_id);
CREATE INDEX IF NOT EXISTS idx_partners_tax_id ON public.company_partners(tax_id);

-- 3. Enable RLS
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Isolation via Company -> Organization)
CREATE POLICY "User can access company partners" ON public.company_partners
FOR ALL USING (
    company_id IN (
        SELECT id FROM public.companies 
        WHERE organization_id IN (SELECT public.get_user_orgs())
    )
);

-- 5. Trigger for updated_at
-- (Assuming handle_updated_at function already exists from core_schema)
DROP TRIGGER IF EXISTS on_partner_updated ON public.company_partners;
CREATE TRIGGER on_partner_updated
    BEFORE UPDATE ON public.company_partners
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

COMMENT ON TABLE public.company_partners IS 'Módulo de gestão societária e sócios-administradores.';
