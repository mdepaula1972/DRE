import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const keys = [
      { name: 'Mar Brasil', key: process.env.OMIE_APP_KEY_MARBRASIL, secret: process.env.OMIE_APP_SECRET_MARBRASIL },
      { name: 'DZM', key: process.env.OMIE_APP_KEY_DZM, secret: process.env.OMIE_APP_SECRET_DZM }
    ].filter(k => k.key && k.secret);

    if (keys.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Credenciais Omie não configuradas no Vercel (OMIE_APP_KEY_...).' },
        { status: 400 }
      );
    }

    // Last 7 days in DD/MM/YYYY
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const deStr = `${String(d7.getDate()).padStart(2,'0')}/${String(d7.getMonth()+1).padStart(2,'0')}/${d7.getFullYear()}`;

    // Fetch ONE page from Omie per company in parallel (fast, avoids Vercel timeout)
    // The most recently altered records appear on page 1 (Omie sorts by alteration date desc)
    const MAX_PAGES = 5;

    const fetchOmiePage = async (app: typeof keys[0], pagina: number) => {
      const res = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call: 'ListarContasPagar',
          app_key: app.key,
          app_secret: app.secret,
          param: [{
            pagina,
            registros_por_pagina: 100,
            filtrar_por_data_de: deStr,
            filtrar_apenas_inclusao: "N",
            filtrar_apenas_alteracao: "S"
          }]
        })
      });
      return res.json();
    };

    // Collect all records from multiple pages in parallel
    const allContas: Array<{ codigo_lancamento_omie: number; status_titulo: string; valor_pago: number }> = [];
    const errors: string[] = [];

    for (const app of keys) {
      try {
        // Fetch page 1 first to know total pages
        const firstData = await fetchOmiePage(app, 1);

        if (firstData.faultstring) {
          errors.push(`[${app.name}] Omie: ${firstData.faultstring}`);
          continue;
        }

        const totalPages = Math.min(firstData.total_de_paginas || 1, MAX_PAGES);
        const firstContas = firstData.conta_pagar_cadastro || [];

        // Fetch remaining pages in parallel
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const remainingData = await Promise.all(remainingPages.map(p => fetchOmiePage(app, p)));

        const allFromApp = [
          ...firstContas,
          ...remainingData.flatMap(d => d.conta_pagar_cadastro || [])
        ];

        for (const c of allFromApp) {
          if (!c.codigo_lancamento_omie || !c.status_titulo) continue;
          allContas.push({
            codigo_lancamento_omie: c.codigo_lancamento_omie,
            status_titulo: c.status_titulo,
            valor_pago: parseFloat(c.valor_pag || c.valor_pago || '0') || 0
          });
        }
      } catch (e: any) {
        errors.push(`[${app.name}] Fetch error: ${e.message}`);
      }
    }

    if (allContas.length === 0) {
      return NextResponse.json({
        status: 'warning',
        message: `Nenhum lançamento alterado nos últimos 7 dias foi encontrado no Omie.`,
        errors
      });
    }

    // Batch update Supabase in parallel (groups of 20 to avoid rate limits)
    let updatedCount = 0;
    const BATCH = 20;

    for (let i = 0; i < allContas.length; i += BATCH) {
      const batch = allContas.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(c =>
          supabase
            .from('omie_cp_titulos')
            .update({ status_titulo: c.status_titulo, valor_pago: c.valor_pago })
            .eq('codigo_lancamento_omie', c.codigo_lancamento_omie)
        )
      );
      for (const { error } of results) {
        if (error) errors.push(error.message);
        else updatedCount++;
      }
    }

    return NextResponse.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: `✅ ${updatedCount} de ${allContas.length} lançamentos sincronizados (últimos 7 dias, ${MAX_PAGES} páginas).`,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
