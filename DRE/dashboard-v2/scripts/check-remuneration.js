const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('🔍 Verificando colunas disponíveis...\n');
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Colunas disponíveis na tabela employees:');
    columns.forEach(col => {
      const val = data[0][col];
      if (typeof val === 'number' || (typeof val === 'string' && !val.includes('{') && !val.includes('['))) {
        console.log(`  - ${col}: ${val}`);
      }
    });
  }
}

checkColumns();
