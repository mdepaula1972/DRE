import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/omie/debug-atrasados
// Retorna amostra de registros do Supabase com vencimento passado mas status != PAGO
export async function GET() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Registros com vencimento no passado e status diferente de PAGO
  const { data: atrasados, error: err1 } = await supabase
    .from('omie_cp_titulos')
    .select('codigo_lancamento_omie, status_titulo, data_vencimento, valor_documento, empresa_nome, fornecedor_nome_transferencia')
    .lt('data_vencimento', today)
    .not('status_titulo', 'ilike', '%PAGO%')
    .order('data_vencimento', { ascending: false })
    .limit(10);

  // 2. Todos os valores distintos de status_titulo na tabela (para entender os possíveis valores)
  const { data: allStatuses, error: err2 } = await supabase
    .from('omie_cp_titulos')
    .select('status_titulo')
    .limit(1000);

  const statusCounts: Record<string, number> = {};
  (allStatuses || []).forEach(r => {
    const s = r.status_titulo || 'null';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // 3. Total de registros que seriam exibidos como ATRASADO
  const { count } = await supabase
    .from('omie_cp_titulos')
    .select('*', { count: 'exact', head: true })
    .lt('data_vencimento', today)
    .not('status_titulo', 'ilike', '%PAGO%');

  return NextResponse.json({
    today,
    total_atrasados_no_supabase: count,
    amostra_atrasados: atrasados,
    distribuicao_status_titulo: statusCounts,
    errors: [err1?.message, err2?.message].filter(Boolean)
  });
}
