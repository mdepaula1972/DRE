// Types para o módulo de Comissões
// Baseados no schema real do Supabase (inspecionado em 2026-04-09)

export interface Membro {
  id: string;
  nome: string;
  ativo: boolean;
  pct_padrao: number;
  created_at?: string;
}

export interface ContratoBase {
  id: string;
  nome_contrato: string;
  numero_contrato?: string | null;
  observacoes?: string | null;
  is_comissionavel?: boolean;
  ativo?: boolean;
  empresa?: string | null;
}

export interface RawComissao {
  id: string;
  recebimento_id: string;
  membro_id: string;
  porcentagem: number;
  valor_calculado: number;
  status?: string | null;
}

export interface Comissao extends RawComissao {
  // Resolvido no client via mapa de equipe
  membroNome?: string;
}

export interface Recebimento {
  id: string;
  contrato_id: string;
  contratoNome: string; // Resolvido no client
  data_recebimento: string;
  nota_fiscal?: string | null;
  ciclo?: string | null;
  mes_ref?: number | null;
  ano_ref?: number | null;
  valor_bruto: number;
  valor_liquido: number;
  comissoes: Comissao[];
}

export interface ComissoesFilters {
  dataInicio?: string;
  dataFim?: string;
  ciclo?: string;
  contratoId?: string;
  membroId?: string;
}

export interface DivisaoInput {
  membro_id: string;
  nome: string;
  porcentagem: number; // 0-100 representando %, ex: 0.35 para 0.35%
  valor_calculado: number;
}

export interface LancamentoFormData {
  contrato_id: string;
  data_recebimento: string;
  nota_fiscal: string;
  ciclo: string;
  valor_bruto: number;
  valor_liquido: number;
  divisoes: DivisaoInput[];
  editId?: string;
}

export interface KpiTotais {
  [nome: string]: number;
  Geral: number;
}
