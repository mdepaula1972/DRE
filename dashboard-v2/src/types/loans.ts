export interface Employee {
  id: string;
  name: string;
  company: string;
  linkType: string;
  remuneration: number;
  totalTaken: number;
  totalReceived: number;
  balance: number;
  monthInstallment: number;
  contractsCount: number;
  status: "Ativo" | "Provisão" | "Quitado" | "Inativo";
  avatar?: string;
  created_at?: string;
}

export interface Contract {
  id: string;
  employee_id: string;
  operationNumber: string;
  value: number;
  balance: number;
  installments: number;
  installmentValue: number;
  installmentsPaid: number;
  nextPaymentDate: string;
  endDate?: string;
  status: "ATIVO" | "LIQUIDADO" | "ATRASADO";
  startDate: string;
  requestDate?: string;
  description?: string;
  contractUrl?: string; // NOVO: URL do anexo do contrato
  created_at?: string;
}

export interface LoanStats {
  totalEmprestado: number;
  saldoDevedor: number;
  totalRecebido: number;
  recebivelMes: number;
  contratosAtivos: number;
  contratosLiquidados: number;
  maiorEmprestimo: number;
  maiorEmprestimoRef: string;
  proximoEncerrar: string;
  parcelasRestantes: number;
}

export interface ProjectionData {
  month: string;
  total: number;
  previsto: number;
}

export interface FilterParams {
  competencia?: string;
  empresa?: string;
  colaborador?: string;
  status?: string;
  vinculo?: string;
  incluirExColaboradores?: boolean;
  incluirLiquidados?: boolean;
}
