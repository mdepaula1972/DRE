-- 1. Criar a tabela de histórico de teste (Causa do Erro 404)
CREATE TABLE IF NOT EXISTS public.employee_history_test (LIKE public.employee_history INCLUDING ALL);

-- 2. Garantir que o colaborador de teste existe para o formulário não vir vazio
INSERT INTO public.employees_test (
    id, full_name, company, employment_type, remuneration, status, start_date
)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    '[TESTE] Sistema Online (Mock)',
    'MarBR',
    'CLT',
    10000.00,
    'Ativo',
    NOW() - INTERVAL '1 year'
) ON CONFLICT (id) DO NOTHING;

-- 3. Criar a tabela de empréstimos de teste se não existir
CREATE TABLE IF NOT EXISTS public.employee_loans_test (LIKE public.employee_loans INCLUDING ALL);

-- 4. Criar a tabela de pagamentos de teste se não existir
CREATE TABLE IF NOT EXISTS public.loan_payments_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID,
    employee_id UUID,
    month_cycle TEXT,
    due_date DATE,
    paid_date DATE,
    amount NUMERIC,
    status TEXT DEFAULT 'PENDENTE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Aviso de conclusão
-- Rode este script no SQL Editor do seu Supabase para ativar o Modo Teste Online.
