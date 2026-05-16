import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Gerando dados iniciais no Supabase...');

  try {
    // 1. Create Organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({ 
        name: 'Grupo Mar Brasil', 
        slug: 'mar-brasil',
        plan: 'pro'
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log('✅ Organização: Grupo Mar Brasil OK');

    // 2. Create Companies
    const companies = [
      {
        organization_id: org.id,
        legal_name: 'Mar Brasil Serviços Marítimos Ltda',
        trade_name: 'Mar Brasil',
        tax_id: '00.111.222/0001-99',
        slug: 'mar-brasil-servicos',
        status: 'active'
      },
      {
        organization_id: org.id,
        legal_name: 'Logística Azul Navegação S.A.',
        trade_name: 'Log Azul',
        tax_id: '33.444.555/0001-88',
        slug: 'log-azul',
        status: 'active'
      }
    ];

    for (const compData of companies) {
      const { data: company, error: compError } = await supabase
        .from('companies')
        .upsert(compData, { onConflict: 'slug' })
        .select()
        .single();

      if (compError) throw compError;
      
      // Seed Branding for each
      const brandColor = compData.trade_name === 'Mar Brasil' ? '#003366' : '#22c55e';
      
      await supabase
        .from('company_branding')
        .upsert({
          company_id: company.id,
          primary_color: brandColor,
          theme_mode: 'light'
        }, { onConflict: 'company_id' });
        
      console.log(`✅ Empresa: ${compData.trade_name} OK`);
    }

    console.log('🚀 Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no seed:', error);
  }
}

seed();
