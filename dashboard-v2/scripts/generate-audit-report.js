const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

function formatCurrency(value) {
  return 'R$ ' + (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

async function generateReport() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('           RELATÓRIO COMPLETO - AUDITORIA DE EMPRÉSTIMOS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let report = [];
  report.push('RELATÓRIO DE AUDITORIA - DASHBOARD DE EMPRÉSTIMOS');
  report.push('Gerado em: ' + new Date().toLocaleString('pt-BR'));
  report.push('=' .repeat(80));
  report.push('');

  // 1. Verificar empresas únicas
  console.log('1️⃣  VERIFICANDO EMPRESAS...\n');
  report.push('1. EMPRESAS ENCONTRADAS NO BANCO:');
  report.push('-'.repeat(80));
  
  const { data: employees } = await supabase
    .from('employees')
    .select('id, corporate_name, company, pj_type, status, loans_data, loan_amount, loan_installments');

  const companies = {};
  employees?.forEach(emp => {
    const company = emp.company || 'NÃO DEFINIDO';
    if (!companies[company]) {
      companies[company] = { count: 0, withLoans: 0, names: [] };
    }
    companies[company].count++;
    if (emp.loans_data && emp.loans_data.length > 0) {
      companies[company].withLoans++;
    }
    if (companies[company].names.length < 3) {
      companies[company].names.push(emp.corporate_name?.substring(0, 40));
    }
  });

  console.log('   Empresas encontradas:');
  Object.entries(companies).forEach(([name, data]) => {
    console.log(`   • ${name}: ${data.count} colaboradores (${data.withLoans} com empréstimos)`);
    console.log(`     Exemplos: ${data.names.join(', ')}`);
    report.push(`Empresa: ${name}`);
    report.push(`  Total colaboradores: ${data.count}`);
    report.push(`  Com empréstimos: ${data.withLoans}`);
    report.push(`  Exemplos: ${data.names.join(', ')}`);
    report.push('');
  });

  // 2. Verificar valores únicos de vínculo
  console.log('\n2️⃣  VERIFICANDO TIPOS DE VÍNCULO...\n');
  report.push('2. TIPOS DE VÍNCULO:');
  report.push('-'.repeat(80));
  
  const linkTypes = {};
  employees?.forEach(emp => {
    const type = emp.pj_type ? 'PJ' : 'CLT';
    if (!linkTypes[type]) linkTypes[type] = 0;
    linkTypes[type]++;
  });

  Object.entries(linkTypes).forEach(([type, count]) => {
    console.log(`   • ${type}: ${count} colaboradores`);
    report.push(`${type}: ${count} colaboradores`);
  });

  // 3. Detalhamento por colaborador com empréstimos
  console.log('\n3️⃣  DETALHAMENTO POR COLABORADOR COM EMPRÉSTIMOS...\n');
  report.push('');
  report.push('3. DETALHAMENTO DE COLABORADORES COM EMPRÉSTIMOS:');
  report.push('='.repeat(80));

  const withLoans = employees?.filter(e => e.loans_data && e.loans_data.length > 0) || [];
  
  for (const emp of withLoans.slice(0, 10)) { // Primeiros 10 para não ser muito longo
    console.log(`\n   📋 ${emp.corporate_name}`);
    console.log(`      Empresa: ${emp.company} | Vínculo: ${emp.pj_type ? 'PJ' : 'CLT'} | Status: ${emp.status}`);
    
    report.push('');
    report.push(`Colaborador: ${emp.corporate_name}`);
    report.push(`  ID: ${emp.id}`);
    report.push(`  Empresa: ${emp.company}`);
    report.push(`  Vínculo: ${emp.pj_type ? 'PJ' : 'CLT'}`);
    report.push(`  Status: ${emp.status}`);
    report.push(`  Empréstimos:`);

    // Calcular manualmente
    let manualTotal = 0;
    let manualMonthly = 0;
    let contracts = [];

    emp.loans_data?.forEach((loan, idx) => {
      const amount = parseFloat(loan.amount) || 0;
      const installments = parseInt(loan.installments) || 0;
      const installmentValue = amount / installments;
      manualTotal += amount;
      manualMonthly += installmentValue;

      // Calcular parcelas restantes
      const startDate = new Date(loan.start_cycle + '-01');
      const now = new Date();
      const monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
      const remaining = Math.max(0, installments - monthsPassed);

      console.log(`      Contrato ${idx + 1}:`);
      console.log(`        Valor: ${formatCurrency(amount)} | Parcelas: ${installments}x de ${formatCurrency(installmentValue)}`);
      console.log(`        Início: ${loan.start_cycle} | Restantes: ${remaining}`);
      
      report.push(`    Contrato ${idx + 1}:`);
      report.push(`      Valor: ${formatCurrency(amount)}`);
      report.push(`      Parcelas: ${installments}x de ${formatCurrency(installmentValue)}`);
      report.push(`      Início: ${loan.start_cycle}`);
      report.push(`      Parcelas restantes (manual): ${remaining}`);
      
      contracts.push({ amount, installments, installmentValue, remaining, start_cycle: loan.start_cycle });
    });

    console.log(`      📊 Totais Manuais: Tomado=${formatCurrency(manualTotal)}, Mensal=${formatCurrency(manualMonthly)}`);
    report.push(`    TOTAIS MANUAIS:`);
    report.push(`      Total Tomado: ${formatCurrency(manualTotal)}`);
    report.push(`      Parcela Mensal: ${formatCurrency(manualMonthly)}`);

    // Buscar view
    const { data: viewData } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .eq('employee_id', emp.id)
      .single();

    if (viewData) {
      console.log(`      📊 Totais View:   Tomado=${formatCurrency(viewData.total_loaned)}, Mensal=${formatCurrency(viewData.monthly_installment)}, Contratos=${viewData.active_contracts}`);
      report.push(`    TOTAIS VIEW:`);
      report.push(`      Total Tomado: ${formatCurrency(viewData.total_loaned)}`);
      report.push(`      Parcela Mensal: ${formatCurrency(viewData.monthly_installment)}`);
      report.push(`      Contratos Ativos: ${viewData.active_contracts}`);
      report.push(`      Saldo Devedor: ${formatCurrency(viewData.total_balance)}`);
      report.push(`      Total Recebido: ${formatCurrency(viewData.total_received)}`);
      
      // Verificar diferenças
      if (Math.abs(manualTotal - viewData.total_loaned) > 0.01) {
        console.log(`      ⚠️  DIFERENÇA no Total: Manual=${formatCurrency(manualTotal)} vs View=${formatCurrency(viewData.total_loaned)}`);
        report.push(`    ⚠️ DIFERENÇA DETECTADA NO TOTAL!`);
      }
    }
    report.push('-'.repeat(80));
  }

  // 4. Estatísticas gerais
  console.log('\n4️⃣  ESTATÍSTICAS GERAIS...\n');
  report.push('');
  report.push('4. ESTATÍSTICAS GERAIS (VIEW):');
  report.push('='.repeat(80));

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
    console.log(`   📌 Contratos Liquid.: ${stats.contratos_liquidados}`);
    console.log(`   📌 Maior Empréstimo:  ${formatCurrency(stats.maior_emprestimo)} (${stats.maior_emprestimo_ref})`);
    console.log(`   📌 Próximo Encerrar:  ${stats.proximo_encerrar} (${stats.parcelas_restantes} parcelas)`);

    report.push(`Total Emprestado: ${formatCurrency(stats.total_emprestado)}`);
    report.push(`Saldo Devedor: ${formatCurrency(stats.saldo_devedor)}`);
    report.push(`Total Recebido: ${formatCurrency(stats.total_recebido)}`);
    report.push(`Recebível/Mês: ${formatCurrency(stats.recebivel_mes)}`);
    report.push(`Contratos Ativos: ${stats.contratos_ativos}`);
    report.push(`Contratos Liquidados: ${stats.contratos_liquidados}`);
    report.push(`Maior Empréstimo: ${formatCurrency(stats.maior_emprestimo)} (${stats.maior_emprestimo_ref})`);
    report.push(`Próximo a Encerrar: ${stats.proximo_encerrar} (${stats.parcelas_restantes} parcelas restantes)`);
  }

  // 5. Projeções mensais
  console.log('\n5️⃣  PROJEÇÕES MENSAIS...\n');
  report.push('');
  report.push('5. PROJEÇÕES MENSAIS:');
  report.push('-'.repeat(80));

  const { data: projections } = await supabase
    .from('loan_projections')
    .select('*')
    .order('month', { ascending: true });

  if (projections) {
    console.log('   Mês      | Total        | Previsto');
    console.log('   ---------|--------------|--------------');
    report.push('Mês      | Total        | Previsto');
    report.push('-'.repeat(50));
    
    projections.forEach(p => {
      console.log(`   ${p.month}    | ${formatCurrency(p.total).padEnd(12)} | ${formatCurrency(p.previsto)}`);
      report.push(`${p.month}    | ${formatCurrency(p.total).padEnd(12)} | ${formatCurrency(p.previsto)}`);
    });
  }

  // 6. Resumo de problemas
  console.log('\n6️⃣  RESUMO DE PROBLEMAS IDENTIFICADOS...\n');
  report.push('');
  report.push('6. RESUMO DE PROBLEMAS:');
  report.push('='.repeat(80));

  const problems = [];
  
  // Verificar se há empresas incorretas
  Object.keys(companies).forEach(company => {
    if (company === 'P1' || company === 'MayBR' || company === 'MarBR') {
      if (company !== 'MarBR') {
        problems.push(`Empresa '${company}' encontrada (deveria ser 'MarBR'?)`);
      }
    }
  });

  // Verificar projeções lineares
  if (projections && projections.length > 1) {
    const firstValue = projections[0].total;
    const lastValue = projections[projections.length - 1].total;
    if (firstValue === lastValue) {
      problems.push('Projeções estão lineares (mesmo valor todos os meses) - deveria decair conforme contratos terminam');
    }
  }

  if (problems.length === 0) {
    console.log('   ✅ Nenhum problema identificado no relatório');
    report.push('Nenhum problema identificado.');
  } else {
    problems.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p}`);
      report.push(`${i + 1}. ${p}`);
    });
  }

  // Salvar relatório em arquivo
  const reportPath = path.join(__dirname, 'audit-report.txt');
  fs.writeFileSync(reportPath, report.join('\n'), 'utf8');
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`✅ RELATÓRIO SALVO EM: ${reportPath}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
}

generateReport().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
