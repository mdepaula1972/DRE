const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data: loans, error } = await supabase
      .from('employee_loans_test')
      .select('*')
      .eq('employee_id', '09f4635a-5ed6-4d0a-b9b1-f2637e34be1a')
      .order('request_date', { ascending: false });
      
    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('=== Loans for GAP ===');
      loans.forEach((ln, idx) => {
        console.log(`Loan ${idx+1}: ID=${ln.id} | Amount=${ln.amount} | Date=${ln.request_date} | Notes=${ln.notes}`);
      });
    }
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConnection();
