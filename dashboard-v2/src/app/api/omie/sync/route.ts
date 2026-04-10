import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper de formatação de data para o Supabase (DD/MM/YYYY -> YYYY-MM-DD)
function toISODate(dateStr: string | null | undefined) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) return dateStr; 
  return `${parts[2].slice(0,2)}-${parts[1]}-${parts[0]}`;
}

export async function POST() {
  try {
    // Buscar chaves do ambiente (Vercel ou Local .env)
    const keys = [
      { name: 'Mar Brasil', key: process.env.OMIE_APP_KEY_MARBRASIL, secret: process.env.OMIE_APP_SECRET_MARBRASIL },
      { name: 'DZM', key: process.env.OMIE_APP_KEY_DZM, secret: process.env.OMIE_APP_SECRET_DZM }
    ].filter(k => k.key && k.secret);

    if (keys.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Credenciais da API Omie (OMIE_APP_KEY_...) não estão configuradas no ambiente Vercel.' },
        { status: 400 }
      );
    }

    // Configurando intervalo: Alterações cadastradas nos últimos 5 dias
    const d5 = new Date();
    d5.setDate(d5.getDate() - 5);
    const mm = String(d5.getMonth() + 1).padStart(2, '0');
    const dd = String(d5.getDate()).padStart(2, '0');
    const yyyy = d5.getFullYear();
    const deStr = `${dd}/${mm}/${yyyy}`;

    let updatedCount = 0;
    
    // 1. Sincronização Delta de "Contas a Pagar" (Status e Valor Pago)
    for (const app of keys) {
      let pagina = 1;
      let totalPaginas = 1;

      while (pagina <= totalPaginas) {
        const payload = {
          call: 'ListarContasPagar',
          app_key: app.key,
          app_secret: app.secret,
          param: [{
            pagina: pagina,
            registros_por_pagina: 100,
            filtrar_por_data_de: deStr,
            filtrar_apenas_inclusao: "N",
            filtrar_apenas_alteracao: "S"
          }]
        };

        const response = await fetch('https://app.omie.com.br/api/v1/financas/contapagar/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Finalizar paginação imediatamente se houver falha de credencial do Omie
        if (data.faultstring) {
          console.error(`Omie API Error [${app.name}]:`, data.faultstring);
          break;
        }

        totalPaginas = data.total_de_paginas || 0;
        const contas = data.conta_pagar_cadastro || [];

        // Fazer updates super leves e controlados no Supabase (apenas atualiza o status de quem já existe)
        for (const c of contas) {
          const det = c.detalhes || {};
          const cab = c.cabecalho || {};
          const res = c.resumo || {};
          
          const omieCode = det.nCodTitulo;
          const status = cab.cStatus;
          const pagoRaw = res.nValPago || 0;
          
          if (omieCode && status) {
            await supabase.from('omie_cp_titulos').update({
              status_titulo: status,
              valor_pago: pagoRaw
            }).eq('codigo_lancamento_omie', omieCode);
            updatedCount++;
          }
        }
        
        pagina++;
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `Sincronização Rápida concluída com sucesso via Vercel. ${updatedCount} movimentações recentes analisadas e atualizadas.` 
    });
    
  } catch (error: any) {
    console.error('Falha geral na sincronização Omie:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro interno na sincronização REST Serverless.' },
      { status: 500 }
    );
  }
}
