const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tabelas no Supabase...\n');

  const tablesToCheck = [
    'employee_loans_summary',
    'loan_stats',
    'loan_projections',
    'contracts',
    'employees',
    'loans'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${table}: TABELA NÃO EXISTE`);
        } else {
          console.log(`⚠️  ${table}: ERRO - ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: OK (dados encontrados)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  // List all tables in public schema
  console.log('\n📋 Listando todas as tabelas disponíveis:');
  try {
    const { data, error } = await supabase
      .rpc('get_tables');
    
    if (error) {
      // Try alternative method
      const { data: tables, error: err2 } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (err2) {
        console.log('Não foi possível listar tabelas:', err2.message);
      } else {
        tables?.forEach(t => console.log(`  - ${t.table_name}`));
      }
    } else {
      data?.forEach(t => console.log(`  - ${t}`));
    }
  } catch (err) {
    console.log('Erro ao listar tabelas:', err.message);
  }
}

checkTables();
