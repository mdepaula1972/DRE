-- 1. Remove a restrição antiga
ALTER TABLE public.company_addresses 
DROP CONSTRAINT IF EXISTS company_addresses_type_check;

-- 2. Limpeza de dados: Garante que todos os registros existentes sejam válidos
UPDATE public.company_addresses 
SET type = 'Matriz' 
WHERE type NOT IN ('Matriz', 'Filial', 'Operacional', 'Cobrança', 'Entrega', 'Outros') 
   OR type IS NULL;

-- 3. Adiciona a nova restrição com segurança
ALTER TABLE public.company_addresses 
ADD CONSTRAINT company_addresses_type_check 
CHECK (type IN ('Matriz', 'Filial', 'Operacional', 'Cobrança', 'Entrega', 'Outros'));

COMMENT ON COLUMN public.company_addresses.type IS 'Tipo de endereço: Matriz, Filial, Operacional, Cobrança, Entrega, Outros';
