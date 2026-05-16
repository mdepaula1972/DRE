const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getColumnNames() {
  console.log('🔍 Verificando colunas da tabela employees...\n');
  
  try {
    // Fetch one row and get column names
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Erro:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('Colunas encontradas:');
      columns.forEach(col => {
        const value = data[0][col];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  - ${col} (${type})`);
      });
      
      console.log('\n📋 Valores do primeiro registro:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.log('Erro:', err.message);
  }
}

getColumnNames();
