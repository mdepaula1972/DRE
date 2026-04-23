import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function checkDb() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Checking Organizations...');
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name');
  if (orgError) console.error('Org Error:', orgError);
  else console.log('Orgs:', orgs);

  console.log('Checking Companies...');
  const { data: companies, error: compError } = await supabase.from('companies').select('id, legal_name, organization_id');
  if (compError) console.error('Comp Error:', compError);
  else {
    console.log('Companies:', JSON.stringify(companies, null, 2));
  }
}

checkDb();
