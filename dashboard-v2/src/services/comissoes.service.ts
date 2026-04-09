import { supabase } from '@/lib/supabase';
import { Membro, ContratoBase, Recebimento, Comissao, ComissoesFilters } from '@/types/comissoes';

// ─── Raw types from Supabase ──────────────────────────────────────────────────

interface RawRecebimento {
  id: string;
  contrato_id: string;
  data_recebimento: string;
  nota_fiscal?: string | null;
  ciclo?: string | null;
  mes_ref?: number | null;
  ano_ref?: number | null;
  valor_bruto: number;
  valor_liquido: number;
  // Supabase retorna FK joins como array ou objeto dependendo da relação
  contratos_base?: { nome_contrato: string } | { nome_contrato: string }[] | null;
  comissoes?: RawComissaoDb[];
}

interface RawComissaoDb {
  id: string;
  recebimento_id: string;
  membro_id: string;
  porcentagem: number;
  valor_calculado: number;
  status?: string | null;
}

// ─── ComissoesService ─────────────────────────────────────────────────────────

export class ComissoesService {

  /** Busca todos os membros da equipe */
  static async getEquipe(): Promise<Membro[]> {
    const { data, error } = await supabase
      .from('equipe')
      .select('id, nome, ativo, pct_padrao')
      .order('nome');

    if (error) throw new Error(`Falha ao buscar equipe: ${error.message}`);
    return (data || []) as Membro[];
  }

  /** Busca contratos ativos e comissionáveis */
  static async getContratos(): Promise<ContratoBase[]> {
    const { data, error } = await supabase
      .from('contratos_base')
      .select('id, nome_contrato, numero_contrato, observacoes, ativo, empresa')
      .eq('ativo', true)
      .order('nome_contrato');

    if (error) throw new Error(`Falha ao buscar contratos: ${error.message}`);
    return (data || []) as ContratoBase[];
  }

