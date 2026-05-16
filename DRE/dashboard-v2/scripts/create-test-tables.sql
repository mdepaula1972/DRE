-- 0. Limpa velhas tabelas de teste conflitantes e todas as views penduradas nelas
DROP TABLE IF EXISTS public.employee_loans_test CASCADE;
DROP TABLE IF EXISTS public.employees_test CASCADE;

-- 1. Cria a tabela employees_test copiando toda a estrutura da original
CREATE TABLE public.employees_test (LIKE public.employees INCLUDING ALL);

-- 2. Cria a tabela employee_loans_test copiando toda a estrutura da original
CREATE TABLE public.employee_loans_test (LIKE public.employee_loans INCLUDING ALL);

-- 3. Insere o colaborador Teste (com um UUID fixo para conectarmos o empréstimo nele)
INSERT INTO public.employees_test (
    id, full_name, company, employment_type, remuneration, status
)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    '[TESTE] João da Silva (Mock)',
    'MarBR',
    'CLT',
    10000.00,
    'Ativo'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insere um empréstimo no valor de R$ 5.000,00 em 10x
INSERT INTO public.employee_loans_test (
  employee_id, amount, installments, start_cycle, request_date, 
  notes, paid_installments, amount_paid_extra, postponed_months
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  5000.00,
  10,
  to_char(now(), 'YYYY-MM'), -- Começa no mês atual ex: 2026-03
  now()::date,
  'Empréstimo Isolado (Seguro)',
  0,
  0,
  0
);
