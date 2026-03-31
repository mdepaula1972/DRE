const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGeovanna() {
  console.log('🔍 DEBUG - GEOVANNA CHAVES\n');
  
  // 1. Buscar dados brutos da Geovanna
  const { data: emp } = await supabase
    .from('employees')
    .select('*')
    .ilike('corporate_name', '%GEOVANNA%')
    .single();
  
  if (!emp) {
    console.log('❌ Geovanna não encontrada');
    return;
  }
  
  console.log('👤 DADOS BRUTOS:');
  console.log('  ID:', emp.id);
  console.log('  Nome:', emp.corporate_name);
  console.log('  Empresa:', emp.company);
  console.log('  Status:', emp.status);
  console.log('  loan_amount:', emp.loan_amount);
  console.log('  loan_installments:', emp.loan_installments);
  console.log('  loan_start_cycle:', emp.loan_start_cycle);
  console.log('');
  
  console.log('📋 LOANS_DATA (JSON):');
  if (emp.loans_data) {
    emp.loans_data.forEach((loan, i) => {
      console.log(`  Empréstimo ${i + 1}:`);
      console.log('    amount:', loan.amount);
      console.log('    installments:', loan.installments);
      console.log('    start_cycle:', loan.start_cycle);
      console.log('    request_date:', loan.request_date);
      
      // Calcular parcelas restantes manualmente
      const startDate = new Date(loan.start_cycle + '-01');
      const now = new Date();
      const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
      const remaining = Math.max(0, (loan.installments || 0) - monthsPassed);
      console.log('    Meses passados:', monthsPassed);
      console.log('    Parcelas restantes (cálculo):', remaining);
      console.log('');
    });
  } else {
    console.log('  loans_data: null ou vazio');
  }
  
  // 2. Ver o que a view contracts_expanded retorna
  console.log('🔎 VIEW contracts_expanded:');
  const { data: contracts } = await supabase
    .from('contracts_expanded')
    .select('*')
    .eq('employee_id', emp.id);
  
  if (contracts && contracts.length > 0) {
    contracts.forEach((c, i) => {
      console.log(`  Contrato ${i + 1}:`);
      console.log('    value:', c.value);
      console.log('    start_cycle:', c.start_cycle);
      console.log('    remaining_installments:', c.remaining_installments);
      console.log('    end_date:', c.end_date);
      console.log('    status:', c.status);
      console.log('');
    });
  } else {
    console.log('  ❌ Nenhum contrato encontrado na view!\n');
  }
  
  // 3. Ver o que a view employee_loans_summary retorna
  console.log('📊 VIEW employee_loans_summary:');
  const { data: summary } = await supabase
    .from('employee_loans_summary')
    .select('*')
    .eq('employee_id', emp.id)
    .single();
  
  if (summary) {
    console.log('  total_loaned:', summary.total_loaned);
    console.log('  total_balance:', summary.total_balance);
    console.log('  monthly_installment:', summary.monthly_installment);
    console.log('  active_contracts:', summary.active_contracts);
  } else {
    console.log('  ❌ Nenhum resumo encontrado!');
  }
  
  // 4. Verificar se há outros empréstimos com valores diferentes
  console.log('\n💡 VERIFICANDO VALORES ÚNICOS:');
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('corporate_name, loans_data, loan_amount, loan_start_cycle')
    .ilike('corporate_name', '%GEOVANNA%');
  
  allEmployees?.forEach(e => {
    console.log('  Nome:', e.corporate_name);
    console.log('  loan_amount:', e.loan_amount);
    console.log('  loan_start_cycle:', e.loan_start_cycle);
  });
}

debugGeovanna().catch(console.error);
