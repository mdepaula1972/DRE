const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmployeeLoansSummary() {
  console.log('🔍 Testando employee_loans_summary com select(*)...\n');
  
  const { data, error } = await supabase
    .from('employee_loans_summary')
    .select('*');
  
  if (error) {
    console.log('❌ ERRO:', error.message);
    console.log('Código:', error.code);
    return;
  }
  
  console.log('✅ Sucesso! Registros:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('\nColunas disponíveis:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nPrimeiro registro:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

testEmployeeLoansSummary();
