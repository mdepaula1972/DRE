import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('--- Cleaning Logística Azul ---');
  const { error: delError } = await supabase
    .from('companies')
    .delete()
    .ilike('legal_name', '%Logística Azul%');
  
  if (delError) console.error('Error deleting Logística Azul:', delError);
  else console.log('Logística Azul records deleted or not found.');
  
  console.log('--- Updating Mar Brasil Name ---');
  const { data: marBrasil, error: updError } = await supabase
    .from('companies')
    .update({ legal_name: 'Mar Brasil Serviços e Locações Ltda' })
    .ilike('legal_name', '%Mar Brasil %')
    .select();
  
  if (updError) {
    console.error('Error updating Mar Brasil:', updError);
  } else if (marBrasil && marBrasil.length > 0) {
    const companyId = marBrasil[0].id;
    console.log(`--- Setting Mar Brasil Logo for ID: ${companyId} ---`);
    const { error: brandError } = await supabase
      .from('company_branding')
      .upsert({ 
        company_id: companyId, 
        logo_url: '/logos/Mar-Brasil-sem-fundo-preto.png',
        primary_color: '#F2911B' 
      }, { onConflict: 'company_id' });
      
    if (brandError) console.error('Error setting branding:', brandError);
    else console.log('Mar Brasil branding updated successfully.');
  } else {
    console.warn('Mar Brasil company not found to update.');
  }

  console.log('Database cleanup finished.');
}

run();
