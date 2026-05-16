import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyPolicies() {
  console.log('🔓 Aplicando políticas de acesso público...');
  
  const sql = `
    ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public Access" ON public.organizations;
    CREATE POLICY "Public Access" ON public.organizations FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Access" ON public.companies;
    CREATE POLICY "Public Access" ON public.companies FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public Access" ON public.documents;
    CREATE POLICY "Public Access" ON public.documents FOR ALL USING (true);
  `;

  // No Supabase-JS can't run arbitrary SQL easily without RPC.
  // BUT we can use the 'supabase' CLI to do it if we find the right command.
  // Actually, let's use the REST API to check if we can reach it.
  
  console.log('Verifying connection...');
  const { data, error } = await supabase.from('organizations').select('id');
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Connection OK, found', data.length, 'orgs.');
  }
}

applyPolicies();
