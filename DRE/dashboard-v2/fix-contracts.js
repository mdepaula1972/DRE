const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContracts() {
  try {
    console.log('=== CORREÇÃO AUTOMÁTICA DOS CONTRATOS ===\n');
    
    // 1. Verificar contratos ativos vs liquidados
    console.log('1. Verificando status real dos contratos...');
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('*');
    
    if (contractError) {
      console.error('ERRO:', contractError);
      return;
    }
    
    console.log(`Total de contratos: ${contracts.length}`);
    
    const ativos = contracts.filter(c => c.status === 'ATIVO');
    const liquidados = contracts.filter(c => c.status === 'LIQUIDADO');
    
    console.log(`Contratos ATIVOS: ${ativos.length}`);
    console.log(`Contratos LIQUIDADOS: ${liquidados.length}`);
    
    // 2. Identificar contratos que deveriam estar ativos
    console.log('\n2. Identificando contratos com saldos inconsistentes...');
    const inconsistentContracts = contracts.filter(c => {
      const expectedBalance = c.value - (c.installments_paid * c.installment_value);
      return c.status === 'LIQUIDADO' && expectedBalance > 0;
    });
    
    console.log(`Contratos com status inconsistente: ${inconsistentContracts.length}`);
    
    inconsistentContracts.forEach((contract, idx) => {
      const expectedBalance = contract.value - (contract.installments_paid * contract.installment_value);
      console.log(`\n--- Contrato ${idx + 1} ---`);
      console.log(`ID: ${contract.id}`);
      console.log(`Funcionário: ${contract.employee_name}`);
      console.log(`Valor: ${contract.value}`);
      console.log(`Parcelas pagas: ${contract.installments_paid}`);
      console.log(`Valor parcela: ${contract.installment_value}`);
      console.log(`Saldo esperado: ${expectedBalance}`);
      console.log(`Status atual: ${contract.status}`);
    });
    
    // 3. Tentar corrigir contratos inconsistentes
    if (inconsistentContracts.length > 0) {
      console.log('\n3. Corrigindo contratos inconsistentes...');
      
      for (const contract of inconsistentContracts) {
        const expectedBalance = contract.value - (contract.installments_paid * contract.installment_value);
        
        // Atualizar para ATIVO se ainda tiver saldo
        if (expectedBalance > 0) {
          const { error: updateError } = await supabase
            .from('contracts')
            .update({
              status: 'ATIVO',
              balance: expectedBalance,
              remaining_installments: Math.ceil(expectedBalance / contract.installment_value)
            })
            .eq('id', contract.id);
          
          if (updateError) {
            console.error(`ERRO ao atualizar contrato ${contract.id}:`, updateError.message);
          } else {
            console.log(`✅ Contrato ${contract.id} corrigido para ATIVO`);
          }
        }
      }
    }
    
    // 4. Verificar se há função para reconstruir views
    console.log('\n4. Tentando reconstruir views...');
    
    const { data: refreshResult, error: refreshError } = await supabase
      .rpc('refresh_employee_loans_summary');
    
    if (refreshError) {
      console.log('Função refresh não encontrada, tentando alternativa...');
      
      // Tentar SQL direto via RPC se disponível
      const { data: sqlResult, error: sqlError } = await supabase
        .rpc('execute_sql', {
          sql: 'REFRESH MATERIALIZED VIEW employee_loans_summary; REFRESH MATERIALIZED VIEW loan_stats;'
        });
      
      if (sqlError) {
        console.log('⚠️  Não foi possível reconstruir as views automaticamente');
        console.log('   Será necessário executar manualmente no painel Supabase');
      } else {
        console.log('✅ Views reconstruídas com sucesso');
      }
    } else {
      console.log('✅ Views reconstruídas com sucesso');
    }
    
    // 5. Verificar resultado final
    console.log('\n5. Verificando resultado final...');
    const { data: finalStats, error: finalError } = await supabase
      .from('loan_stats')
      .select('*')
      .single();
    
    if (finalError) {
      console.error('ERRO ao verificar stats finais:', finalError);
    } else {
      console.log('Stats após correção:');
      console.log(`- Saldo devedor: ${finalStats.saldo_devedor}`);
      console.log(`- Total recebido: ${finalStats.total_recebido}`);
      console.log(`- Recebível mês: ${finalStats.recebivel_mes}`);
      console.log(`- Contratos ativos: ${finalStats.contratos_ativos}`);
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

fixContracts();
