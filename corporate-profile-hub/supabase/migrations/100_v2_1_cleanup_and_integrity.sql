-- =========================================================
-- SCRIPT DE MANUTENÇÃO v2.1: LIMPEZA E INTEGRIDADE
-- =========================================================

-- 1. LIMPEZA: Remove duplicatas mantendo apenas o registro mais antigo
-- de cada CNPJ (tax_id).
DELETE FROM public.companies a 
USING public.companies b 
WHERE a.id > b.id 
  AND a.tax_id = b.tax_id;

-- 2. INTEGRIDADE: Torna o campo tax_id ÚNICO
-- Isso impedirá que qualquer ferramenta (app ou direta) insira duplicados.
ALTER TABLE public.companies 
ADD CONSTRAINT companies_tax_id_key UNIQUE (tax_id);

-- 3. COMENTÁRIO DE DOCUMENTAÇÃO
COMMENT ON CONSTRAINT companies_tax_id_key ON public.companies 
IS 'Garante que não existam duas empresas com o mesmo CNPJ no sistema.';
