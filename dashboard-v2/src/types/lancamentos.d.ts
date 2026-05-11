export interface Lancamento {
  id: number;
  id_global: string;
  fonte: 'CP' | 'MOV';
  empresa_nome: string;
  omie_id: number;
  status: string;
  valor_total: number;
  valor_alocado: number;
  data_registro: string;
  data_emissao: string;
  data_vencimento: string;
  data_previsao: string;
  data_pagamento: string;
  categoria_codigo: string;
  categoria_nome: string;
  fornecedor_nome: string;
  projeto_nome?: string;
  departamento_nome?: string;
  tipo_registro: 'PAGAR' | 'RECEBER' | 'MOVIMENTO';
  selecionado: boolean;
  raw_data?: any;
  sync_at?: string;
  
  // LEGACY ALIASES (Para compatibilidade com componentes antigos)
  empresa?: string;
  fornecedor?: string;
  valor?: number;
  categoria_id?: string;
  status_titulo?: string;
  
  // Computed na runtime
  _dataSort?: Date;
  _dataLabel?: string;
  _departamentos?: string[];
  _projetos?: string[];
}

export interface LancamentoFilterValues {
  empresa?: string;
  dateBase?: 'registro' | 'vencimento' | 'pagamento' | 'emissao' | 'previsao';
  tipo_registro?: string; // PAGAR, RECEBER, MOVIMENTO
  month?: string; // YYYY-MM (Legado)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: string; // PAGO, ABERTO, ATRASADO
  source?: string; // CP, MOV (Legado)
  search?: string;
  categoria?: string;
  projeto?: string;
  departamento?: string;
}

export interface LancamentoStats {
  totalSaidaMes: number;
  totalAberto: number;
  totalPago: number;
}
