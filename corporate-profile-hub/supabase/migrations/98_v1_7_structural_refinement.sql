-- v1.7 - Departamentalização e Referência PF
-- Adicionando campos de Pessoa Física (PF) para colaboradores PJ

-- 1. Expansão da tabela de Funcionários com campos de Responsável
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS responsible_rg TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS responsible_cpf TEXT;

-- 2. Limpeza lógica da tabela de contatos (opcional - mantemos as colunas mas mudamos o uso na UI)
-- Se is_primary ou receives_notifications não existirem, são criadas aqui para segurança
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS receives_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.company_contacts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 3. Atualizando RLS para garantir acesso aos novos campos
-- (As políticas já existem, mas garantimos que as permissões continuem abertas em dev)
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts DISABLE ROW LEVEL SECURITY;
