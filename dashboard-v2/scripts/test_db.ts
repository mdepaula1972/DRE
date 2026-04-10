import { supabase } from '../src/lib/supabase';

async function test() {
  const { data } = await supabase.from('omie_cp_titulos').select('*').limit(2);
  console.log("CP Keys:", Object.keys(data[0]));
}

test().catch(console.error);
