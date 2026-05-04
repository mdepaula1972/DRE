export interface Lancamento {
  id_global: string;
  fonte: 'CP' | 'MOV';
  empresa: string;
  empresa_id?: string;
  fornecedor: string;
  valor: number;
  categoria_id: string;
  
  // Detalhes extras
  codigo_lancamento_omie?: string;
  codigo_movimento_cc?: string;
  codigo_projeto?: string;
  data_emissao?: string;
  data_entrada?: string;
  data_previsao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  status_titulo?: string;
  observacao?: string;
  
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
