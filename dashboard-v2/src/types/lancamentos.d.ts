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
  data_vencimento: string;
  data_pagamento: string;
  categoria_codigo: string;
  categoria_nome: string;
  fornecedor_nome: string;
  projeto_nome?: string;
  departamento_nome?: string;
  raw_data?: any;
  sync_at?: string;
  
  // Detalhes extras legados/compatibilidade
  status_titulo?: string; // Mapeado do status
  
  // Computed na runtime
  _dataSort?: Date;
  _dataLabel?: string;
  _departamentos?: string[];
  _projetos?: string[];
}

export interface LancamentoFilterValues {
  empresa?: string;
  dateBase?: 'registro' | 'vencimento' | 'pagamento';
  month?: string; // YYYY-MM (Legado)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status?: string; // PAGO, ABERTO, ATRASADO
  source?: string; // CP, MOV
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
