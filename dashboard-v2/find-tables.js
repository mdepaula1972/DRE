const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findRealTables() {
  try {
    console.log('=== ENCONTRANDO TABELAS BASE REAIS ===\n');
    
    // 1. Listar todas as tabelas do schema public
    console.log('1. Buscando todas as tabelas...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables_info');
    
    if (tablesError) {
      // Tentar alternativa via SQL direto
      console.log('Tentando SQL direto para listar tabelas...');
      const { data: sqlResult, error: sqlError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (sqlError) {
        console.error('ERRO:', sqlError);
        return;
      }
      
      console.log('Tabelas base encontradas:');
      sqlResult.forEach(table => {
        if (table.table_name.includes('contract') || 
            table.table_name.includes('loan') || 
            table.table_name.includes('employee')) {
          console.log(`✅ ${table.table_name}`);
        }
      });
      
      return;
    }
    
    console.log('Tabelas:', tables);
    
    // 2. Tentar acessar tabela contracts diretamente
    console.log('\n2. Testando acesso direto à tabela contracts...');
    const { data: directContracts, error: directError } = await supabase
      .from('contracts')
      .select('*')
      .limit(1);
    
    if (directError) {
      console.log('ERRO ao acessar contracts:', directError.message);
      
      // Tentar encontrar o nome real da tabela
      console.log('\n3. Procurando variações de nomes de tabelas...');
      const possibleNames = [
        'contracts_base',
        'loan_contracts', 
        'employee_contracts',
        'contracts_raw',
        'loans',
        'employee_loans'
      ];
      
      for (const tableName of possibleNames) {
        try {
          const { data: testData, error: testError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!testError) {
            console.log(`✅ Tabela encontrada: ${tableName}`);
            console.log(`   Registros: ${testData?.length || 0}`);
            if (testData && testData.length > 0) {
              console.log(`   Colunas: ${Object.keys(testData[0]).join(', ')}`);
            }
          }
        } catch (e) {
          // Ignorar erros, continuar procurando
        }
      }
    } else {
      console.log('✅ Acesso direto a contracts funcionou');
      console.log('Colunas:', Object.keys(directContracts[0] || {}));
    }
    
    // 3. Verificar views existentes
    console.log('\n4. Listando views existentes...');
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (viewsError) {
      console.error('ERRO ao listar views:', viewsError);
    } else {
      console.log('Views encontradas:');
      views.forEach(view => {
        if (view.table_name.includes('contract') || 
            view.table_name.includes('loan') || 
            view.table_name.includes('employee')) {
          console.log(`📋 ${view.table_name}`);
        }
      });
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

findRealTables();
