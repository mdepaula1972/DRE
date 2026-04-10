import { supabase } from '@/lib/supabase';
import { Lancamento, LancamentoFilterValues, LancamentoStats } from '@/types/lancamentos';

export class LancamentosService {
  private static async fetchAll(tableName: string, filterColumn: string | null, minDate: string | null) {
    let results: any[] = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(tableName).select('*').range(from, from + limit - 1);
      
      if (filterColumn && filterColumn !== 'null' && minDate) {
        const col = tableName === 'omie_cp_titulos' ? 'data_entrada' : 
                    tableName === 'omie_mov_saidas' ? 'data_pagamento' : filterColumn;
        
        if (col) query = query.gte(col, minDate);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error(`Erro ao buscar ${tableName}:`, error);
        hasMore = false;
        break;
      }

      if (data && data.length > 0) {
        results = results.concat(data);
        from += limit;
        if (data.length < limit) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return results;
  }

  static async getLancamentos(startDate: string = '2025-06-01'): Promise<{ 
    lancamentos: Lancamento[], 
    allocations: any[], 
    dimCategorias: Map<string, any>, 
    dimProjetos: Map<string, string>, 
    dimDRE: Map<string, string> 
  }> {
    
    // Disparar todas as buscas em paralelo (igual ao legado)
    const [
      cpData, movData, allocData, 
      fornData, catData, projData, dreData
    ] = await Promise.all([
      this.fetchAll('omie_cp_titulos', 'data_entrada', startDate),
      this.fetchAll('omie_mov_saidas', 'data_pagamento', startDate),
      this.fetchAll('omie_cp_allocations', 'null', null),
      this.fetchAll('omie_dim_fornecedores', 'null', null),
      this.fetchAll('omie_dim_categorias', 'null', null),
      this.fetchAll('omie_dim_projetos', 'null', null),
      this.fetchAll('omie_dim_dre', 'null', null)
    ]);

    // Map Dimensions
    const dimCategorias = new Map<string, any>();
    (catData || []).forEach(c => {
      dimCategorias.set(String(c.codigo_categoria), {
        descricao: c.descricao_categoria,
        codigo_dre: String(c.codigo_conta_dre || '')
      });
    });

    const dimProjetos = new Map<string, string>();
    (projData || []).forEach(p => {
      dimProjetos.set(String(p.codigo_projeto), p.descricao_projeto);
    });

    const dimDRE = new Map<string, string>();
    (dreData || []).forEach(d => {
      dimDRE.set(String(d.codigo_conta_dre), d.descricao_conta_dre);
    });

    const dimFornecedores = new Map<string, string>();
    (fornData || []).forEach(f => {
      const name = f.nome_fantasia || f.razao_social || f.cnpj_cpf || 'Sem Nome';
      dimFornecedores.set(String(f.codigo_cliente_omie), name);
    });

    // Consolidation (CP)
    const cpMapped: Lancamento[] = (cpData || []).map(item => {
      let payload: any = {};
      try { payload = typeof item.payload_json === 'string' ? JSON.parse(item.payload_json) : (item.payload_json || {}); } catch(e) {}
      
      let fornecedorNome = dimFornecedores.get(String(item.codigo_cliente_fornecedor)) || item.fornecedor_nome_transferencia;
      
      if (!fornecedorNome || fornecedorNome === 'Desconhecido') {
        fornecedorNome = payload?.nm_cliente || 
                         payload?.nome_cliente || 
                         payload?.nome_fantasia || 
                         payload?.razao_social || 
                         payload?.contas_pagar_cadastro?.[0]?.nm_cliente || 
                         'Desconhecido';
      }
      
      return {
        id_global: `cp_${item.codigo_titulo}`,
        fonte: 'CP',
        fornecedor: fornecedorNome,
        empresa: item.empresa_nome || 'DZM',
        valor: parseFloat(item.valor_documento) || 0,
        categoria_id: String(item.codigo_categoria_padrao || 'S/ Cat'),
        codigo_lancamento_omie: item.codigo_titulo,
        data_emissao: item.data_emissao,
        data_entrada: item.data_entrada,
        data_previsao: item.data_previsao,
        data_vencimento: item.data_vencimento,
        data_pagamento: item.data_pagamento,
        status_titulo: item.status_titulo,
        observacao: item.observacao || payload?.observacao || ''
      };
    });

    // Consolidation (MOV)
    const movMapped: Lancamento[] = (movData || []).map(item => {
      let payload: any = {};
      try { payload = typeof item.payload_json === 'string' ? JSON.parse(item.payload_json) : (item.payload_json || {}); } catch(e) {}
      
      let fornecedorNome = dimFornecedores.get(String(item.codigo_cliente_fornecedor)) || item.fornecedor_nome_transferencia;
      if (!fornecedorNome || fornecedorNome === 'Desconhecido') {
        fornecedorNome = payload?.detalhes?.cNomeCliente || 
                         payload?.detalhes?.cNomeFantasia || 
                         payload?.detalhes?.cNumDocFiscal || 
                         payload?.resumo?.cNomeCliente ||
                         item.empresa_nome || 
                         'Lançamento Direto';
      }

      return {
        id_global: `mov_${item.dedupe_key}`,
        fonte: 'MOV',
        fornecedor: fornecedorNome,
        empresa: item.empresa_nome || 'Mar Brasil',
        valor: parseFloat(item.valor_pago) || 0,
        categoria_id: String(item.codigo_categoria || 'S/ Cat'),
        codigo_movimento_cc: item.codigo_movimento_cc,
        data_emissao: item.data_emissao,
        data_vencimento: item.data_vencimento,
        data_previsao: item.data_previsao,
        data_pagamento: item.data_pagamento,
        status_titulo: item.status_titulo || 'PAGO (MOV)', // Movimento já é pago em regra
        observacao: item.observacao || payload?.detalhes?.cObservacao || ''
      };
    });

    const lancamentos = [...cpMapped, ...movMapped];
    return { lancamentos, allocations: allocData || [], dimCategorias, dimProjetos, dimDRE };
  }
}

export const parseDate = (dateStr?: string | null): Date => {
  if (!dateStr || dateStr === '---' || dateStr.trim() === '') return new Date(0);
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length !== 3) return new Date(0);
  if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2].slice(0,2)));
  return new Date(Number(parts[2]), Number(parts[1])-1, Number(parts[0]));
};

export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '---' || dateStr.trim() === '') return '---';
  if (dateStr.includes('/') && dateStr.split('/')[0].length <= 2) return dateStr;
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  if (parts[0].length === 4) return `${parts[2].slice(0,2)}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export const formatCurrency = (v: number): string => {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
