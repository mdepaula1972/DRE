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
        { status: 'error', message: 'Credenciais Omie (OMIE_APP_KEY_...) não configuradas no Vercel.' },
        { status: 400 }
      );
    }

    // Últimos 7 dias em formato DD/MM/YYYY
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const deStr = `${String(d7.getDate()).padStart(2,'0')}/${String(d7.getMonth()+1).padStart(2,'0')}/${d7.getFullYear()}`;

    let updatedCount = 0;
    const errors: string[] = [];

    for (const app of keys) {
      let pagina = 1;
      let totalPaginas = 1;

      while (pagina <= totalPaginas) {
        // Campos exatos conforme documentação/python: filtrar_por_data_de refere a data_alteracao quando combinado com filtrar_apenas_alteracao = "S"
        const omiePayload = {
          call: 'ListarContasPagar',
          app_key: app.key,
          app_secret: app.secret,
          param: [{
            pagina,
            registros_por_pagina: 50,
            filtrar_por_data_de: deStr,
            filtrar_apenas_inclusao: "N",
            filtrar_apenas_alteracao: "S"
          }]
        };

        let data: any;
        try {
          const res = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(omiePayload)
          });
          data = await res.json();
        } catch (fetchErr: any) {
          errors.push(`Fetch error [${app.name}]: ${fetchErr.message}`);
          break;
        }

        if (data.faultstring) {
          errors.push(`Omie fault [${app.name}]: ${data.faultstring}`);
          break;
        }

        totalPaginas = data.total_de_paginas || 1;
        // ListarContasPagar retorna array de objetos PLANOS (não aninhados)
        // Campos baseados em normalize_conta_pagar() do omie_supabase_ingest.py:
        // item.codigo_lancamento_omie, item.status_titulo, item.valor_pago or item.valor_pag
        const contas: any[] = data.conta_pagar_cadastro || [];

        for (const c of contas) {
          const omieCode = c.codigo_lancamento_omie;
          const status = c.status_titulo;
          const valorPago = c.valor_pago ?? c.valor_pag ?? 0;

          if (!omieCode || !status) continue;

          const { error: updateErr } = await supabase
            .from('omie_cp_titulos')
            .update({ status_titulo: status, valor_pago: valorPago })
            .eq('codigo_lancamento_omie', omieCode);

          if (updateErr) {
            errors.push(`Supabase update error [${omieCode}]: ${updateErr.message}`);
          } else {
            updatedCount++;
          }
        }

        pagina++;
      }
    }

    return NextResponse.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: `Sincronizados: ${updatedCount} lançamentos nos últimos 7 dias.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
