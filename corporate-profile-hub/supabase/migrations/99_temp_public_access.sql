-- Desativa RLS e cria políticas de acesso público total para desenvolvimento
-- Tabelas Principais
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Tabelas de Suporte (Ficha Cadastral)
ALTER TABLE public.company_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bank_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents DISABLE ROW LEVEL SECURITY;

-- Políticas de acesso total (Garante que mesmo se ativado, o acesso é livre)
DROP POLICY IF EXISTS "Public Access" ON public.organizations;
CREATE POLICY "Public Access" ON public.organizations FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON public.companies;
CREATE POLICY "Public Access" ON public.companies FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON public.company_addresses;
CREATE POLICY "Public Access" ON public.company_addresses FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Access" ON public.company_branding;
CREATE POLICY "Public Access" ON public.company_branding FOR ALL USING (true);
