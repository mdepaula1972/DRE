import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TIMBRADO_B64 } from '@/lib/timbrado_base64';
import { FilterValues } from '@/components/loans/FilterBar';
import { LoansService } from './loans.service';

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
  // Buscar dados para relatório de colaboradores (usando lógica real do LoansService)
  static async getEmployeeReport(isTestMode?: boolean): Promise<LoansReportData[]> {
    const emps = await LoansService.getEmployees({ mostrarTodos: true }, isTestMode);
    
    return emps.map(item => ({
      colaborador: item.name,
      empresa: item.company,
      vinculo: item.linkType,
      status: item.status,
      totalEmprestado: item.totalTaken || 0,
      totalRecebido: item.totalReceived || 0,
      saldoDevedor: item.balance || 0,
      parcelaMensal: item.monthInstallment || 0,
      contratosAtivos: item.contractsCount || 0
    }));
  }

  // Buscar dados para relatório de contratos (usando a lógica que já funciona no Dash)
  static async getContractReport(isTestMode?: boolean): Promise<ContractReportData[]> {
    const emps = await LoansService.getEmployees({ mostrarTodos: true }, isTestMode);
    let allContracts: ContractReportData[] = [];

    for (const emp of emps) {
      const contracts = await LoansService.getEmployeeContracts(emp.id, isTestMode);
      contracts.forEach(c => {
        allContracts.push({
          colaborador: emp.name,
          empresa: emp.company,
          contrato: c.operationNumber,
          valorTotal: c.value || 0,
          qtdParcelas: c.installments || 0,
          valorParcela: c.installmentValue || 0,
          recebido: c.value - c.balance,
          saldo: c.balance || 0,
          parcelasPagas: c.installmentsPaid || 0,
          parcelasRestantes: (c.installments || 0) - (c.installmentsPaid || 0),
          status: c.status,
          dataInicio: c.startDate || '',
          dataTermino: c.endDate || ''
        });
      });
    }
    
    return allContracts.sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }

  // Buscar dados para relatório de parcelas (usando lógica algorítmica do LoansService/Sidebar)
  static async getPaymentReport(isTestMode?: boolean): Promise<PaymentReportData[]> {
    const safeTestMode = Boolean(isTestMode);
    const empsTable = safeTestMode ? 'employees_test' : 'employees';
    const loansTable = safeTestMode ? 'employee_loans_test' : 'employee_loans';

    const [empsRes, loansRes] = await Promise.all([
      supabase.from(empsTable).select('id, full_name, corporate_name, company'),
      supabase.from(loansTable).select('*')
    ]);

    if (empsRes.error) {
      console.error('Erro ao buscar colaboradores:', empsRes.error);
      throw new Error('Falha ao carregar dados');
    }
    if (loansRes.error) {
      console.error('Erro ao buscar empréstimos:', loansRes.error);
      throw new Error('Falha ao carregar dados');
    }

    const emps = empsRes.data || [];
    const loans = loansRes.data || [];

    const empMap = new Map();
    emps.forEach(e => {
      empMap.set(e.id, {
        name: e.full_name || e.corporate_name || 'Desconhecido',
        company: e.company || '-'
      });
    });

    const paymentReport: PaymentReportData[] = [];

    loans.forEach(loan => {
      const emp = empMap.get(loan.employee_id);
      if (!emp) return;

      const amount = parseFloat(String(loan.amount)) || 0;
      const inst = parseInt(String(loan.installments)) || 1;
      const installmentValue = amount / inst;

      const now = new Date();
      const [y, m] = loan.start_cycle ? loan.start_cycle.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
      
      let elapsed = (now.getFullYear() - y) * 12 + ((now.getMonth() + 1) - m) + 1;
      if (now.getDate() < 10) elapsed--;
      
      const postponed = parseInt(String(loan.postponed_months)) || 0;
      elapsed -= postponed;
      elapsed = Math.max(0, Math.min(elapsed, inst));

      const extraPaid = parseFloat(String(loan.amount_paid_extra)) || 0;
      const anticipatedCount = Math.floor(extraPaid / installmentValue);

      // Calcular se o contrato está liquidado (saldo <= 0)
      const standardPaid = elapsed * installmentValue;
      const debt = Math.max(0, amount - (standardPaid + extraPaid));
      const isLiquidated = debt <= 0;

      let currentAbs = (y * 12) + m;
      let physicalIndex = 1;
      let paidViaElapsed = 0;
      let postponedUsed = 0;

      for (let i = 0; i < inst + postponed; i++) {
        const curY = Math.floor((currentAbs - 1) / 12);
        const curM = ((currentAbs - 1) % 12) + 1;
        
        const ciclo = `${curY}-${String(curM).padStart(2, '0')}`;
        const vencimento = `${curY}-${String(curM).padStart(2, '0')}-10`;

        let statusStr = 'PENDENTE';
        let valorParcela = installmentValue;

        if (isLiquidated) {
          statusStr = 'PAGO';
          physicalIndex++;
        } else if (paidViaElapsed < elapsed) {
          statusStr = 'PAGO';
          paidViaElapsed++;
          physicalIndex++;
        } else if (postponedUsed < postponed) {
          statusStr = 'POSTERGADO';
          postponedUsed++;
          valorParcela = 0;
        } else if ((physicalIndex - 1) < (elapsed + anticipatedCount)) {
          statusStr = 'PAGO';
          physicalIndex++;
        } else {
          statusStr = 'PENDENTE';
          physicalIndex++;
        }

        paymentReport.push({
          colaborador: emp.name,
          empresa: emp.company,
          ciclo: ciclo,
          vencimento: vencimento,
          valor: valorParcela,
          status: statusStr,
          dataPagamento: statusStr === 'PAGO' ? vencimento : null,
          formaPagamento: statusStr === 'PAGO' ? 'Automático' : null
        });

        currentAbs++;
      }
    });

    return paymentReport.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
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
  static async exportFullReport(filters?: FilterValues, isTestMode?: boolean): Promise<void> {
    try {
      let [employees, contracts, payments] = await Promise.all([
        this.getEmployeeReport(isTestMode),
        this.getContractReport(isTestMode),
        this.getPaymentReport(isTestMode) // Usa a mesma lógica do dashboard
      ]);

      // Aplicar filtros se existirem
      if (filters) {
        if (filters.empresa) {
          employees = employees.filter(e => e.empresa === filters.empresa);
          contracts = contracts.filter(c => c.empresa === filters.empresa);
          payments = payments.filter(p => p.empresa === filters.empresa);
        }
        if (filters.vinculo) {
          employees = employees.filter(e => e.vinculo === filters.vinculo);
        }
        if (filters.search) {
          const term = filters.search.toLowerCase();
          employees = employees.filter(e => e.colaborador.toLowerCase().includes(term));
          contracts = contracts.filter(c => c.colaborador.toLowerCase().includes(term));
          payments = payments.filter(p => p.colaborador.toLowerCase().includes(term));
        }
        // mostrarTodos e incluirQuitados já são tratados no componente base para os dados de entrada
        // mas aqui como buscamos do banco novamente, precisamos garantir a lógica
        if (!filters.mostrarTodos) {
          employees = employees.filter(e => e.totalEmprestado > 0 || e.saldoDevedor > 0);
        }
        if (!filters.incluirQuitados) {
          employees = employees.filter(e => e.status !== 'Quitado');
          contracts = contracts.filter(c => c.status !== 'Liquidado' && c.status !== 'Quitado' && c.status !== 'Finalizado');
        }
      }

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

  /**
   * EXPORTAR RELATÓRIO COMPLETO EM PDF (PAISAGEM + LOGO)
   */
  static async exportFullReportPDF(filters?: FilterValues, isTestMode?: boolean): Promise<void> {
    try {
      let [employees, contracts, payments] = await Promise.all([
        this.getEmployeeReport(isTestMode),
        this.getContractReport(isTestMode),
        this.getPaymentReport(isTestMode)
      ]);

      // Aplicar filtros para sincronizar com o que o usuário vê no Dashboard
      if (filters) {
        if (filters.empresa) {
          employees = employees.filter(e => e.empresa === filters.empresa);
          contracts = contracts.filter(c => c.empresa === filters.empresa);
          payments = payments.filter(p => p.empresa === filters.empresa);
        }
        if (filters.vinculo) {
          employees = employees.filter(e => e.vinculo === filters.vinculo);
        }
        if (filters.search) {
          const term = filters.search.toLowerCase();
          employees = employees.filter(e => e.colaborador.toLowerCase().includes(term));
          contracts = contracts.filter(c => c.colaborador.toLowerCase().includes(term));
          payments = payments.filter(p => p.colaborador.toLowerCase().includes(term));
        }
        
        // Regra de negócio: se não "mostrar todos", remove quem nunca teve nada
        if (!filters.mostrarTodos) {
          employees = employees.filter(e => e.totalEmprestado > 0 || e.saldoDevedor > 0);
        }
        
        // Se não "incluir quitados", remove colaboradores e contratos liquidados
        if (!filters.incluirQuitados) {
          employees = employees.filter(e => e.status !== 'Quitado');
          contracts = contracts.filter(c => !['Liquidado', 'Quitado', 'Finalizado'].includes(c.status));
        }
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Função para adicionar o fundo (timbrado) em todas as páginas
      const addBackground = (data?: any) => {
        try {
          doc.addImage(TIMBRADO_B64, 'JPEG', 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.warn('Erro ao carregar imagem do timbrado:', e);
        }
      };

      const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('pt-BR');
      };

      // --- PÁGINA 1: RESUMO POR COLABORADOR ---
      addBackground();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105); // Verde Emerald 600
      doc.text('RELATÓRIO DE EMPRÉSTIMOS - RESUMO POR COLABORADOR', 5, 2);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 5, 7);
 
      autoTable(doc, {
        startY: 10,
        head: [['Colaborador', 'Empresa', 'Vínculo', 'Status', 'Total (R$)', 'Recebido (R$)', 'Saldo (R$)', 'Parcela (R$)']],
        body: employees.map(emp => [
          emp.colaborador,
          emp.empresa,
          emp.vinculo,
          emp.status,
          formatCurrency(emp.totalEmprestado),
          formatCurrency(emp.totalRecebido),
          formatCurrency(emp.saldoDevedor),
          formatCurrency(emp.parcelaMensal)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { top: 10, left: 5, right: 60 },
        willDrawPage: addBackground
      });

      // --- PÁGINA 2: DETALHE POR CONTRATO ---
      doc.addPage();
      addBackground();
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text('DETALHAMENTO POR CONTRATO', 5, 2);

      autoTable(doc, {
        startY: 8,
        head: [['Colaborador', 'Contrato', 'Total', 'Pelas', 'V. Parcela', 'Recebido', 'Saldo', 'Pagas', 'Faltam', 'Status', 'Início']],
        body: contracts.map(c => [
          c.colaborador,
          c.contrato,
          formatCurrency(c.valorTotal),
          c.qtdParcelas,
          formatCurrency(c.valorParcela),
          formatCurrency(c.recebido),
          formatCurrency(c.saldo),
          c.parcelasPagas,
          c.parcelasRestantes,
          c.status,
          formatDate(c.dataInicio)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 7, cellPadding: 1.5 },
        margin: { top: 8, left: 5, right: 60 },
        willDrawPage: addBackground
      });

      // --- PÁGINA 3: HISTÓRICO DE PARCELAS ---
      doc.addPage();
      addBackground();
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text('HISTÓRICO DE PARCELAS / CICLOS', 5, 2);

      autoTable(doc, {
        startY: 8,
        head: [['Colaborador', 'Empresa', 'Ciclo', 'Vencimento', 'Valor', 'Status', 'Pagamento', 'Forma']],
        body: payments.map(p => [
          p.colaborador,
          p.empresa,
          p.ciclo,
          formatDate(p.vencimento),
          formatCurrency(p.valor),
          p.status,
          formatDate(p.dataPagamento),
          p.formaPagamento || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { top: 8, left: 5, right: 60 },
        willDrawPage: addBackground,
        didDrawPage: (data) => {
          // Rodapé simples
          const str = "Página " + doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(str, pageWidth - 20, pageHeight - 8);
        }
      });

      doc.save(`Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  }
}
