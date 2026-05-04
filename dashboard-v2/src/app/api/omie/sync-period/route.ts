import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const reqData = await req.json();
    
    // Support new flex dates or fallback to old month/year
    let { startDate, endDate, dateType, company, month, year } = reqData;
    dateType = dateType || 'registro';

    if (!startDate || !endDate) {
      if (!month || !year) {
        return NextResponse.json({ status: 'error', message: 'Faltam par metros de data.' }, { status: 400 });
      }
      const lastDay = new Date(year, month, 0).getDate();
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Converta YYYY-MM-DD para DD/MM/YYYY para a API da Omie
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

          // 4. Parâmetros de Busca Dinâmicos para Omie
          sendProgress(15);
          const paramFilter: any = {
            registros_por_pagina: 100,
            exibir_obs: "S"
          };

          if (dateType === 'vencimento') {
            paramFilter.filtrar_por_vencimento_de = brStart;
            paramFilter.filtrar_por_vencimento_ate = brEnd;
          } else if (dateType === 'pagamento') {
            paramFilter.filtrar_por_baixa_de = brStart;
            paramFilter.filtrar_por_baixa_ate = brEnd;
          } else {
            paramFilter.filtrar_por_registro_de = brStart;
            paramFilter.filtrar_por_registro_ate = brEnd;
          }

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
                  ...paramFilter
                }]
              })
            });

            const omieData = await res.json();
            totalPaginas = omieData.total_de_paginas || 1;
            const records = omieData.conta_pagar_cadastro || [];

            if (records.length > 0) {
              // 5.1 Resolver nomes dos Fornecedores desta página
              const uniqueSupplierIds = [...new Set(records.map((r: any) => r.codigo_cliente_fornecedor).filter(Boolean))];
              const suppMap = new Map();

              if (uniqueSupplierIds.length > 0) {
                // Tenta pegar do Supabase primeiro (rápido)
                const { data: suppData } = await supabase
                  .from('omie_dim_fornecedores')
                  .select('codigo_cliente_omie, nome_fantasia, razao_social')
                  .eq('empresa_nome', companyName.trim())
                  .in('codigo_cliente_omie', uniqueSupplierIds);
                  
                (suppData || []).forEach(s => {
                  suppMap.set(String(s.codigo_cliente_omie), s.nome_fantasia || s.razao_social || 'Fornecedor');
                });

                // Se houver algum faltando (novo), busca na Omie
                const missingSuppliers = uniqueSupplierIds.filter(id => !suppMap.has(String(id)));
                for (const id of missingSuppliers) {
                  try {
                    const resSupp = await fetch('https://app.omie.com.br/api/v1/geral/clientes/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        call: 'ConsultarCliente',
                        app_key: appKey,
                        app_secret: appSecret,
                        param: [{ codigo_cliente_omie: id }]
                      })
                    });
                    const dataSupp = await resSupp.json();
                    const name = dataSupp.nome_fantasia || dataSupp.razao_social || 'Fornecedor';
                    suppMap.set(String(id), name);
                  } catch {
                    suppMap.set(String(id), 'Fornecedor');
                  }
                }
              }

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

                const fornecedorNome = suppMap.get(String(r.codigo_cliente_fornecedor)) || 'Fornecedor';
                r.nm_cliente = fornecedorNome; // Injeta no raw_data!

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

              const uniqueOmieIds = Array.from(new Set(rows.map((r: any) => r.omie_id)));

              // 1. Apaga APENAS os IDs que vieram nesta página (Upsert Real sem sobreposição)
              if (uniqueOmieIds.length > 0) {
                await supabase
                  .from('omie_raw')
                  .delete()
                  .eq('empresa_nome', companyName.trim())
                  .in('omie_id', uniqueOmieIds);
              }

              // 2. Insere os atualizados
              const { error: insertError } = await supabase.from('omie_raw').insert(rows);
              if (insertError) {
                controller.enqueue(encoder.encode(`data: ERROR: Falha no Supabase: ${insertError.message}\n\n`));
              }
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
