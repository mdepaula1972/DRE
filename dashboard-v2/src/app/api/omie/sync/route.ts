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
    const allContasFull: any[] = [];
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

        allContasFull.push(...allFromApp);
      } catch (e: any) {
        errors.push(`[${app.name}] Fetch error: ${e.message}`);
      }
    }

    if (allContasFull.length === 0) {
      return NextResponse.json({
        status: 'warning',
        message: `Nenhum lançamento alterado nos últimos 7 dias foi encontrado no Omie.`,
        errors
      });
    }

    // 4. Buscar Dimensões do Supabase para atualizar a omie_raw com nomes amigáveis
    const [catData, projData] = await Promise.all([
      supabase.from('omie_dim_categorias').select('codigo_categoria,descricao_categoria'),
      supabase.from('omie_dim_projetos').select('codigo_projeto,descricao_projeto')
    ]);

    const catMap = new Map((catData.data || []).map(c => [c.codigo_categoria, c.descricao_categoria]));
    const projMap = new Map((projData.data || []).map(p => [String(p.codigo_projeto), p.descricao_projeto]));

    // 5. Batch update Supabase em paralelo
    let updatedCount = 0;
    const BATCH = 10; // Batch menor pois faremos operações em múltiplas tabelas

    for (let i = 0; i < allContasFull.length; i += BATCH) {
      const batch = allContasFull.slice(i, i + BATCH);
      
      await Promise.all(batch.map(async (c: any) => {
        try {
          const omieId = c.codigo_lancamento_omie;
          const status = c.status_titulo;
          const dataVenc = c.data_vencimento;
          const dataBaixa = c.data_baixa;
          const dataReg = c.data_entrada || c.info?.dInc; // Preferência por data_entrada para permitir correção manual

          const isoReg = dataReg ? dataReg.split('/').reverse().join('-') : null;
          const isoVenc = dataVenc ? dataVenc.split('/').reverse().join('-') : null;
          const isoBaixa = dataBaixa ? dataBaixa.split('/').reverse().join('-') : null;

          // A. Atualizar Tabela Legada (compatibilidade)
          await supabase
            .from('omie_cp_titulos')
            .update({ 
              status_titulo: status, 
              valor_pago: parseFloat(c.valor_pag || c.valor_pago || '0') || 0,
              data_entrada: isoReg,
              data_pagamento: isoBaixa
            })
            .eq('codigo_lancamento_omie', omieId);

          // B. Atualizar Nova Tabela omie_raw
          // Como omie_raw é explodida por rateio, atualizamos todas as linhas desse ID
          await supabase
            .from('omie_raw')
            .update({ 
              status: status,
              data_registro: isoReg,
              data_vencimento: isoVenc,
              data_pagamento: isoBaixa,
              categoria_nome: catMap.get(c.codigo_categoria) || c.codigo_categoria,
              projeto_nome: projMap.get(String(c.codigo_projeto)) || c.nome_projeto || 'Sem Projeto',
              raw_data: c,
              sync_at: new Date().toISOString()
            })
            .eq('omie_id', omieId);

          updatedCount++;
        } catch (err) {
          errors.push(`Erro ao processar ID ${c.codigo_lancamento_omie}: ${err}`);
        }
      }));
    }

    return NextResponse.json({
      status: errors.length === 0 ? 'success' : 'partial',
      message: `✅ ${updatedCount} lançamentos sincronizados e auditados na omie_raw (últimos 7 dias).`,
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
