import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export async function POST() {
  try {
    // 1. Consultar a tabela companies
    const { data: companies, error: dbError } = await supabase
      .from('companies')
      .select('id, omie_app_key, omie_app_secret');

    if (dbError) {
      return NextResponse.json(
        { status: 'error', message: `Erro ao buscar companies: ${dbError.message}` },
        { status: 500 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { status: 'warning', message: 'Nenhuma company encontrada.' },
        { status: 404 }
      );
    }

    // Data atual menos 24h
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const endpoints = [
      {
        origem: 'contas_pagar',
        url: 'https://app.omie.com.br/api/v1/financas/contapagar/',
        call: 'ListarContasPagar',
        getParams: (pagina: number) => ({
          pagina,
          registros_por_pagina: 100,
          filtrar_por_data_de: dateStr,
          filtrar_apenas_alteracao: 'S'
        }),
        getRecords: (res: any) => res.conta_pagar_cadastro || []
      },
      {
        origem: 'contas_receber',
        url: 'https://app.omie.com.br/api/v1/financas/contareceber/',
        call: 'ListarContasReceber',
        getParams: (pagina: number) => ({
          pagina,
          registros_por_pagina: 100,
          filtrar_por_data_de: dateStr,
          filtrar_apenas_alteracao: 'S'
        }),
        getRecords: (res: any) => res.conta_receber_cadastro || []
      },
      {
        origem: 'movimentos',
        url: 'https://app.omie.com.br/api/v1/financas/mf/',
        call: 'ListarMovimentos', // Usei ListarMovimentos conforme padrão do endpoint mf/
        getParams: (pagina: number) => ({
          nPagina: pagina,
          nRegPorPagina: 100,
          dDtAltDe: dateStr, // Filtro de alteração para movimentos
        }),
        getRecords: (res: any) => res.movimentos || []
      }
    ];

    let totalInserted = 0;
    const errors: string[] = [];

    // 2. Para cada empresa
    for (const company of companies) {
      if (!company.omie_app_key || !company.omie_app_secret) continue;

      for (const endpoint of endpoints) {
        let pagina = 1;
        let totalPaginas = 1;

        while (pagina <= totalPaginas) {
          try {
            const payload = {
              call: endpoint.call,
              app_key: company.omie_app_key,
              app_secret: company.omie_app_secret,
              param: [endpoint.getParams(pagina)]
            };

            const response = await axios.post(endpoint.url, payload, {
              headers: { 'Content-Type': 'application/json' }
            });

            const data = response.data;
            totalPaginas = data.total_de_paginas || data.nTotPaginas || 1;

            const records = endpoint.getRecords(data);

            if (records.length > 0) {
              const rowsToInsert = records.map((record: any) => ({
                company_id: company.id,
                origem: endpoint.origem,
                raw_data: record
              }));

              // 3. Salvar retorno bruto na omie_sync_raw
              const { error: insertError } = await supabase
                .from('omie_sync_raw')
                .insert(rowsToInsert);

              if (insertError) {
                errors.push(`Erro inserindo ${endpoint.origem} (empresa ${company.id}): ${insertError.message}`);
              } else {
                totalInserted += rowsToInsert.length;
              }
            }

            pagina++;
          } catch (err: any) {
            const errorMessage = err.response?.data?.faultstring || err.message;
            // O Omie retorna erro quando não há registros na página, podemos ignorar e ir para o próximo
            if (errorMessage.includes('Nenhum registro encontrado') || errorMessage.includes('Nao existem registros')) {
               break;
            }
            errors.push(`Erro Omie ${endpoint.origem} (empresa ${company.id}, pag ${pagina}): ${errorMessage}`);
            break;
          }
        }
      }
    }

    return NextResponse.json({
      status: errors.length > 0 ? 'partial' : 'success',
      message: `Sincronização concluída. ${totalInserted} registros inseridos.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: `Erro interno: ${error.message}` },
      { status: 500 }
    );
  }
}
