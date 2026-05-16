-- Migração v1.9: Adição de múltiplos tipos de contato
ALTER TABLE public.company_contacts 
ADD COLUMN contact_types text[] DEFAULT '{}';

-- Comentário para documentação do campo
COMMENT ON COLUMN public.company_contacts.contact_types IS 'Array de strings representando as finalidades do contato (ex: Faturamento, Jurídico)';
