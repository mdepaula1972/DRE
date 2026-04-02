const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO DETALHADO: DIEGO PEREIRA ---');
  
  const { data: lns } = await supabase.from('employee_loans').select('*').eq('employee_id', '260253a2-e139-48c3-ae5a-ecd2eb376bea');
  
  console.log('\nRegistros na tabela [employee_loans]:');
  console.log(JSON.stringify(lns, null, 2));

  const { data: expanded } = await supabase
    .from('contracts_expanded')
    .select('*')
    .eq('employee_id', '260253a2-e139-48c3-ae5a-ecd2eb376bea');
    
  console.log('\nRegistros na view [contracts_expanded]:');
  console.log(JSON.stringify(expanded, null, 2));
}

diagnose();
