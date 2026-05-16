const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkViews() {
  console.log('\n=== VIEW COLUMNS ===\n');

  // Check employee_loans_summary
  const { data: emp_sum, error: e1 } = await supabase
    .from('employee_loans_summary')
    .select('*')
    .limit(2);
  if (e1) {
    console.log('employee_loans_summary: ❌', e1.message);
  } else if (emp_sum && emp_sum.length > 0) {
    console.log('employee_loans_summary columns:', Object.keys(emp_sum[0]).join(', '));
    console.log('Sample:', JSON.stringify(emp_sum[0], null, 2));
  } else {
    console.log('employee_loans_summary: 0 rows (view exists but empty)');
  }

  // Check loan_stats
  const { data: stats, error: e2 } = await supabase
    .from('loan_stats')
    .select('*')
    .limit(1);
  if (e2) {
    console.log('\nloan_stats: ❌', e2.message);
  } else if (stats && stats.length > 0) {
    console.log('\nloan_stats columns:', Object.keys(stats[0]).join(', '));
    console.log('Values:', JSON.stringify(stats[0], null, 2));
  } else {
    console.log('\nloan_stats: 0 rows');
  }

  // Check loan_projections
  const { data: proj, error: e3 } = await supabase
    .from('loan_projections')
    .select('*')
    .limit(3);
  if (e3) {
    console.log('\nloan_projections: ❌', e3.message);
  } else if (proj && proj.length > 0) {
    console.log('\nloan_projections columns:', Object.keys(proj[0]).join(', '));
    console.log('Sample:', JSON.stringify(proj[0], null, 2));
  } else {
    console.log('\nloan_projections: 0 rows');
  }

  // Check contracts
  const { data: contracts, error: e4 } = await supabase
    .from('contracts')
    .select('*')
    .limit(2);
  if (e4) {
    console.log('\ncontracts: ❌', e4.message);
  } else if (contracts && contracts.length > 0) {
    console.log('\ncontracts columns:', Object.keys(contracts[0]).join(', '));
    console.log('Sample:', JSON.stringify(contracts[0], null, 2));
  } else {
    console.log('\ncontracts: 0 rows');
  }

  console.log('\n=== DONE ===');
}

checkViews().catch(console.error);
