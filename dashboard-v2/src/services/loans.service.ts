import { supabase } from '@/lib/supabase';
import { Employee, Contract, LoanStats, ProjectionData, FilterParams } from '@/types/loans';

// Helper to get view name based on data mode
function getViewName(baseName: string, isTestMode?: boolean): string {
  return isTestMode ? `${baseName}_test` : baseName;
}

export class LoansService {
  // Buscar todos os colaboradores com estatísticas
  static async getEmployees(filters?: FilterParams, isTestMode?: boolean): Promise<Employee[]> {
    console.log('[LoansService] Buscando colaboradores...', isTestMode ? '(MODO TESTE)' : '');
    const { data, error } = await supabase
      .from(getViewName('employee_loans_summary', isTestMode))
      .select('*');

    if (error) {
      console.error('[LoansService] Erro ao buscar colaboradores:', error);
      throw new Error(`Falha ao carregar colaboradores: ${error.message}`);
    }

    console.log('[LoansService] Colaboradores encontrados:', data?.length || 0);
    return data?.map(item => ({
      id: item.employee_id,
      name: item.employee_name,
      company: item.company || 'MayBR',
      linkType: item.link_type || 'CLT',
      remuneration: item.remuneration || 0,
      totalTaken: item.total_loaned || 0,
      totalReceived: item.total_received || 0,
      balance: item.total_balance || 0,
      monthInstallment: item.monthly_installment || 0,
      contractsCount: item.active_contracts || 0,
      status: item.status || 'Ativo',
    })) || [];
  }

  // Buscar estatísticas gerais
  static async getStats(isTestMode?: boolean): Promise<LoanStats> {
    const { data, error } = await supabase
      .from(getViewName('loan_stats', isTestMode))
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      // Retorna valores padrão em caso de erro
      return {
        totalEmprestado: 0,
        saldoDevedor: 0,
        totalRecebido: 0,
        recebivelMes: 0,
        contratosAtivos: 0,
        contratosLiquidados: 0,
        maiorEmprestimo: 0,
        maiorEmprestimoRef: '-',
        proximoEncerrar: '-',
        parcelasRestantes: 0,
      };
    }

    return {
      totalEmprestado: data?.total_emprestado || 0,
      saldoDevedor: data?.saldo_devedor || 0,
      totalRecebido: data?.total_recebido || 0,
      recebivelMes: data?.recebivel_mes || 0,
      contratosAtivos: data?.contratos_ativos || 0,
      contratosLiquidados: data?.contratos_liquidados || 0,
      maiorEmprestimo: data?.maior_emprestimo || 0,
      maiorEmprestimoRef: data?.maior_emprestimo_ref || '-',
      proximoEncerrar: data?.proximo_encerrar || '-',
      parcelasRestantes: data?.parcelas_restantes || 0,
    };
  }

  // Buscar projeção de recebimentos
  static async getProjections(isTestMode?: boolean): Promise<ProjectionData[]> {
    const { data, error } = await supabase
      .from(getViewName('loan_projections', isTestMode))
      .select('*')
      .order('month', { ascending: true });

    if (error) {
      console.error('Erro ao buscar projeções:', error);
      return [];
    }

    return data?.map(item => ({
      month: item.month,
      total: item.total || 0,
      previsto: item.previsto || 0,
    })) || [];
  }

  // Buscar contratos de um colaborador
  static async getEmployeeContracts(employeeId: string, isTestMode?: boolean): Promise<Contract[]> {
    const { data, error } = await supabase
      .from(getViewName('contracts', isTestMode))
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contratos:', error);
      throw new Error('Falha ao carregar contratos');
    }

    return data?.map(item => ({
      id: item.id,
      employee_id: item.employee_id,
      operationNumber: item.operation_number || item.id.slice(-4),
      value: item.value || 0,
      balance: item.balance || 0,
      installments: item.installments || 0,
      installmentValue: item.installment_value || 0,
      installmentsPaid: 0,
      nextPaymentDate: item.next_payment_date || '-',
      endDate: item.end_date || item.next_payment_date || '-',
      status: item.status || 'ATIVO',
      startDate: item.start_date || '-',
      description: item.description || '',
    })) || [];
  }

  // Buscar detalhes de um colaborador
  static async getEmployeeDetails(employeeId: string, isTestMode?: boolean): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(getViewName('employee_loans_summary', isTestMode))
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error) {
      console.error('Erro ao buscar detalhes do colaborador:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.employee_id,
      name: data.employee_name,
      company: data.company || 'MayBR',
      linkType: data.link_type || 'CLT',
      remuneration: data.remuneration || 0,
      totalTaken: data.total_loaned || 0,
      totalReceived: data.total_received || 0,
      balance: data.total_balance || 0,
      monthInstallment: data.monthly_installment || 0,
      contractsCount: data.active_contracts || 0,
      status: data.status || 'Ativo',
    };
  }

  // Ações sobre contratos
  static async liquidateContract(contractId: string): Promise<void> {
    const { error } = await supabase
      .rpc('liquidate_contract', { contract_id: contractId });

    if (error) {
      console.error('Erro ao liquidar contrato:', error);
      throw new Error('Falha ao liquidar contrato');
    }
  }

  static async postponeContract(contractId: string, months: number): Promise<void> {
    const { error } = await supabase
      .rpc('postpone_contract', { contract_id: contractId, months });

    if (error) {
      console.error('Erro ao postergar contrato:', error);
      throw new Error('Falha ao postergar contrato');
    }
  }

  static async anticipatePayment(contractId: string, amount: number): Promise<void> {
    const { error } = await supabase
      .rpc('anticipate_payment', { contract_id: contractId, amount });

    if (error) {
      console.error('Erro ao antecipar pagamento:', error);
      throw new Error('Falha ao antecipar pagamento');
    }
  }
}

// Função auxiliar para formatar valores monetários
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função auxiliar para formatar data (padrão BR: dd/mm/aaaa)
export function formatDate(date: string): string {
  if (!date || date === '-') return '-';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
