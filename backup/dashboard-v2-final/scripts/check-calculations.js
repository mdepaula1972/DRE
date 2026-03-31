const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCalculations() {
  console.log('🔍 Verificando cálculos...\n');

  // 1. Verificar dados brutos de um employee
  console.log('1️⃣ Dados brutos do primeiro colaborador com empréstimos:');
  const { data: rawEmployee } = await supabase
    .from('employees')
    .select('id, corporate_name, loan_amount, loan_installments, loans_data')
    .not('loans_data', 'is', null)
    .limit(1)
    .single();
  
  console.log('   Colaborador:', rawEmployee?.corporate_name);
  console.log('   loan_amount:', rawEmployee?.loan_amount);
  console.log('   loan_installments:', rawEmployee?.loan_installments);
  console.log('   loans_data:', JSON.stringify(rawEmployee?.loans_data, null, 2));

  // 2. Verificar o que a view calculou
  console.log('\n2️⃣ Dados calculados pela view:');
  const { data: viewData } = await supabase
    .from('employee_loans_summary')
    .select('*')
    .eq('employee_id', rawEmployee?.id)
    .single();
  
  if (viewData) {
    console.log('   remuneration:', viewData.remuneration);
    console.log('   total_loaned:', viewData.total_loaned);
    console.log('   total_received:', viewData.total_received);
    console.log('   total_balance:', viewData.total_balance);
    console.log('   monthly_installment:', viewData.monthly_installment);
    console.log('   active_contracts:', viewData.active_contracts);
  }

  // 3. Verificar estatísticas gerais
  console.log('\n3️⃣ Estatísticas gerais:');
  const { data: stats } = await supabase
    .from('loan_stats')
    .select('*')
    .single();
  
  console.log('   total_emprestado:', stats?.total_emprestado);
  console.log('   saldo_devedor:', stats?.saldo_devedor);
  console.log('   total_recebido:', stats?.total_recebido);
  console.log('   recebivel_mes:', stats?.recebivel_mes);

  // 4. Calcular manualmente para verificar
  console.log('\n4️⃣ Cálculo manual (soma de todos os empréstimos):');
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('loans_data, loan_amount')
    .not('loans_data', 'is', null);
  
  let totalLoaned = 0;
  let totalReceived = 0;
  let totalBalance = 0;
  
  allEmployees?.forEach(emp => {
    if (emp.loans_data && Array.isArray(emp.loans_data)) {
      emp.loans_data.forEach((loan, idx) => {
        console.log(`   Empréstimo ${idx + 1}: R$ ${loan.amount} (${loan.installments}x, início: ${loan.start_cycle})`);
        totalLoaned += parseFloat(loan.amount);
        // Assumindo que 30% já foi recebido (simulação)
        totalReceived += parseFloat(loan.amount) * 0.3;
        totalBalance += parseFloat(loan.amount) * 0.7;
      });
    }
  });
  
  console.log('\n   Total calculado:');
  console.log('   total_loaned:', totalLoaned);
  console.log('   total_received:', totalReceived);
  console.log('   total_balance:', totalBalance);
}

checkCalculations();
