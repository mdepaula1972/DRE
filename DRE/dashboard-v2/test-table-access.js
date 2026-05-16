const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTableAccess() {
  try {
    console.log('=== TESTANDO ACESSO DIRETO ÀS TABELAS ===\n');
    
    // Lista de possíveis nomes de tabelas base
    const possibleTables = [
      'contracts',
      'contracts_base', 
      'loan_contracts',
      'employee_contracts',
      'contracts_raw',
      'loans',
      'employee_loans',
      'employees',
      'employees_base'
    ];
    
    for (const tableName of possibleTables) {
      console.log(`\n--- Testando tabela: ${tableName} ---`);
      
      try {
        // Testar SELECT
        const { data: selectData, error: selectError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (selectError) {
          console.log(`❌ SELECT: ${selectError.message}`);
        } else {
          console.log(`✅ SELECT: OK (${selectData?.length || 0} registros)`);
          if (selectData && selectData.length > 0) {
            console.log(`   Colunas: ${Object.keys(selectData[0]).slice(0, 5).join(', ')}...`);
          }
          
          // Se SELECT funcionou, tentar UPDATE em um registro de teste
          if (selectData && selectData.length > 0) {
            const recordId = selectData[0].id;
            const originalData = { ...selectData[0] };
            
            console.log(`   Testando UPDATE no registro ${recordId}...`);
            
            const { error: updateError } = await supabase
              .from(tableName)
              .update({ updated_at: new Date().toISOString() })
              .eq('id', recordId);
            
            if (updateError) {
              console.log(`❌ UPDATE: ${updateError.message}`);
              
              // Se for erro de view, tentar identificar se é tabela ou view
              if (updateError.message.includes('view') || updateError.message.includes('VIEW')) {
                console.log(`   📋 ${tableName} é uma VIEW, não uma tabela`);
              } else if (updateError.message.includes('column')) {
                console.log(`   🏗️ ${tableName} parece ser uma TABELA (erro de coluna)`);
              }
            } else {
              console.log(`✅ UPDATE: OK (${tableName} é uma tabela atualizável!)`);
              
              // Voltar ao estado original
              await supabase
                .from(tableName)
                .update(originalData)
                .eq('id', recordId);
            }
          }
        }
        
      } catch (e) {
        console.log(`❌ ERRO GERAL: ${e.message}`);
      }
    }
    
    // Verificar também as views que conhecemos
    console.log('\n\n=== VERIFICANDO VIEWS CONHECIDAS ===');
    const knownViews = [
      'employee_loans_summary',
      'loan_stats', 
      'contracts_expanded',
      'employee_loans_summary_test'
    ];
    
    for (const viewName of knownViews) {
      console.log(`\n--- Testando view: ${viewName} ---`);
      
      try {
        const { data: viewData, error: viewError } = await supabase
          .from(viewName)
          .select('*')
          .limit(1);
        
        if (viewError) {
          console.log(`❌ ${viewError.message}`);
        } else {
          console.log(`✅ View acessível (${viewData?.length || 0} registros)`);
        }
      } catch (e) {
        console.log(`❌ ERRO: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

testTableAccess();
