const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedAnalysis() {
  try {
    console.log('=== ANÁLISE DETALHADA DO PROBLEMA ===\n');
    
    // 1. Verificar estrutura completa da view principal
    console.log('1. Estrutura completa de employee_loans_summary:');
    const { data: employees, error: empError } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .limit(5);
    
    if (empError) {
      console.error('ERRO:', empError);
    } else {
      employees.forEach((emp, idx) => {
        console.log(`\n--- Funcionário ${idx + 1} ---`);
        console.log(`ID: ${emp.employee_id}`);
        console.log(`Nome: ${emp.employee_name}`);
        console.log(`Empresa: ${emp.company}`);
        console.log(`Vínculo: ${emp.link_type}`);
        console.log(`Remuneração: ${emp.remuneration}`);
        console.log(`Total Emprestado: ${emp.total_loaned}`);
        console.log(`Total Recebido: ${emp.total_received}`);
        console.log(`Saldo: ${emp.total_balance}`);
        console.log(`Parcela Mensal: ${emp.monthly_installment}`);
        console.log(`Contratos Ativos: ${emp.active_contracts}`);
        console.log(`Status: ${emp.status}`);
      });
    }
    
    // 2. Verificar contratos individuais
    console.log('\n\n2. Verificando contratos dos funcionários:');
    for (const emp of employees || []) {
      console.log(`\n--- Contratos de ${emp.employee_name} ---`);
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('employee_id', emp.employee_id);
      
      if (contractError) {
        console.error('ERRO nos contratos:', contractError);
      } else {
        console.log(`Contratos encontrados: ${contracts?.length || 0}`);
        contracts.forEach((contract, idx) => {
          console.log(`  Contrato ${idx + 1}:`);
          console.log(`    ID: ${contract.id}`);
          console.log(`    Valor: ${contract.value}`);
          console.log(`    Saldo: ${contract.balance}`);
          console.log(`    Parcelas: ${contract.installments}`);
          console.log(`    Valor Parcela: ${contract.installment_value}`);
          console.log(`    Status: ${contract.status}`);
        });
      }
    }
    
    // 3. Verificar se há problemas com as views de teste
    console.log('\n\n3. Comparando com dados de teste:');
    const { data: testEmployees, error: testError } = await supabase
      .from('employee_loans_summary_test')
      .select('*')
      .limit(3);
    
    if (testError) {
      console.error('ERRO na view de teste:', testError);
    } else {
      testEmployees.forEach((emp, idx) => {
        console.log(`\n--- Funcionário Teste ${idx + 1} ---`);
        console.log(`Nome: ${emp.employee_name}`);
        console.log(`Total Emprestado: ${emp.total_loaned}`);
        console.log(`Saldo: ${emp.total_balance}`);
      });
    }
    
    // 4. Verificar estatísticas em detalhes
    console.log('\n\n4. Estatísticas detalhadas:');
    const { data: stats, error: statsError } = await supabase
      .from('loan_stats')
      .select('*')
      .single();
    
    if (statsError) {
      console.error('ERRO nas stats:', statsError);
    } else {
      console.log('Stats completas:', JSON.stringify(stats, null, 2));
    }
    
  } catch (error) {
    console.error('ERRO GERAL:', error);
  }
}

detailedAnalysis();
