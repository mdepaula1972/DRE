-- v1.5 - Master Data & Smart Contacts Expansion

-- 1. Expansão da tabela Master de Funcionários
-- Adicionando campos básicos que podem estar faltando para centralização
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department_master TEXT;

-- 2. Evolução da tabela de Contatos Corporativos
-- Adicionando vínculo relacional e campos de inteligência de cockpit
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS job_role TEXT;
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS receives_notifications BOOLEAN DEFAULT false;

-- 3. Garantindo acesso para desenvolvimento (RLS)
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts DISABLE ROW LEVEL SECURITY;
