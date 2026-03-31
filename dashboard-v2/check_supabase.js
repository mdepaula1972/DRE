const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('\n=== SUPABASE DIAGNOSTIC ===\n');

  // Check employees count
  const { count: empCount, error: e1 } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });
  console.log(`employees: ${e1 ? '❌ ' + e1.message : empCount + ' rows'}`);

  // Check employee_loans count + sample columns
  const { data: loans, error: e2 } = await supabase
    .from('employee_loans')
    .select('*')
    .limit(2);
  if (e2) {
    console.log(`employee_loans: ❌ ${e2.message}`);
  } else {
    console.log(`employee_loans: ${loans.length} sample rows`);
    if (loans.length > 0) {
      console.log('  Columns found:', Object.keys(loans[0]).join(', '));
      console.log('  Sample row 1:', JSON.stringify(loans[0], null, 2));
    }
  }

  // Check employees sample columns
  const { data: emps, error: e3 } = await supabase
    .from('employees')
    .select('*')
    .limit(2);
  if (e3) {
    console.log(`employees details: ❌ ${e3.message}`);
  } else if (emps && emps.length > 0) {
    console.log(`\nemployees columns: ${Object.keys(emps[0]).join(', ')}`);
    console.log(`Sample employee: ${emps[0].full_name || emps[0].name || JSON.stringify(emps[0])}`);
  }

  // Check if is_test column exists
  const { data: testCheck, error: e4 } = await supabase
    .from('employee_loans')
    .select('is_test')
    .limit(1);
  console.log(`\nis_test column: ${e4 ? '❌ Does NOT exist (' + e4.message + ')' : '✅ EXISTS'}`);

  // Check what views exist
  const views = ['employee_loans_summary', 'loan_stats', 'loan_projections', 'contracts'];
  console.log('\n=== VIEW CHECK ===');
  for (const v of views) {
    const { error } = await supabase.from(v).select('*', { count: 'exact', head: true });
    console.log(`  ${v}: ${error ? '❌ ' + error.message : '✅ exists'}`);
  }

  console.log('\n=== DONE ===');
}

check().catch(console.error);
