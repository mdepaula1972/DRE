-- =========================================================
-- V2.3: UNIFIED PARTNERS & CONTACTS (SIMPLIFIED)
-- =========================================================

-- 1. Removemos a tabela company_partners (se tiver sido criada)
DROP TABLE IF EXISTS public.company_partners CASCADE;

-- 2. Adicionamos os campos societários na tabela de contatos existente
ALTER TABLE public.company_contacts 
ADD COLUMN IF NOT EXISTS participation_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_administrator BOOLEAN DEFAULT FALSE;

-- 3. Adicionamos a constraint de segurança (0-100%)
ALTER TABLE public.company_contacts 
DROP CONSTRAINT IF EXISTS contact_participation_range;

ALTER TABLE public.company_contacts 
ADD CONSTRAINT contact_participation_range 
CHECK (participation_percentage >= 0 AND participation_percentage <= 100);

-- 4. Garantimos que a coluna contact_types (já existente como array) possa ser usada
-- Nota: A coluna contact_types já existe vinda da v1.9

COMMENT ON COLUMN public.company_contacts.participation_percentage IS 'Porcentagem de participação societária (se for sócio).';
COMMENT ON COLUMN public.company_contacts.is_administrator IS 'Define se o contato possui poderes legais de administração/assinatura.';
