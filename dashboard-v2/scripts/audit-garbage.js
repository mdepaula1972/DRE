const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scanGarbage() {
  console.log('🔍 Conectando à API Root do Supabase...\n');
  
  // Acessa o OpenAPI do Supabase para descobrir todas as tabelas/views sem precisar da senha root
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
  const openapi = await res.json();
  
  const entities = Object.keys(openapi.paths)
    .map(p => p.replace('/', ''))
    .filter(p => p !== '' && !p.includes('rpc/'));
    
  console.log(`📊 Encontradas ${entities.length} tabelas/views.\nVerificando conteúdo (isso pode levar alguns segundos)...\n`);
  
  const report = [];
  
  for (const entity of entities) {
    const { count, error } = await supabase.from(entity).select('*', { count: 'exact', head: true });
    
    if (error) {
      report.push({ name: entity, status: 'ERROR', detail: error.message });
    } else {
      report.push({ name: entity, status: count > 0 ? 'ACTIVE' : 'EMPTY', count });
    }
  }
  
  console.log("=========================================");
  console.log("   AUDITORIA DE LIXO NO SUPABASE");
  console.log("=========================================\n");

  const testEntities = report.filter(r => r.name.includes('_test'));
  console.log(`⚠️  LIXO SUSPEITO (Sufixo _test): ${testEntities.length}`);
  testEntities.forEach(r => console.log(`   - ${r.name.padEnd(25)} [${r.status}: ${r.count || 0} linhas]`));

  const emptyEntities = report.filter(r => r.status === 'EMPTY' && !r.name.includes('_test'));
  console.log(`\n👻 TABELAS/VIEWS VAZIAS (Sem uso?): ${emptyEntities.length}`);
  emptyEntities.forEach(r => console.log(`   - ${r.name}`));

  const activeEntities = report.filter(r => r.status === 'ACTIVE' && !r.name.includes('_test'));
  console.log(`\n✅ OBJETOS ATIVOS (Com dados de produção): ${activeEntities.length}`);
  activeEntities.forEach(r => console.log(`   - ${r.name.padEnd(25)} [${r.count} linhas]`));
  
  const errorEntities = report.filter(r => r.status === 'ERROR');
  if (errorEntities.length > 0) {
    console.log(`\n❌ OBJETOS QUEBRADOS (Erros na estrutura): ${errorEntities.length}`);
    errorEntities.forEach(r => console.log(`   - ${r.name.padEnd(25)} [ERRO: ${r.detail}]`));
  }
  
  console.log("\n=========================================\n");
  console.log("Recomendação: Copie o script CASCADE gerado anteriormente e adicione comandos DROP VIEW IF EXISTS para os casos de lixo.");
}

scanGarbage().catch(console.error);
