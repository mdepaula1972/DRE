const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  try {
    console.log('=== CRIANDO USUÁRIO DE TESTE ISOLADO ===\n');
    
    // 1. Primeiro, encontrar a tabela base de employees
    console.log('1. Procurando tabela base de employees...');
    
    const possibleEmployeeTables = ['employees', 'employees_base', 'employee_data'];
    let employeeTable = null;
    
    for (const tableName of possibleEmployeeTables) {
      try {
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!testError) {
          console.log(`✅ Tabela employees encontrada: ${tableName}`);
          employeeTable = tableName;
          break;
        }
      } catch (e) {
        // Continuar procurando
      }
    }
    
    if (!employeeTable) {
      console.log('❌ Nenhuma tabela employees encontrada, criando via função RPC...');
      
      // Tentar criar via função RPC (se existir)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_test_employee', {
          name: 'USUÁRIO TESTE DASHBOARD',
          company: 'MarBR',
          link_type: 'CLT',
          remuneration: 5000,
          is_test: true
        });
      
      if (rpcError) {
        console.log('❌ Função RPC não encontrada:', rpcError.message);
        console.log('\n⚠️  Você precisará criar o usuário manualmente no painel Supabase');
        console.log('Use estes dados:');
        console.log(`
INSERT INTO employees (name, company, link_type, remuneration, is_test, created_at)
VALUES (
  'USUÁRIO TESTE DASHBOARD',
  'MarBR', 
  'CLT',
  5000,
  true,
  NOW()
);
        `);
        return;
      } else {
        console.log('✅ Usuário criado via RPC:', rpcResult);
        return;
      }
    }
    
    // 2. Se encontrou a tabela, criar diretamente
    console.log('\n2. Criando usuário de teste...');
    
    const testUser = {
      name: 'USUÁRIO TESTE DASHBOARD',
      company: 'MarBR',
      link_type: 'CLT', 
      remuneration: 5000,
      is_test: true,
      created_at: new Date().toISOString()
    };
    
    // Remover campos que podem não existir
    const { data: newUser, error: insertError } = await supabase
      .from(employeeTable)
      .insert([{
        name: testUser.name,
        company: testUser.company,
        link_type: testUser.link_type,
        remuneration: testUser.remuneration,
        created_at: testUser.created_at
      }])
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ ERRO ao inserir usuário:', insertError.message);
      
      // Tentar versão simplificada
      console.log('\n3. Tentando versão simplificada...');
      const { data: simpleUser, error: simpleError } = await supabase
        .from(employeeTable)
        .insert([{
          name: testUser.name,
          company: testUser.company
        }])
        .select()
        .single();
      
      if (simpleError) {
        console.log('❌ ERRO na versão simplificada:', simpleError.message);
      } else {
        console.log('✅ Usuário criado (versão simplificada):', simpleUser);
      }
    } else {
      console.log('✅ Usuário de teste criado:', newUser);
    }
    
    // 3. Verificar se aparece na view de teste
    console.log('\n4. Verificando se aparece na view de teste...');
    const { data: testView, error: viewError } = await supabase
      .from('employee_loans_summary_test')
      .select('*')
      .eq('employee_name', 'USUÁRIO TESTE DASHBOARD');
    
    if (viewError) {
      console.log('❌ Erro na view de teste:', viewError.message);
    } else {
      console.log(`✅ Usuário aparece na view de teste: ${testView?.length || 0} registros`);
    }
    
    // 4. Verificar que NÃO aparece na view principal
    console.log('\n5. Verificando isolamento da view principal...');
    const { data: mainView, error: mainError } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .eq('employee_name', 'USUÁRIO TESTE DASHBOARD');
    
    if (mainError) {
      console.log('❌ Erro na view principal:', mainError.message);
    } else {
      if (mainView && mainView.length > 0) {
        console.log('⚠️  ATENÇÃO: Usuário está aparecendo na view principal!');
        console.log('    Isso indica que o filtro is_test não está funcionando corretamente');
      } else {
        console.log('✅ Usuário corretamente isolado (não aparece na view principal)');
      }
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

createTestUser();
