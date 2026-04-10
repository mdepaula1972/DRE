const { createClient } = require('@supabase/supabase-js');

// Using the same credentials from .env
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('Buscando LUIZ VICTOR DA COSTA CRUZ em omie_cp_titulos...');
  
  const { data: cpData, error: cpErr } = await supabase
    .from('omie_cp_titulos')
    .select('*')
    .ilike('payload_json', '%LUIZ VICTOR%');

  const results = cpData || [];
  const matches = results.filter(r => r.payload_json && r.payload_json.includes('1048'));
  console.log('Resultados CP Encontrados para 1048:', JSON.stringify(matches, null, 2));

  if (cpErr) console.error('Erro CP:', cpErr);
  else console.log('Resultados CP:', JSON.stringify(cpData, null, 2));

  const { data: movData, error: movErr } = await supabase
    .from('omie_mov_saidas')
    .select('*')
    .ilike('payload_json', '%LUIZ VICTOR%')
    .limit(3);

  if (movErr) console.error('Erro MOV:', movErr);
  else console.log('Resultados MOV:', JSON.stringify(movData, null, 2));
}

check();
