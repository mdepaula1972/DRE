const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testando conexão com Supabase...');
    
    // Testar view principal
    console.log('\n1. Testando employee_loans_summary:');
    const { data: employees, error: empError } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .limit(3);
    
    if (empError) {
      console.error('Erro em employee_loans_summary:', empError);
    } else {
      console.log('Dados encontrados:', employees?.length || 0);
      console.log('Primeiro registro:', employees?.[0] || 'Nenhum');
    }
    
    // Testar view de stats
    console.log('\n2. Testando loan_stats:');
    const { data: stats, error: statsError } = await supabase
      .from('loan_stats')
      .select('*')
      .single();
    
    if (statsError) {
      console.error('Erro em loan_stats:', statsError);
    } else {
      console.log('Stats:', stats);
    }
    
    // Testar view de teste
    console.log('\n3. Testando employee_loans_summary_test:');
    const { data: testEmployees, error: testError } = await supabase
      .from('employee_loans_summary_test')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.error('Erro em employee_loans_summary_test:', testError);
    } else {
      console.log('Dados teste encontrados:', testEmployees?.length || 0);
      console.log('Primeiro registro teste:', testEmployees?.[0] || 'Nenhum');
    }
    
    // Listar tabelas disponíveis
    console.log('\n4. Listando tabelas/views disponíveis:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');
    
    if (tablesError) {
      console.error('Erro ao listar tabelas:', tablesError);
    } else {
      console.log('Tabelas encontradas:', tables);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConnection();
