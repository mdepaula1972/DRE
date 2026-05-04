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

  static async clearAll() {
    return await supabase.from('omie_raw').delete().neq('id', 0); // Delete all
  }

  static async getLancamentos(startDate: string = '2024-01-01'): Promise<{ 
    lancamentos: Lancamento[], 
    allocations: any[], 
    dimCategorias: Map<string, any>, 
    dimProjetos: Map<string, string>, 
    dimDRE: Map<string, string> 
  }> {
    
    // 1. Buscar os dados brutos da nova tabela omie_raw
    // Nota: Estamos buscando desde 2024 conforme a nova carga histórica
    let rawData: any[] = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('omie_raw')
        .select('*')
        .gte('data_registro', startDate)
        .neq('status', 'CANCELADO')
        .order('data_registro', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Erro ao buscar omie_raw:', error);
        break;
      }

      if (data && data.length > 0) {
        rawData = rawData.concat(data);
        from += limit;
        if (data.length < limit) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    // 2. Buscar Dimensões para compatibilidade com o componente Legado
    const [catData, projData, dreData] = await Promise.all([
      supabase.from('omie_dim_categorias').select('*'),
      supabase.from('omie_dim_projetos').select('*'),
      supabase.from('omie_dim_dre').select('*')
    ]);

    const dimCategorias = new Map<string, any>();
    (catData.data || []).forEach(c => {
      const key = `${String(c.empresa_nome || '').trim()}-${String(c.codigo_categoria)}`;
      dimCategorias.set(key, {
        descricao: c.descricao_categoria,
        codigo_dre: String(c.codigo_conta_dre || '')
      });
    });

    const dimProjetos = new Map<string, string>();
    (projData.data || []).forEach(p => {
      const key = `${String(p.empresa_nome || '').trim()}-${String(p.codigo_projeto)}`;
      dimProjetos.set(key, p.descricao_projeto);
    });

    const dimDRE = new Map<string, string>();
    (dreData.data || []).forEach(d => {
      dimDRE.set(String(d.codigo_conta_dre), d.descricao_conta_dre);
    });

    // 3. Processar Lançamentos (Agrupando por omie_id para a tabela principal)
    const groupedMap = new Map<number, Lancamento>();
    const allocations: any[] = [];

    rawData.forEach(item => {
      // Alimentar lista de allocations para o modal de detalhes
      allocations.push({
        codigo_lancamento_omie: item.omie_id,
        descricao_departamento: item.departamento_nome,
        codigo_departamento: item.departamento_codigo,
        valor_alocado: item.valor_alocado,
        percentual_departamento: item.valor_total > 0 ? ((item.valor_alocado / item.valor_total) * 100).toFixed(2) : 0,
        descricao_categoria: item.categoria_nome,
        descricao_projeto: item.projeto_nome,
        codigo_projeto: item.projeto_codigo, // Importante para o De-Para
        descricao_conta_dre: item.dre_conta_nome
      });

      // Agrupar para a linha principal da tabela
      if (!groupedMap.has(item.omie_id)) {
        // Busca robusta de fornecedor no raw_data
        const raw = item.raw_data || {};
        const fornecedorNome = raw.nm_cliente || 
                               raw.nome_cliente || 
                               raw.razao_social || 
                               raw.nome_fantasia || 
                               item.fornecedor_nome || // Caso eu adicione esta coluna
                               'Fornecedor';

        groupedMap.set(item.omie_id, {
          id_global: `raw_${item.omie_id}`,
          fonte: 'CP',
          empresa: item.empresa_nome,
          fornecedor: fornecedorNome,
          valor: parseFloat(item.valor_total),
          categoria_id: item.categoria_codigo,
          codigo_projeto: String(item.projeto_codigo || raw.codigo_projeto || ''),
          codigo_lancamento_omie: item.omie_id,
          data_emissao: raw.data_emissao,
          data_entrada: item.data_registro,
          data_previsao: item.data_vencimento,
          data_vencimento: item.data_vencimento,
          data_pagamento: item.data_pagamento,
          status_titulo: item.status,
          observacao: raw.observacao || '',
          _dataLabel: item.data_registro,
          _departamentos: [item.departamento_nome],
          _projetos: [item.projeto_nome]
        } as Lancamento);
      } else {
        const existing = groupedMap.get(item.omie_id);
        if (existing) {
          if (!existing._departamentos?.includes(item.departamento_nome)) {
            existing._departamentos?.push(item.departamento_nome);
          }
          if (!existing._projetos?.includes(item.projeto_nome)) {
            existing._projetos?.push(item.projeto_nome);
          }
        }
      }
    });

    return { 
      lancamentos: Array.from(groupedMap.values()), 
      allocations, 
      dimCategorias, 
      dimProjetos, 
      dimDRE 
    };
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
