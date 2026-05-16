const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNextEnding() {
  console.log('🔍 VERIFICANDO PRÓXIMO A ENCERRAR\n');
  
  // Buscar todos os contratos ativos ordenados por data de término
  const { data: contracts } = await supabase
    .from('contracts_expanded')
    .select('employee_name, end_date, remaining_installments, start_cycle, value')
    .gt('remaining_installments', 0)
    .order('end_date', { ascending: true })
    .limit(5);
  
  console.log('📋 Contratos ativos (ordenados por end_date):');
  contracts?.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.employee_name}`);
    console.log(`     start_cycle: ${c.start_cycle}`);
    console.log(`     end_date: ${c.end_date}`);
    console.log(`     remaining: ${c.remaining_installments}`);
    console.log(`     value: R$ ${c.value}`);
    console.log('');
  });
  
  // Ver o que a view loan_stats retorna
  const { data: stats } = await supabase
    .from('loan_stats')
    .select('proximo_encerrar, parcelas_restantes')
    .single();
  
  console.log('📊 VIEW loan_stats:');
  console.log(`   Próximo encerrar: ${stats?.proximo_encerrar}`);
  console.log(`   Parcelas restantes: ${stats?.parcelas_restantes}`);
}

checkNextEnding().catch(console.error);