  /**
   * Busca histórico de recebimentos com comissões aninhadas.
   * Recebe um mapa de equipe (id → nome) para resolução de nomes no client.
   */
  static async getHistorico(
    equipeMap: Map<string, string>,
    filters?: ComissoesFilters
  ): Promise<Recebimento[]> {
    let query = supabase
      .from('recebimentos')
      .select(`
        id,
        contrato_id,
        data_recebimento,
        nota_fiscal,
        ciclo,
        mes_ref,
        ano_ref,
        valor_bruto,
        valor_liquido,
        contratos_base ( nome_contrato ),
        comissoes ( id, recebimento_id, membro_id, porcentagem, valor_calculado, status )
      `)
      .order('data_recebimento', { ascending: false });

    if (filters?.dataInicio) query = query.gte('data_recebimento', filters.dataInicio);
    if (filters?.dataFim)    query = query.lte('data_recebimento', filters.dataFim);
    if (filters?.ciclo)      query = query.eq('ciclo', filters.ciclo);
    if (filters?.contratoId) query = query.eq('contrato_id', filters.contratoId);

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao buscar histórico: ${error.message}`);

    const raw = (data || []) as unknown as RawRecebimento[];

    // Resolve nomes de contrato e de membros no client
    let result: Recebimento[] = raw.map(rec => ({
      id: rec.id,
      contrato_id: rec.contrato_id,
      contratoNome: Array.isArray(rec.contratos_base)
        ? (rec.contratos_base[0]?.nome_contrato ?? '—')
        : (rec.contratos_base?.nome_contrato ?? '—'),
      data_recebimento: rec.data_recebimento,
      nota_fiscal: rec.nota_fiscal,
      ciclo: rec.ciclo,
      mes_ref: rec.mes_ref,
      ano_ref: rec.ano_ref,
      valor_bruto: Number(rec.valor_bruto) || 0,
      valor_liquido: Number(rec.valor_liquido) || 0,
      comissoes: (rec.comissoes || []).map((c): Comissao => ({
        id: c.id,
        recebimento_id: c.recebimento_id,
        membro_id: c.membro_id,
        porcentagem: Number(c.porcentagem) || 0,
        valor_calculado: Number(c.valor_calculado) || 0,
        status: c.status,
        membroNome: equipeMap.get(c.membro_id) ?? 'Desconhecido',
      })),
    }));

    // Filtro por membro (pós-processamento — o Supabase não filtra em nested)
    if (filters?.membroId) {
      result = result.filter(r =>
        r.comissoes.some(c => c.membro_id === filters.membroId)
      );
    }

    return result;
  }

  /**
   * Salva ou atualiza um recebimento e suas comissões.
   * Se editId for fornecido, faz UPDATE + delete das comissões antigas.
   */
  static async saveRecebimento(payload: {
    contrato_id: string;
    data_recebimento: string;
    nota_fiscal?: string;
    ciclo?: string;
    valor_bruto: number;
    valor_liquido: number;
    divisoes: Array<{ membro_id: string; porcentagem: number; valor_calculado: number }>;
    editId?: string;
  }): Promise<void> {
    const ciclo = payload.ciclo || null;
    const recPayload = {
      contrato_id: payload.contrato_id,
      data_recebimento: payload.data_recebimento,
      nota_fiscal: payload.nota_fiscal || null,
      ciclo,
      mes_ref: ciclo ? parseInt(ciclo.split('-')[1]) : null,
      ano_ref: ciclo ? parseInt(ciclo.split('-')[0]) : null,
      valor_bruto: payload.valor_bruto,
      valor_liquido: payload.valor_liquido,
    };

    let recebimentoId = payload.editId;

    if (payload.editId) {
      const { error } = await supabase
        .from('recebimentos')
        .update(recPayload)
        .eq('id', payload.editId);
      if (error) throw new Error(`Falha ao atualizar recebimento: ${error.message}`);

      // Remove comissões antigas (serão recriadas abaixo)
      const { error: delErr } = await supabase
        .from('comissoes')
        .delete()
        .eq('recebimento_id', payload.editId);
      if (delErr) throw new Error(`Falha ao limpar comissões antigas: ${delErr.message}`);
    } else {
      const { data, error } = await supabase
        .from('recebimentos')
        .insert([recPayload])
        .select('id')
        .single();
      if (error) throw new Error(`Falha ao criar recebimento: ${error.message}`);
      recebimentoId = data.id;
    }

    // Filtra divisões com valor > 0 antes de inserir
    const comissoesPayload = payload.divisoes
      .filter(d => d.valor_calculado > 0 && d.porcentagem > 0)
      .map(d => ({
        recebimento_id: recebimentoId,
        membro_id: d.membro_id,
        porcentagem: d.porcentagem / 100, // Armazena como decimal (0.0035)
        valor_calculado: d.valor_calculado,
        status: 'pendente',
      }));

    if (comissoesPayload.length > 0) {
      const { error: comErr } = await supabase
        .from('comissoes')
        .insert(comissoesPayload);
      if (comErr) throw new Error(`Falha ao salvar comissões: ${comErr.message}`);
    }
  }

  /** Remove um recebimento (comissões são removidas em CASCADE) */
  static async deleteRecebimento(id: string): Promise<void> {
    const { error } = await supabase
      .from('recebimentos')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Falha ao excluir recebimento: ${error.message}`);
  }

  /** Cria um novo contrato */
  static async addContrato(payload: {
    nome_contrato: string;
    numero_contrato?: string;
    observacoes?: string;
  }): Promise<ContratoBase> {
    const { data, error } = await supabase
      .from('contratos_base')
      .insert([{ ...payload, ativo: true, is_comissionavel: true }])
      .select('id, nome_contrato, numero_contrato, observacoes')
      .single();
    if (error) throw new Error(`Falha ao criar contrato: ${error.message}`);
    return data as ContratoBase;
  }

  /** Cria um novo membro da equipe */
  static async addMembro(payload: {
    nome: string;
    pct_padrao: number;
  }): Promise<Membro> {
    const { data, error } = await supabase
      .from('equipe')
      .insert([{ ...payload, ativo: true }])
      .select('id, nome, ativo, pct_padrao')
      .single();
    if (error) throw new Error(`Falha ao criar membro: ${error.message}`);
    return data as Membro;
  }

  /** Ativa ou desativa um membro da equipe */
  static async toggleMembro(id: string, ativo: boolean): Promise<Membro> {
    const { data, error } = await supabase
      .from('equipe')
      .update({ ativo })
      .eq('id', id)
      .select('id, nome, ativo, pct_padrao')
      .single();
    if (error) throw new Error(`Falha ao atualizar membro: ${error.message}`);
    return data as Membro;
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(date: string): string {
  if (!date) return '—';
  try {
    const [y, m, d] = date.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return '—';
  }
}

export function formatCiclo(ciclo: string | null | undefined): string {
  if (!ciclo) return '—';
  const [ano, mes] = ciclo.split('-');
  return `${mes}/${ano}`;
}
