const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO: DIEGO PEREIRA ---');
  
  // 1. Buscar no View de Contratos
  const { data: contracts, error: e1 } = await supabase
    .from('contracts_expanded')
    .select('*')
    .ilike('employee_name', '%Diego Pereira%');
    
  if (e1) {
    console.error('Erro ao buscar contratos:', e1);
  } else {
    console.log(`Contratos encontrados no view expanded: ${contracts.length}`);
    contracts.forEach(c => {
      console.log(` - Contrato: ${c.operation_number}, Status: ${c.status}, Saldo: ${c.balance}, Colaborador: ${c.employee_name}, Empresa: ${c.company}`);
    });
  }

  // 2. Buscar na tabela base (Produção)
  const { data: rawLoans, error: e2 } = await supabase
    .from('employee_loans')
    .select('*, employees(full_name)')
    .eq('employees.full_name', 'DIEGO PEREIRA GOMES'); // Tente nome exato se falhar
    
  // Se falhar o join, busca por id do colaborador
  const { data: diego } = await supabase.from('employees').select('id, full_name').ilike('full_name', '%Diego Pereira%').single();
  if (diego) {
    const { data: lns } = await supabase.from('employee_loans').select('*').eq('employee_id', diego.id);
    console.log(`\nEmpréstimos na tabela base (Produção) para ${diego.full_name}: ${lns?.length}`);
    lns?.forEach(l => console.log(` - ID: ${l.id}, Valor: ${l.amount}, Status: ${l.status}, Contrato: ${l.operation_number}`));
    
    const { data: lnsTest } = await supabase.from('employee_loans_test').select('*').eq('employee_id', diego.id);
    console.log(`\nEmpréstimos na tabela base (Teste): ${lnsTest?.length}`);
    lnsTest?.forEach(l => console.log(` - ID: ${l.id}, Valor: ${l.amount}, Status: ${l.status}, Contrato: ${l.operation_number}`));
  }
}

diagnose();
