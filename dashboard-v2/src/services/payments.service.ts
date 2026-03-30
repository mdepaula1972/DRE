import { supabase } from "@/lib/supabase";

export interface LoanPayment {
  id: string;
  contract_id: string;
  employee_id: string;
  month_cycle: string;
  due_date: string;
  paid_date?: string;
  amount: number;
  status: 'PENDENTE' | 'PAGO' | 'POSTERGADO';
  postponed_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentBatchRequest {
  payment_ids: string[];
  action: 'PAGO' | 'POSTERGADO';
  postponed_date?: string;
}

export class PaymentsService {
  /**
   * Gera automaticamente as parcelas para um contrato
   */
  static async generateInstallments(contractId: string): Promise<void> {
    const { error } = await supabase.rpc('generate_installments', {
      p_contract_id: contractId
    });

    if (error) {
      console.error('Erro ao gerar parcelas:', error);
      throw new Error('Falha ao gerar parcelas do contrato');
    }
  }

  /**
   * Busca parcelas pendentes de um funcionário
   */
  static async getPendingPayments(employeeId: string, monthCycle?: string): Promise<LoanPayment[]> {
    let query = supabase
      .from('loan_payments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'PENDENTE');

    if (monthCycle) {
      query = query.eq('month_cycle', monthCycle);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar parcelas:', error);
      throw new Error('Falha ao carregar parcelas');
    }

    return data || [];
  }

  /**
   * Busca todas as parcelas de um contrato
   */
  static async getContractPayments(contractId: string): Promise<LoanPayment[]> {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('contract_id', contractId)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar parcelas do contrato:', error);
      throw new Error('Falha ao carregar parcelas');
    }

    return data || [];
  }

  /**
   * Atualiza status de uma parcela
   */
  static async updatePaymentStatus(
    paymentId: string, 
    status: 'PAGO' | 'POSTERGADO',
    postponedDate?: string
  ): Promise<void> {
    const updates: Partial<LoanPayment> = { status };
    
    if (status === 'PAGO') {
      updates.paid_date = new Date().toISOString().split('T')[0];
    } else if (status === 'POSTERGADO' && postponedDate) {
      updates.postponed_to = postponedDate;
    }

    const { error } = await supabase
      .from('loan_payments')
      .update(updates)
      .eq('id', paymentId);

    if (error) {
      console.error('Erro ao atualizar parcela:', error);
      throw new Error('Falha ao atualizar parcela');
    }
  }

  /**
   * Processa múltiplas parcelas em lote
   */
  static async processBatch(request: PaymentBatchRequest): Promise<void> {
    const { payment_ids, action, postponed_date } = request;

    if (action === 'POSTERGADO' && !postponed_date) {
      throw new Error('Data de postergação é obrigatória');
    }

    const updates: Partial<LoanPayment> = { status: action };
    
    if (action === 'PAGO') {
      updates.paid_date = new Date().toISOString().split('T')[0];
    } else if (action === 'POSTERGADO' && postponed_date) {
      updates.postponed_to = postponed_date;
    }

    const { error } = await supabase
      .from('loan_payments')
      .update(updates)
      .in('id', payment_ids);

    if (error) {
      console.error('Erro no processamento em lote:', error);
      throw new Error('Falha ao processar parcelas');
    }
  }

  /**
   * Busca parcelas por mês (para processamento mensal)
   */
  static async getPaymentsByMonth(monthCycle: string): Promise<LoanPayment[]> {
    const { data, error } = await supabase
      .from('loan_payments')
      .select(`
        *,
        contracts:contract_id (
          employee_id,
          employee_name,
          operation_number
        )
      `)
      .eq('month_cycle', monthCycle)
      .order('employee_name', { referencedTable: 'contracts', ascending: true });

    if (error) {
      console.error('Erro ao buscar parcelas do mês:', error);
      throw new Error('Falha ao carregar parcelas do mês');
    }

    return data || [];
  }

  /**
   * Estatísticas de pagamentos do mês
   */
  static async getMonthStats(monthCycle: string) {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('status, amount')
      .eq('month_cycle', monthCycle);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error('Falha ao carregar estatísticas');
    }

    const stats = {
      total: 0,
      pending: 0,
      paid: 0,
      postponed: 0,
      pendingAmount: 0,
      paidAmount: 0,
      postponedAmount: 0
    };

    data?.forEach(p => {
      stats.total++;
      if (p.status === 'PENDENTE') {
        stats.pending++;
        stats.pendingAmount += Number(p.amount);
      } else if (p.status === 'PAGO') {
        stats.paid++;
        stats.paidAmount += Number(p.amount);
      } else if (p.status === 'POSTERGADO') {
        stats.postponed++;
        stats.postponedAmount += Number(p.amount);
      }
    });

    return stats;
  }
}
