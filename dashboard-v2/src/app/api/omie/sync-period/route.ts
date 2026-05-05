import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const reqData = await req.json();
    
    let { startDate, endDate, company, month, year } = reqData;

    if (!startDate || !endDate) {
      if (!month || !year) {
        return NextResponse.json({ status: 'error', message: 'Faltam parâmetros de data.' }, { status: 400 });
      }
      const lastDay = new Date(year, month, 0).getDate();
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const formatDateToBR = (isoStr: string) => {
      const [y, m, d] = isoStr.split('-');
      return `${d}/${m}/${y}`;
    };

    const brStart = formatDateToBR(startDate);
    const brEnd = formatDateToBR(endDate);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (p: number) => {
          controller.enqueue(encoder.encode(`data: PROGRESS:${p}\n\n`));
        };
        const sendLog = (msg: string) => {
          controller.enqueue(encoder.encode(`data: LOG: ${msg}\n\n`));
        };

        try {
          const companyName = company || 'Mar Brasil';
          const isDZM = companyName.toUpperCase().includes('DZM');

          const appKey = isDZM ? process.env.OMIE_APP_KEY_DZM : process.env.OMIE_APP_KEY_MARBRASIL;
          const appSecret = isDZM ? process.env.OMIE_APP_SECRET_DZM : process.env.OMIE_APP_SECRET_MARBRASIL;

          if (!appKey || !appSecret) {
            controller.enqueue(encoder.encode(`data: ERROR: Credenciais não configuradas.\n\n`));
            controller.close();
            return;
          }

          // 1. Carregar Mapeamentos (Categorias e Projetos)
          sendLog("Carregando mapeamentos da Omie...");
          const catMap = new Map();
          let catPage = 1;
          while(true) {
            const resCat = await fetch('https://app.omie.com.br/api/v1/geral/categorias/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                call: 'ListarCategorias',
                app_key: appKey, app_secret: appSecret,
                param: [{ pagina: catPage, registros_por_pagina: 500 }]
              })
            }).then(r => r.json());
            const cats = resCat.categoria_cadastro || [];
            cats.forEach((c: any) => catMap.set(String(c.codigo).trim(), c.descricao));
            if (catPage >= resCat.total_de_paginas) break;
            catPage++;
          }

          const projMap = new Map();
          const resProj = await fetch('https://app.omie.com.br/api/v1/geral/projetos/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              call: 'ListarProjetos',
              app_key: appKey, app_secret: appSecret,
              param: [{ pagina: 1, registros_por_pagina: 500 }]
            })
          }).then(r => r.json());
          (resProj.projeto_cadastro || []).forEach((p: any) => projMap.set(String(p.codigo).trim(), p.nome));

          // --- FUNÇÃO AUXILIAR DE SYNC CP ---
          const syncCP = async (filterParams: any, label: string, startProgress: number, endProgress: number) => {
            sendLog(`Fase CP: Buscando por ${label}...`);
            let pagina = 1;
            let totalPaginas = 1;
            while (pagina <= totalPaginas) {
              const resCP = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  call: 'ListarContasPagar',
                  app_key: appKey, app_secret: appSecret,
                  param: [{ pagina, registros_por_pagina: 100, ...filterParams }]
                })
              }).then(r => r.json());

              totalPaginas = resCP.total_de_paginas || 1;
              const records = resCP.conta_pagar_cadastro || [];

              if (records.length > 0) {
                const rows = records
                  .filter((r: any) => r.status_titulo !== 'CANCELADO')
                  .flatMap((r: any) => {
                    const catId = String(r.codigo_categoria || '').trim();
                    const categoria = catMap.get(catId) || `Auditar: ${catId} (${r.descricao_categoria || 'Sem Nome'})`;
                    const projId = String(r.codigo_projeto || '').trim();
                    const projeto = projMap.get(projId) || r.nome_projeto || 'Sem Projeto';

                    const isoReg = r.data_entrada ? r.data_entrada.split('/').reverse().join('-') : null;
                    const isoVenc = r.data_vencimento ? r.data_vencimento.split('/').reverse().join('-') : null;
                    const isoBaixa = r.data_previsao ? r.data_previsao.split('/').reverse().join('-') : null;

                    const dist = r.distribuicao || [{ cDesDep: 'Sem Departamento', nValDep: r.valor_documento }];

                    return dist.map((d: any) => ({
                      empresa_nome: companyName.trim(),
                      omie_id: r.codigo_lancamento_omie,
                      id_global: `cp_${r.codigo_lancamento_omie}`,
                      status: r.status_titulo,
                      valor_total: r.valor_documento,
                      valor_alocado: d.nValDep,
                      data_registro: isoReg,
                      data_vencimento: isoVenc,
                      data_pagamento: isoBaixa,
                      categoria_codigo: catId,
                      categoria_nome: categoria,
                      projeto_nome: projeto,
                      departamento_nome: d.cDesDep || 'Sem Departamento',
                      raw_data: r,
                      fonte: 'CP'
                    }));
                  });

                if (rows.length > 0) {
                  const uniqueIds = [...new Set(rows.map(r => r.omie_id))];
                  await supabase.from('omie_raw').delete().eq('empresa_nome', companyName.trim()).in('omie_id', uniqueIds).eq('fonte', 'CP');
                  await supabase.from('omie_raw').insert(rows);
                }
              }
              sendProgress(startProgress + (pagina / totalPaginas) * (endProgress - startProgress));
              pagina++;
            }
          };

          // Executar as 3 Camadas de CP
          await syncCP({ filtrar_por_registro_de: brStart, filtrar_por_registro_ate: brEnd }, "Data de Registro", 5, 25);
          await syncCP({ filtrar_por_data_de: brStart, filtrar_por_data_ate: brEnd }, "Data de Vencimento", 25, 45);
          await syncCP({ filtrar_por_data_liquidacao_de: brStart, filtrar_por_data_liquidacao_ate: brEnd }, "Data de Pagamento", 45, 65);

          // --- FASE 2: MOVIMENTOS DE CONTA CORRENTE (MOV) ---
          sendLog("Fase MOV: Sincronizando movimentos bancários...");
          let movPage = 1;
          let movTotalPaginas = 1;
          while (movPage <= movTotalPaginas) {
            const resMOV = await fetch('https://app.omie.com.br/api/v1/financas/mf/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                call: 'ListarMovimentos',
                app_key: appKey, app_secret: appSecret,
                param: [{ nPagina: movPage, nRegPorPagina: 100, dRegDe: brStart, dRegAte: brEnd }]
              })
            }).then(r => r.json());

            movTotalPaginas = resMOV.nTotPaginas || 1;
            const movRecords = resMOV.movimentos || [];

            if (movRecords.length > 0) {
              const movRows = movRecords
                .filter((m: any) => m.detalhes.cTipo === 'S' && m.detalhes.cStatus !== 'CANCELADO')
                .map((m: any) => {
                  const catId = String(m.detalhes.cCodCateg || '').trim();
                  const categoria = catMap.get(catId) || `Auditar: ${catId} (${m.detalhes.cDesCateg || 'Sem Nome'})`;
                  const isoReg = m.detalhes.dDtRegistro ? m.detalhes.dDtRegistro.split('/').reverse().join('-') : null;
                  const isoVenc = m.detalhes.dDtVenc ? m.detalhes.dDtVenc.split('/').reverse().join('-') : null;
                  const isoPgto = m.detalhes.dDtPagamento ? m.detalhes.dDtPagamento.split('/').reverse().join('-') : null;
                  
                  // Garantir data_registro se vier nulo da Omie (usar pagamento como fallback)
                  const finalReg = isoReg || isoPgto || isoVenc;

                  return {
                    empresa_nome: companyName.trim(),
                    omie_id: m.detalhes.nCodMovCC,
                    id_global: `mov_${m.detalhes.nCodMovCC}`,
                    status: 'PAGO',
                    valor_total: m.detalhes.nValor,
                    valor_alocado: m.detalhes.nValor,
                    data_registro: finalReg,
                    data_vencimento: isoVenc,
                    data_pagamento: isoPgto,
                    categoria_codigo: catId,
                    categoria_nome: categoria,
                    projeto_nome: m.detalhes.cDesProjeto || 'Sem Projeto',
                    departamento_nome: m.detalhes.cDesDep || 'Sem Departamento',
                    raw_data: m,
                    fonte: 'MOV'
                  };
                });

              if (movRows.length > 0) {
                const uniqueMovIds = [...new Set(movRows.map(r => r.omie_id))];
                await supabase.from('omie_raw').delete().eq('empresa_nome', companyName.trim()).in('omie_id', uniqueMovIds).eq('fonte', 'MOV');
                await supabase.from('omie_raw').insert(movRows);
              }
            }
            sendProgress(65 + (movPage / movTotalPaginas) * 35);
            movPage++;
          }

          sendProgress(100);
          controller.enqueue(encoder.encode(`data: DONE: Sincronização Completa (360º).\n\n`));
          controller.close();
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ERROR: ${err.message}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
