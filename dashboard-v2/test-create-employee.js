const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateEmployee() {
  try {
    console.log('=== TESTE DE CRIAÇÃO DE COLABORADOR ===\n');
    
    // 1. Verificar se existe função para criar colaborador
    console.log('1. Tentando criar colaborador de teste...');
    
    const testEmployee = {
      name: 'FUNCIONÁRIO TESTE DASHBOARD',
      company: 'MarBR',
      link_type: 'CLT',
      remuneration: 5000,
      cpf: '123.456.789-00',
      is_test: true
    };
    
    // Tentar inserir diretamente na tabela employees (se existir)
    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert([testEmployee])
      .select()
      .single();
    
    if (insertError) {
      console.log('ERRO ao inserir em employees:', insertError.message);
      
      // Tentar usar RPC se houver função
      console.log('\n2. Tentando usar função RPC...');
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_test_employee', {
          name: testEmployee.name,
          company: testEmployee.company,
          link_type: testEmployee.link_type,
          remuneration: testEmployee.remuneration
        });
      
      if (rpcError) {
        console.log('ERRO na função RPC:', rpcError.message);
      } else {
        console.log('Sucesso com RPC:', rpcResult);
      }
    } else {
      console.log('Sucesso inserindo employee:', newEmployee);
    }
    
    // 3. Verificar se há alguma função de gerenciamento de dados de teste
    console.log('\n3. Verificando funções disponíveis...');
    const { data: functions, error: funcError } = await supabase
      .rpc('list_functions');
    
    if (funcError) {
      console.log('ERRO ao listar funções:', funcError.message);
    } else {
      console.log('Funções disponíveis:', functions);
    }
    
    // 4. Verificar estrutura da tabela de contratos
    console.log('\n4. Verificando estrutura de contratos...');
    const { data: contractColumns, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .limit(1);
    
    if (contractError) {
      console.log('ERRO ao verificar contratos:', contractError.message);
    } else {
      console.log('Estrutura de contratos:', Object.keys(contractColumns[0] || {}));
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

testCreateEmployee();
