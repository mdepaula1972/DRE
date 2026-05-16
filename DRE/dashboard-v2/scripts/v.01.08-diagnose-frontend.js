// v.01.08 - Diagnóstico de corrupção no Frontend/DOM
// Execute no Console do navegador (F12) quando o app estiver aberto

(async function diagnoseDataCorruption() {
  console.log('%c🔍 DIAGNÓSTICO DE CORRUPÇÃO DE DADOS', 'font-size: 16px; font-weight: bold; color: #e11d48');
  console.log('');
  
  // 1. Verificar dados brutos do Supabase
  console.log('%c1. DADOS BRUTOS DO SUPABASE:', 'font-weight: bold; color: #2563eb');
  
  try {
    const { data: employees, error: empError } = await window.supabase
      .from('employees')
      .select('*')
      .limit(5);
    
    if (empError) {
      console.error('❌ Erro ao buscar employees:', empError);
    } else {
      console.log('✅ Employees retornados:', employees.length);
      console.table(employees.map(e => ({
        id: e.id?.slice(0, 8) + '...',
        name: e.corporate_name || e.full_name,
        is_test: e.is_test,
        loan_amount: e.loan_amount
      })));
    }
  } catch (e) {
    console.error('❌ Erro crítico:', e);
  }
  
  // 2. Verificar views
  console.log('');
  console.log('%c2. VIEWS DO SUPABASE:', 'font-weight: bold; color: #2563eb');
  
  try {
    const { data: summary, error: sumError } = await window.supabase
      .from('employee_loans_summary')
      .select('*')
      .limit(5);
    
    if (sumError) {
      console.error('❌ Erro na view employee_loans_summary:', sumError);
    } else {
      console.log('✅ employee_loans_summary retornou:', summary.length, 'registros');
      if (summary.length > 0) {
        console.table(summary.map(s => ({
          employee: s.employee_name?.slice(0, 20),
          total_loaned: s.total_loaned,
          total_balance: s.total_balance,
          is_test: s.is_test
        })));
      }
    }
  } catch (e) {
    console.error('❌ Erro crítico:', e);
  }
  
  // 3. Verificar localStorage
  console.log('');
  console.log('%c3. LOCALSTORAGE:', 'font-weight: bold; color: #2563eb');
  const dataMode = localStorage.getItem('dataMode');
  console.log('dataMode:', dataMode || 'não definido');
  
  // 4. Verificar estado do React (se possível)
  console.log('');
  console.log('%c4. INSTRUÇÕES ADICIONAIS:', 'font-weight: bold; color: #059669');
  console.log('Se os dados acima estão OK mas a UI mostra errado, o problema é no DOM/frontend.');
  console.log('Se os dados acima já estão corrompidos, o problema é no Supabase.');
  console.log('');
  console.log('Para verificar o DOM:');
  console.log('1. Abra os DevTools (F12)');
  console.log('2. Vá em "Elements"');
  console.log('3. Procure por divs com classe "NaN", "undefined" ou valores vazios');
  console.log('4. Ou vá em "Console" e veja se há erros em vermelho');
  
})();
