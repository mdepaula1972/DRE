import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { month, year, company } = await req.json();

    if (!month || !year) {
      return NextResponse.json({ status: 'error', message: 'M s e Ano s o obrigat rios.' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (p: number) => {
          controller.enqueue(encoder.encode(`data: PROGRESS:${p}\n\n`));
        };

        try {
          // 1. Configurar Empresa
          const companyName = company || 'Mar Brasil';
          const isDZM = companyName.toUpperCase().includes('DZM');
          
          const appKey = isDZM ? process.env.OMIE_APP_KEY_DZM : process.env.OMIE_APP_KEY_MARBRASIL;
          const appSecret = isDZM ? process.env.OMIE_APP_SECRET_DZM : process.env.OMIE_APP_SECRET_MARBRASIL;

          if (!appKey || !appSecret) {
            controller.enqueue(encoder.encode(`data: ERROR: Credenciais n o configuradas.\n\n`));
            controller.close();
            return;
          }

          // 2. Carregar Mapa de Categorias (DNA ESTRITO)
          sendProgress(5);
          const { data: catData } = await supabase
            .from('omie_dim_categorias')
            .select('codigo_categoria,descricao_categoria')
            .eq('empresa_nome', companyName.trim());
          
          const catMap = new Map((catData || []).map(c => [String(c.codigo_categoria).trim(), c.descricao_categoria]));

          // 3. Carregar Mapa de Projetos
          const { data: projData } = await supabase
            .from('omie_dim_projetos')
            .select('codigo_projeto,descricao_projeto')
            .eq('empresa_nome', companyName.trim());
          
          const projMap = new Map((projData || []).map(p => [String(p.codigo_projeto).trim(), p.descricao_projeto]));

          // 4. Limpar Per odo no Supabase (Delete Seletivo)
          const isoStart = `${year}-${String(month).padStart(2,'0')}-01`;
          const lastDay = new Date(year, month, 0).getDate();
          const isoEnd = `${year}-${String(month).padStart(2,'0')}-${lastDay}`;
          
          await supabase
            .from('omie_raw')
            .delete()
            .eq('empresa_nome', companyName.trim())
            .gte('data_vencimento', isoStart)
            .lte('data_vencimento', isoEnd);

          // 5. Buscar na Omie
          sendProgress(15);
          const startDt = `01/${String(month).padStart(2,'0')}/${year}`;
          const endDt = `${lastDay}/${String(month).padStart(2,'0')}/${year}`;

          let pagina = 1;
          let totalPaginas = 1;

          while (pagina <= totalPaginas) {
            const res = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                call: 'ListarContasPagar',
                app_key: appKey,
                app_secret: appSecret,
                param: [{
                  pagina,
                  registros_por_pagina: 100,
                  exibir_obs: "S",
                  filtrar_por_vencimento: "S",
                  filtrar_por_data_de: startDt,
                  filtrar_por_data_ate: endDt
                }]
              })
            });

            const omieData = await res.json();
            totalPaginas = omieData.total_de_paginas || 1;
            const records = omieData.conta_pagar_cadastro || [];

            if (records.length > 0) {
              const rows = records.flatMap((r: any) => {
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
                  status: r.status_titulo,
                  valor_total: r.valor_documento,
                  valor_alocado: d.nValDep,
                  data_registro: isoReg,
                  data_vencimento: isoVenc,
                  data_pagamento: isoBaixa,
                  categoria_codigo: catId,
                  categoria_nome: categoria,
                  projeto_nome: projeto,
                  departamento_nome: d.cDesDep,
                  raw_data: r
                }));
              });

              await supabase.from('omie_raw').insert(rows);
            }

            const prog = 15 + Math.floor((pagina / totalPaginas) * 85);
            sendProgress(prog);

            if (pagina >= totalPaginas) break;
            pagina++;
          }

          controller.enqueue(encoder.encode(`data: DONE\n\n`));
        } catch (err: any) {
          controller.enqueue(encoder.encode(`data: ERROR: ${err.message}\n\n`));
        } finally {
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
