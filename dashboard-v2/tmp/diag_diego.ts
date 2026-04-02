import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- BUSCANDO DIEGO PEREIRA ---');
  const { data: emps, error: e1 } = await supabase
    .from('employees')
    .select('id, full_name, corporate_name')
    .ilike('full_name', '%Diego Pereira%');
    
  if (e1) { console.error(e1); return; }
  if (emps.length === 0) { console.log('Diego Pereira não encontrado'); return; }

  for (const emp of emps) {
    console.log(`\nColaborador: ${emp.full_name} (${emp.id})`);
    
    const { data: loans, error: e2 } = await supabase
      .from('loans')
      .select('*')
      .eq('employee_id', emp.id);
      
    if (e2) { console.error(e2); continue; }
    console.log(`Empréstimos encontrados: ${loans.length}`);
    loans.forEach(l => {
      console.log(` - ID: ${l.id}, Valor: ${l.amount}, Status: ${l.status}, Contrato: ${l.operation_number}`);
    });

    const { data: summary, error: e3 } = await supabase
      .from('contracts_expanded')
      .select('*')
      .eq('employee_id', emp.id);
      
    if (e3) { console.error('Erro no view:', e3); continue; }
    console.log(`Contratos no View expanded: ${summary?.length}`);
    summary?.forEach(s => {
      console.log(` - Contrato: ${s.operation_number}, Status: ${s.status}, Saldo: ${s.balance}`);
    });
  }
}

diagnose();
