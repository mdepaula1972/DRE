const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeSchema() {
  console.log('🔍 Analisando schema existente...\n');

  // Check employees table structure
  console.log('📋 Tabela employees:');
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .limit(3);

    if (error) {
      console.log('  Erro:', error.message);
    } else {
      console.log('  Registros:', data.length);
      if (data.length > 0) {
        console.log('  Colunas:', Object.keys(data[0]).join(', '));
        console.log('  Exemplo:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('  Erro:', err.message);
  }

  // Check for any loan-related tables
  console.log('\n📋 Procurando tabelas relacionadas a empréstimos...');
  
  // Try to query using raw SQL via rpc
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `
    });
    
    if (error) {
      console.log('  RPC exec_sql não disponível:', error.message);
    } else {
      console.log('  Tabelas encontradas:', data);
    }
  } catch (err) {
    console.log('  Erro ao listar tabelas:', err.message);
  }
}

analyzeSchema();
