const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

function formatCurrency(value) {
  return 'R$ ' + (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function auditCalculations() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 AUDITORIA DE CÁLCULOS - DASHBOARD DE EMPRÉSTIMOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Verificar dados brutos vs views
  console.log('1️⃣  COMPARAÇÃO: Dados Brutos vs View\n');
  
  const { data: employees } = await supabase
    .from('employees')
    .select('id, corporate_name, company, loans_data, loan_amount, loan_installments, status')
    .not('loans_data', 'is', null);

  let totalRawLoaned = 0;
  let totalViewLoaned = 0;
  let discrepancies = [];

  for (const emp of employees || []) {
    // Calcular manualmente
    let rawTotal = 0;
    let rawContracts = 0;
    if (emp.loans_data && Array.isArray(emp.loans_data)) {
      emp.loans_data.forEach(loan => {
        rawTotal += parseFloat(loan.amount) || 0;
        rawContracts++;
      });
    }
    totalRawLoaned += rawTotal;

    // Buscar view
    const { data: view } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .eq('employee_id', emp.id)
      .single();

    if (view) {
      totalViewLoaned += view.total_loaned || 0;
      
      // Verificar discrepância
      if (Math.abs(rawTotal - view.total_loaned) > 0.01 || rawContracts !== view.active_contracts) {
        discrepancies.push({
          name: emp.corporate_name,
          rawTotal,
          viewTotal: view.total_loaned,
          rawContracts,
          viewContracts: view.active_contracts,
          loans: emp.loans_data
        });
      }
    }
  }

  console.log(`   📊 Total bruto calculado: ${formatCurrency(totalRawLoaned)}`);
  console.log(`   📊 Total da view:         ${formatCurrency(totalViewLoaned)}`);
  console.log(`   📊 Diferença:             ${formatCurrency(totalRawLoaned - totalViewLoaned)}\n`);

  if (discrepancies.length > 0) {
    console.log('   ⚠️  DISCREPÂNCIAS ENCONTRADAS:\n');
    discrepancies.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name}`);
      console.log(`      Bruto: R$ ${d.rawTotal} (${d.rawContracts} contratos)`);
      console.log(`      View:  R$ ${d.viewTotal} (${d.viewContracts} contratos)`);
      console.log(`      Dados: ${JSON.stringify(d.loans)}\n`);
    });
  }

  // 2. Verificar estatísticas gerais
  console.log('═══════════════════════════════════════════════════════════');
  console.log('2️⃣  ESTATÍSTICAS GERAIS\n');

  const { data: stats } = await supabase
    .from('loan_stats')
    .select('*')
    .single();

  if (stats) {
    console.log(`   📌 Total Emprestado:  ${formatCurrency(stats.total_emprestado)}`);
    console.log(`   📌 Saldo Devedor:     ${formatCurrency(stats.saldo_devedor)}`);
    console.log(`   📌 Total Recebido:    ${formatCurrency(stats.total_recebido)}`);
    console.log(`   📌 Recebível/Mês:     ${formatCurrency(stats.recebivel_mes)}`);
    console.log(`   📌 Contratos Ativos:  ${stats.contratos_ativos}`);
    console.log(`   📌 Próximo Encerrar:  ${stats.proximo_encerrar}`);
    console.log(`   📌 Parcelas Restantes: ${stats.parcelas_restantes}\n`);
  }

  // 3. Verificar projeções
  console.log('═══════════════════════════════════════════════════════════');
  console.log('3️⃣  PROJEÇÕES MENSAIS\n');

  const { data: projections } = await supabase
    .from('loan_projections')
    .select('*')
    .limit(6);

  if (projections) {
    projections.forEach(p => {
      console.log(`   ${p.month}: Total=${formatCurrency(p.total)}, Previsto=${formatCurrency(p.previsto)}`);
    });
  }

  // 4. Detalhe de um funcionário específico (Ana Carolina)
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('4️⃣  DETALHE: ANA CAROLINA (primeira com empréstimos)\n');

  const { data: ana } = await supabase
    .from('employees')
    .select('*')
    .ilike('corporate_name', '%ANA CAROLINA%')
    .single();

  if (ana) {
    console.log(`   Nome: ${ana.corporate_name}`);
    console.log(`   Empresa: ${ana.company}`);
    console.log(`   Status: ${ana.status}`);
    console.log(`\n   📋 EMPRÉSTIMOS BRUTOS:`);
    if (ana.loans_data) {
      ana.loans_data.forEach((loan, i) => {
        console.log(`      ${i + 1}. R$ ${loan.amount} - ${loan.installments}x parcelas`);
        console.log(`         Início: ${loan.start_cycle}, Solicitação: ${loan.request_date}`);
      });
    }

    const { data: anaView } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .eq('employee_id', ana.id)
      .single();

    if (anaView) {
      console.log(`\n   📊 CÁLCULOS DA VIEW:`);
      console.log(`      Total Tomado:      ${formatCurrency(anaView.total_loaned)}`);
      console.log(`      Total Recebido:    ${formatCurrency(anaView.total_received)}`);
      console.log(`      Saldo Devedor:     ${formatCurrency(anaView.total_balance)}`);
      console.log(`      Parcela Mensal:    ${formatCurrency(anaView.monthly_installment)}`);
      console.log(`      Contratos Ativos:  ${anaView.active_contracts}`);
    }

    const { data: anaContracts } = await supabase
      .from('contracts_expanded')
      .select('*')
      .eq('employee_id', ana.id);

    console.log(`\n   📝 CONTRATOS EXPANDIDOS:`);
    if (anaContracts) {
      anaContracts.forEach((c, i) => {
        console.log(`      ${i + 1}. Valor: ${formatCurrency(c.value)}, Parcela: ${formatCurrency(c.installment_value)}`);
        console.log(`         Parcelas restantes: ${c.remaining_installments}, Término: ${c.end_date}`);
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ AUDITORIA CONCLUÍDA');
  console.log('═══════════════════════════════════════════════════════════');
}

auditCalculations().catch(console.error);
