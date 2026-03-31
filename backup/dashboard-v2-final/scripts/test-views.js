const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViews() {
  console.log('🧪 Testando views do dashboard...\n');

  // Test 1: employee_loans_summary
  console.log('1️⃣ employee_loans_summary:');
  try {
    const { data, error } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log(`   ✅ OK - ${data.length} registros`);
      if (data.length > 0) {
        console.log('   Exemplo:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      }
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  // Test 2: loan_stats
  console.log('\n2️⃣ loan_stats:');
  try {
    const { data, error } = await supabase
      .from('loan_stats')
      .select('*')
      .single();
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log('   ✅ OK');
      console.log('   Dados:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  // Test 3: loan_projections
  console.log('\n3️⃣ loan_projections:');
  try {
    const { data, error } = await supabase
      .from('loan_projections')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log(`   ✅ OK - ${data.length} registros`);
      if (data.length > 0) {
        console.log('   Primeiros 3:', data.slice(0, 3));
      }
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  // Test 4: contracts
  console.log('\n4️⃣ contracts:');
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('   ❌ Erro:', error.message);
    } else {
      console.log(`   ✅ OK - ${data.length} registros`);
      if (data.length > 0) {
        console.log('   Exemplo:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      }
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  console.log('\n✅ Testes concluídos!');
}

testViews();
