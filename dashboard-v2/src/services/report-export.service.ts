// v.01.11 - Exportar relatório para CSV
// Serviço para exportar dados de empréstimos

import { supabase } from '@/lib/supabase';

export interface LoansReportData {
  colaborador: string;
  empresa: string;
  vinculo: string;
  status: string;
  totalEmprestado: number;
  totalRecebido: number;
  saldoDevedor: number;
  parcelaMensal: number;
  contratosAtivos: number;
}

export interface ContractReportData {
  colaborador: string;
  empresa: string;
  contrato: string;
  valorTotal: number;
  qtdParcelas: number;
  valorParcela: number;
  recebido: number;
  saldo: number;
  parcelasPagas: number;
  parcelasRestantes: number;
  status: string;
  dataInicio: string;
  dataTermino: string;
}

export interface PaymentReportData {
  colaborador: string;
  empresa: string;
  ciclo: string;
  vencimento: string;
  valor: number;
  status: string;
  dataPagamento: string | null;
  formaPagamento: string | null;
}

export class ReportExportService {
  // Buscar dados para relatório de colaboradores
  static async getEmployeeReport(): Promise<LoansReportData[]> {
    const { data, error } = await supabase
      .from('employee_loans_summary')
      .select('*')
      .order('total_loaned', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar relatório:', error);
      throw new Error('Falha ao carregar dados');
    }
    
    return (data || []).map(item => ({
      colaborador: item.employee_name,
      empresa: item.company,
      vinculo: item.link_type,
      status: item.status,
      totalEmprestado: item.total_loaned || 0,
      totalRecebido: item.total_received || 0,
      saldoDevedor: item.total_balance || 0,
      parcelaMensal: item.monthly_installment || 0,
      contratosAtivos: item.active_contracts || 0
    }));
  }

  // Buscar dados para relatório de contratos
  static async getContractReport(): Promise<ContractReportData[]> {
    const { data, error } = await supabase
      .from('contracts_expanded')
      .select('*')
      .order('employee_name');
    
    if (error) {
      console.error('Erro ao buscar contratos:', error);
      throw new Error('Falha ao carregar dados');
    }
    
    return (data || []).map(item => ({
      colaborador: item.employee_name,
      empresa: item.company,
      contrato: item.operation_number,
      valorTotal: item.value || 0,
      qtdParcelas: item.total_installments || 0,
      valorParcela: item.installment_value || 0,
      recebido: item.total_received || 0,
      saldo: item.balance || 0,
      parcelasPagas: item.installments_paid || 0,
      parcelasRestantes: item.remaining_installments || 0,
      status: item.status,
      dataInicio: item.start_date,
      dataTermino: item.end_date
    }));
  }

  // Buscar dados para relatório de parcelas
  static async getPaymentReport(): Promise<PaymentReportData[]> {
    const { data, error } = await supabase
      .from('loan_payments')
      .select(`
        *,
        employees:employee_id (
          full_name,
          corporate_name,
          company
        )
      `)
      .order('due_date');
    
    if (error) {
      console.error('Erro ao buscar parcelas:', error);
      throw new Error('Falha ao carregar dados');
    }
    
    return (data || []).map(item => {
      const emp = item.employees as any;
      const name = emp?.full_name || emp?.corporate_name || 'Desconhecido';
      
      return {
        colaborador: name,
        empresa: emp?.company || '-',
        ciclo: item.month_cycle,
        vencimento: item.due_date,
        valor: item.amount || 0,
        status: item.status,
        dataPagamento: item.payment_date,
        formaPagamento: item.payment_method
      };
    });
  }

  // Converter dados para CSV
  static convertToCSV(data: any[], headers?: string[]): string {
    if (data.length === 0) return '';
    
    // Usar headers fornecidos ou extrair do primeiro objeto
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Criar linha de cabeçalho
    let csv = csvHeaders.join(';') + '\n';
    
    // Adicionar linhas de dados
    data.forEach(row => {
      const values = csvHeaders.map(header => {
        // Converter camelCase para o nome da propriedade
        const key = header.toLowerCase().replace(/\s+/g, '').replace(/[()r$]/g, '');
        const value = row[key] ?? row[header] ?? '';
        
        // Escapar valores que contêm ponto e vírgula
        const stringValue = String(value);
        if (stringValue.includes(';') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(';') + '\n';
    });
    
    return csv;
  }

  // Download arquivo CSV
  static downloadCSV(csvContent: string, filename: string): void {
    // BOM para Excel ler UTF-8 corretamente
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Exportar relatório completo
  static async exportFullReport(): Promise<void> {
    try {
      const [employees, contracts, payments] = await Promise.all([
        this.getEmployeeReport(),
        this.getContractReport(),
        this.getPaymentReport()
      ]);

      // Criar CSV com múltiplas abas (separadas por linha em branco)
      let fullCSV = '';
      
      // Seção 1: Resumo por Colaborador
      fullCSV += 'RELATÓRIO DE EMPRÉSTIMOS - RESUMO POR COLABORADOR\n';
      fullCSV += 'Data: ' + new Date().toLocaleDateString('pt-BR') + '\n\n';
      fullCSV += this.convertToCSV(employees, [
        'Colaborador', 'Empresa', 'Vínculo', 'Status',
        'Total Emprestado (R$)', 'Total Recebido (R$)', 'Saldo Devedor (R$)',
        'Parcela Mensal (R$)', 'Contratos Ativos'
      ]);
      
      fullCSV += '\n\nRELATÓRIO DE EMPRÉSTIMOS - DETALHE POR CONTRATO\n\n';
      fullCSV += this.convertToCSV(contracts, [
        'Colaborador', 'Empresa', 'Contrato', 'Valor Total (R$)',
        'Qtd Parcelas', 'Valor Parcela (R$)', 'Recebido (R$)', 'Saldo (R$)',
        'Parcelas Pagas', 'Parcelas Restantes', 'Status', 'Data Início', 'Data Término'
      ]);
      
      fullCSV += '\n\nRELATÓRIO DE EMPRÉSTIMOS - PARCELAS\n\n';
      fullCSV += this.convertToCSV(payments, [
        'Colaborador', 'Empresa', 'Ciclo', 'Vencimento', 'Valor (R$)',
        'Status', 'Data Pagamento', 'Forma Pagamento'
      ]);

      const filename = `Relatorio_Emprestimos_${new Date().toISOString().split('T')[0]}.csv`;
      this.downloadCSV(fullCSV, filename);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  // Exportar apenas resumo por colaborador
  static async exportEmployeeReport(): Promise<void> {
    const data = await this.getEmployeeReport();
    const csv = this.convertToCSV(data, [
      'Colaborador', 'Empresa', 'Vínculo', 'Status',
      'Total Emprestado (R$)', 'Total Recebido (R$)', 'Saldo Devedor (R$)',
      'Parcela Mensal (R$)', 'Contratos Ativos'
    ]);
    
    const filename = `Relatorio_Colaboradores_${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename);
  }

  // Exportar apenas contratos
  static async exportContractReport(): Promise<void> {
    const data = await this.getContractReport();
    const csv = this.convertToCSV(data, [
      'Colaborador', 'Empresa', 'Contrato', 'Valor Total (R$)',
      'Qtd Parcelas', 'Valor Parcela (R$)', 'Recebido (R$)', 'Saldo (R$)',
      'Parcelas Pagas', 'Parcelas Restantes', 'Status', 'Data Início', 'Data Término'
    ]);
    
    const filename = `Relatorio_Contratos_${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename);
  }
}
