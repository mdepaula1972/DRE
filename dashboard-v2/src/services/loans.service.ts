import { supabase } from '@/lib/supabase';
import { Employee, Contract, LoanStats, ProjectionData } from '@/types/loans';
import { PaymentsService } from './payments.service';

// ─── Raw types from Supabase tables ─────────────────────────────────────────

interface RawEmployee {
  id: string;
  full_name: string;
  company: string;
  employment_type: string;
  remuneration: number | string;
  status: string;
  start_date?: string;
}

interface RawLoan {
  id: string;
  employee_id: string;
  amount: number | string;
  installments: number;
  start_cycle: string; // YYYY-MM
  amount_paid_extra?: number | string;
  notes?: string;
  request_date?: string;
  paid_installments?: number;
  postponed_months?: number;
  contract_url?: string;
}

// ─── Calculation helpers (fixed mathematical engine) ─────────────

function getElapsedMonths(ln: RawLoan): number {
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  const sc = ln.start_cycle;
  if (!amount || !inst || !sc) return 0;

  const now = new Date();
  const [y, m] = sc.split('-').map(Number);
  
  // Meses absolutos passados. Se start=Março e hoje=Março, diff = 0.
  // Somamos +1 para indicar a "Mensalidade 1", "Mensalidade 2".
  let elapsed = (now.getFullYear() - y) * 12 + ((now.getMonth() + 1) - m) + 1;
  
  // O pagamento só vira válido no sistema dia 10!
  if (now.getDate() < 10) elapsed--;
  
  // Deduzimos o tempo em que o contrato ficou congelado.
  const postponed = parseInt(String(ln.postponed_months)) || 0;
  elapsed -= postponed;
  
  return Math.max(0, Math.min(elapsed, inst));
}

function calcDebtForLoan(ln: RawLoan): number {
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  if (!amount || !inst) return 0;

  const elapsed = getElapsedMonths(ln);
  const standardPaid = elapsed * (amount / inst);
  const extraPaid = parseFloat(String(ln.amount_paid_extra)) || 0;
  
  return Math.max(0, amount - (standardPaid + extraPaid));
}

function calcReceivedForLoan(ln: RawLoan): number {
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  if (!amount || !inst) return 0;

  const elapsed = getElapsedMonths(ln);
  const standardPaid = elapsed * (amount / inst);
  const extraPaid = parseFloat(String(ln.amount_paid_extra)) || 0;
  
  return standardPaid + extraPaid;
}

function calcInstallmentForMonth(ln: RawLoan, monthStr: string): number {
  const [ty, tm] = monthStr.split('-').map(Number);
  const targetAbs = ty * 12 + tm;
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  if (!amount || !inst || !ln.start_cycle) return 0;

  // Se já liquidou (antecipou tudo), o recebível daqui pra frente é zero
  if (calcDebtForLoan(ln) <= 0) return 0;

  const [sy, sm] = ln.start_cycle.split('-').map(Number);
  const startAbs = sy * 12 + sm;
  const postponed = parseInt(String(ln.postponed_months)) || 0;

  // O contrato se estende pelos meses postergados
  const endAbs = startAbs + inst - 1 + postponed;

  // Fora do intervalo do contrato: sem valor
  if (targetAbs < startAbs || targetAbs > endAbs) return 0;

  // O "buraco" de cobrança está logo após o último mês pago:
  //   posições (elapsed+1) até (elapsed+postponed) contando a partir do início do contrato.
  // Isso exclui corretamente o mês postergado (ex: Março/26 postergado → pos elapsed+1 = 0).
  if (postponed > 0) {
    const elapsed = getElapsedMonths(ln);        // meses efetivamente pagos (já desconta postponed)
    const posFromStart = targetAbs - startAbs + 1; // posição 1-indexada do mês alvo no contrato
    if (posFromStart >= elapsed + 1 && posFromStart <= elapsed + postponed) return 0;
  }

  return amount / inst;
}

function loanStatus(ln: RawLoan): 'ATIVO' | 'LIQUIDADO' | 'ATRASADO' {
  return calcDebtForLoan(ln) <= 0 ? 'LIQUIDADO' : 'ATIVO';
}

function loanEndDate(ln: RawLoan): string {
  if (!ln.start_cycle || !ln.installments) return '-';
  const postponed = parseInt(String(ln.postponed_months)) || 0;
  const [y, m] = ln.start_cycle.split('-').map(Number);
  
  const endAbs = y * 12 + m + ln.installments - 1 + postponed;
  const ey = Math.floor((endAbs - 1) / 12);
  const em = ((endAbs - 1) % 12) + 1;
  return `${ey}-${String(em).padStart(2, '0')}-10`;
}

function loanNextPayment(ln: RawLoan): string {
  if (!ln.start_cycle || !ln.installments) return '-';
  const status = loanStatus(ln);
  if (status === 'LIQUIDADO') return '-';

  const [sy, sm] = ln.start_cycle.split('-').map(Number);
  const startAbs = sy * 12 + sm;
  
  const elapsed = getElapsedMonths(ln);
  const postponed = parseInt(String(ln.postponed_months)) || 0;
  
  // A próxima parcela devida é a Parcela Atual + 1. Exemplo: se pagou 1 parcela, a proxima é a parcela 2 do tempo real.
  const nextAbs = startAbs + elapsed + postponed;
  
  const ny = Math.floor((nextAbs - 1) / 12);
  const nm = ((nextAbs - 1) % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-10`;
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchLoans(isTestMode: boolean): Promise<RawLoan[]> {
  const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
  const { data, error } = await supabase
    .from(table)
    .select('id,employee_id,amount,installments,start_cycle,amount_paid_extra,notes,request_date,paid_installments,postponed_months,contract_url');

  if (error) {
    // Caso a tabela teste ainda não exista, retorna vazio sem quebrar
    if (isTestMode && error.code === '42P01') return [];
    throw new Error(`Falha ao buscar empréstimos: ${error.message}`);
  }
  return (data || []) as RawLoan[];
}

export async function fetchEmployees(isTestMode: boolean): Promise<RawEmployee[]> {
  const table = isTestMode ? 'employees_test' : 'employees';
  const { data, error } = await supabase
    .from(table)
    .select('id,full_name,company,employment_type,remuneration,status,start_date')
    .order('full_name');

  if (error) {
    // Caso a tabela teste ainda não exista, retorna vazio sem quebrar
    if (isTestMode && error.code === '42P01') return [];
    throw new Error(`Falha ao buscar colaboradores: ${error.message}`);
  }
  return (data || []) as RawEmployee[];
}

// ─── LoansService ────────────────────────────────────────────────────────────

/**
 * Retorna o mês de cobrança ativo:
 * - Antes do dia 10: mês corrente (parcela ainda não venceu)
 * - A partir do dia 10: próximo mês (ciclo corrente já fechou)
 */
function getBillingMonthStr(): string {
  const now = new Date();
  const billingDate = now.getDate() >= 10
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, '0')}`;
}

export class LoansService {

  /** Lista colaboradores que possuem empréstimo */
  static async getEmployees(_filters?: unknown, isTestMode?: boolean): Promise<Employee[]> {
    console.log(`[LoansService] Buscando colaboradores (Modo Teste: ${isTestMode})...`);

    const safeTestMode = Boolean(isTestMode);
    const [emps, loans] = await Promise.all([fetchEmployees(safeTestMode), fetchLoans(safeTestMode)]);

    const loansByEmp = new Map<string, RawLoan[]>();
    loans.forEach(ln => {
      const arr = loansByEmp.get(ln.employee_id) || [];
      arr.push(ln);
      loansByEmp.set(ln.employee_id, arr);
    });

    const now = new Date();
    const billingMonthStr = getBillingMonthStr();

    const result: Employee[] = [];
    emps.forEach(emp => {
      const empLoans = loansByEmp.get(emp.id) || [];
      const filters = _filters as any;
      const showAll = filters?.mostrarTodos;
      
      // Se não for "mostrar todos" e não tiver empréstimo, pula
      if (!showAll && empLoans.length === 0) return;

      const totalTaken = empLoans.reduce((a, ln) => a + (parseFloat(String(ln.amount)) || 0), 0);
      const balance = empLoans.reduce((a, ln) => a + calcDebtForLoan(ln), 0);
      const totalReceived = empLoans.reduce((a, ln) => a + calcReceivedForLoan(ln), 0);
      const monthInstallment = empLoans.reduce((a, ln) => a + calcInstallmentForMonth(ln, billingMonthStr), 0);

      result.push({
        id: emp.id,
        name: emp.full_name,
        company: emp.company || 'MarBR',
        linkType: emp.employment_type || 'CLT',
        remuneration: parseFloat(String(emp.remuneration)) || 0,
        totalTaken,
        totalReceived,
        balance,
        monthInstallment,
        contractsCount: empLoans.length,
        status: balance > 0 ? 'Ativo' : 'Quitado',
      });
    });

    console.log('[LoansService] Colaboradores com empréstimos:', result.length);
    return result;
  }

  /** Estatísticas gerais calculadas dos dados reais */
  static async getStats(isTestMode?: boolean): Promise<LoanStats> {
    const safeTestMode = Boolean(isTestMode);
    const [emps, loans] = await Promise.all([fetchEmployees(safeTestMode), fetchLoans(safeTestMode)]);

    const empMap = new Map(emps.map(e => [e.id, e]));
    const now = new Date();
    const billingMonthStr = getBillingMonthStr();

    let totalEmprestado = 0, saldoDevedor = 0, totalRecebido = 0, recebivelMes = 0;
    let contratosAtivos = 0, contratosLiquidados = 0;
    let maiorEmprestimo = 0, maiorEmprestimoRef = '-';
    let menorEndAbs = Infinity;
    let proximoEncerrarLoan: RawLoan | null = null;

    loans.forEach(ln => {
      const amount = parseFloat(String(ln.amount)) || 0;
      const debt = calcDebtForLoan(ln);
      const status = loanStatus(ln);

      totalEmprestado += amount;
      saldoDevedor += debt;
      totalRecebido += calcReceivedForLoan(ln);
      recebivelMes += calcInstallmentForMonth(ln, billingMonthStr);

      if (status === 'ATIVO') {
        contratosAtivos++;
        if (ln.start_cycle && ln.installments) {
          const [sy, sm] = ln.start_cycle.split('-').map(Number);
          const endAbs = sy * 12 + sm + ln.installments - 1;
          if (endAbs < menorEndAbs) {
            menorEndAbs = endAbs;
            proximoEncerrarLoan = ln;
          }
        }
      } else {
        contratosLiquidados++;
      }

      if (amount > maiorEmprestimo) {
        maiorEmprestimo = amount;
        const emp = empMap.get(ln.employee_id);
        maiorEmprestimoRef = emp?.full_name?.split(' ')[0] || '-';
      }
    });

    let proximoEncerrar = '-', parcelasRestantes = 0;
    if (proximoEncerrarLoan) {
      const pl = proximoEncerrarLoan as RawLoan;
      const emp = empMap.get(pl.employee_id);
      proximoEncerrar = emp?.full_name?.split(' ')[0] || '-';
      const [sy, sm] = pl.start_cycle.split('-').map(Number);
      const currentAbs = now.getFullYear() * 12 + (now.getMonth() + 1);
      const elapsed = Math.max(0, currentAbs - (sy * 12 + sm));
      parcelasRestantes = Math.max(0, pl.installments - elapsed);
    }

    return {
      totalEmprestado, saldoDevedor, totalRecebido, recebivelMes,
      contratosAtivos, contratosLiquidados,
      maiorEmprestimo, maiorEmprestimoRef,
      proximoEncerrar, parcelasRestantes,
    };
  }

  /** Projeção mensal dos recebíveis */
  static async getProjections(isTestMode?: boolean): Promise<ProjectionData[]> {
    const safeTestMode = Boolean(isTestMode);
    const loans = await fetchLoans(safeTestMode);
    const now = new Date();

    let maxMonthAbs = now.getFullYear() * 12 + (now.getMonth() + 1) + 11;
    loans.forEach(ln => {
      if (!ln.start_cycle || !ln.installments) return;
      const [sy, sm] = ln.start_cycle.split('-').map(Number);
      const endAbs = sy * 12 + sm + ln.installments - 1;
      if (endAbs > maxMonthAbs) maxMonthAbs = endAbs;
    });

    const currentAbs = now.getFullYear() * 12 + (now.getMonth() + 1);
    const result: ProjectionData[] = [];

    for (let abs = currentAbs; abs <= maxMonthAbs; abs++) {
      const y = Math.floor((abs - 1) / 12);
      const m = ((abs - 1) % 12) + 1;
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      const label = new Date(y, m - 1, 1)
        .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
        .toUpperCase()
        .replace('. ', '/');

      const total = loans.reduce((a, ln) => a + calcInstallmentForMonth(ln, monthStr), 0);
      result.push({ month: label, total, previsto: total });
    }

    return result;
  }

  /** Empréstimos de um colaborador específico */
  static async getEmployeeContracts(employeeId: string, isTestMode?: boolean): Promise<Contract[]> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { data, error } = await supabase
      .from(table)
      .select('id,employee_id,amount,installments,start_cycle,amount_paid_extra,notes,request_date,paid_installments,postponed_months,contract_url')
      .eq('employee_id', employeeId)
      .order('request_date', { ascending: false });

    if (error) {
      console.error('[LoansService] Erro ao buscar empréstimos:', error);
      throw new Error('Falha ao carregar empréstimos');
    }

    const loans = (data || []) as RawLoan[];

    return loans.map((ln, idx) => {
      const amount = parseFloat(String(ln.amount)) || 0;
      const installmentValue = ln.installments > 0 ? amount / ln.installments : 0;
      const balance = calcDebtForLoan(ln);

      return {
        id: ln.id,
        employee_id: ln.employee_id,
        operationNumber: `OP-${String(idx + 1).padStart(2, '0')}`,
        value: amount,
        balance,
        installments: ln.installments || 0,
        installmentValue,
        installmentsPaid: ln.paid_installments || 0,
        nextPaymentDate: loanNextPayment(ln),
        endDate: loanEndDate(ln),
        status: loanStatus(ln),
        startDate: ln.start_cycle ? `${ln.start_cycle}-01` : '-',
        requestDate: ln.request_date,
        description: ln.notes || '',
        contractUrl: ln.contract_url || '',
      };
    });
  }

  /** Detalhes financeiros de um colaborador */
  static async getEmployeeDetails(employeeId: string, isTestMode?: boolean): Promise<Employee | null> {
    const empsTable = isTestMode ? 'employees_test' : 'employees';
    const loansTable = isTestMode ? 'employee_loans_test' : 'employee_loans';
    
    const [empRes, loansRes] = await Promise.all([
      supabase.from(empsTable)
        .select('id,full_name,company,employment_type,remuneration,status,start_date')
        .eq('id', employeeId)
        .single(),
      supabase.from(loansTable)
        .select('id,employee_id,amount,installments,start_cycle,amount_paid_extra,paid_installments')
        .eq('employee_id', employeeId),
    ]);

    if (empRes.error || !empRes.data) {
      console.error('[LoansService] Colaborador não encontrado:', empRes.error);
      return null;
    }

    const emp = empRes.data as RawEmployee;
    const loans = (loansRes.data || []) as RawLoan[];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalTaken = loans.reduce((a, ln) => a + (parseFloat(String(ln.amount)) || 0), 0);
    const balance = loans.reduce((a, ln) => a + calcDebtForLoan(ln), 0);
    const totalReceived = loans.reduce((a, ln) => a + calcReceivedForLoan(ln), 0);
    const monthInstallment = loans.reduce((a, ln) => a + calcInstallmentForMonth(ln, currentMonthStr), 0);

    return {
      id: emp.id,
      name: emp.full_name,
      company: emp.company || 'MarBR',
      linkType: emp.employment_type || 'CLT',
      remuneration: parseFloat(String(emp.remuneration)) || 0,
      totalTaken,
      totalReceived,
      balance,
      monthInstallment,
      contractsCount: loans.length,
      status: balance > 0 ? 'Ativo' : 'Quitado',
    };
  }

  // ─── Ações de Painel Lateral & Criação ───────────────────────────────────────

  static async createLoan(data: {
    employee_id: string;
    amount: number;
    installments: number;
    start_cycle: string;
    request_date?: string;
    notes?: string;
  }, isTestMode?: boolean): Promise<{id: string, [key: string]: any}> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    
    const payload = {
      employee_id: data.employee_id,
      amount: data.amount,
      installments: data.installments,
      start_cycle: data.start_cycle,
      notes: data.notes || '',
      request_date: data.request_date || new Date().toISOString(),
      paid_installments: 0,
      postponed_months: 0,
      amount_paid_extra: 0
    };

    const { data: result, error } = await supabase
      .from(table)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error(`[LoansService] Erro ao criar formulário (${table}):`, error);
      throw new Error(`Falha ao registrar empréstimo: ${error.message}`);
    }

    if (result && result.id) {
      await PaymentsService.generateInstallments(result.id, isTestMode);
    }

    return result;
  }

  static async deleteContract(contractId: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { error } = await supabase.from(table).delete().eq('id', contractId);
    if (error) throw new Error(`Falha ao excluir contrato: ${error.message}`);
  }

  static async liquidateContract(contractId: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    
    // Buscar o contrato para saber o saldo devedor atual
    const { data: loan, error: fetchErr } = await supabase
      .from(table)
      .select('amount, installments, start_cycle, amount_paid_extra, postponed_months')
      .eq('id', contractId)
      .single();
    if (fetchErr) throw new Error('Não foi possível buscar o contrato.');

    const debt = calcDebtForLoan(loan as RawLoan);
    if (debt <= 0) return; // Já liquidado

    const currentExt = parseFloat(String(loan.amount_paid_extra)) || 0;
    const { error: updErr } = await supabase.from(table).update({
      amount_paid_extra: currentExt + debt
    }).eq('id', contractId);

    if (updErr) throw new Error(`Falha ao liquidar contrato: ${updErr.message}`);
  }

  static async postponeContract(contractId: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    
    const { data: loan, error: fetchErr } = await supabase
      .from(table)
      .select('postponed_months')
      .eq('id', contractId)
      .single();
    if (fetchErr) throw new Error('Não foi possível buscar o contrato.');

    const currentPsp = parseInt(String(loan.postponed_months)) || 0;
    const { error: updErr } = await supabase.from(table).update({
      postponed_months: currentPsp + 1
    }).eq('id', contractId);

    if (updErr) throw new Error(`Falha ao postergar contrato: ${updErr.message}`);
  }

  static async anticipateInstallment(contractId: string, multiplier: number, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    
    const { data: loan, error: fetchErr } = await supabase
      .from(table)
      .select('amount, installments, amount_paid_extra')
      .eq('id', contractId)
      .single();
    if (fetchErr) throw new Error('Não foi possível buscar o contrato.');

    const amount = parseFloat(String(loan.amount)) || 0;
    const inst = parseInt(String(loan.installments)) || 1;
    const installmentValue = amount / inst;
    const currentExt = parseFloat(String(loan.amount_paid_extra)) || 0;
    
    const { error: updErr } = await supabase.from(table).update({
      amount_paid_extra: currentExt + (installmentValue * multiplier)
    }).eq('id', contractId);

    if (updErr) throw new Error(`Falha ao antecipar parcelas: ${updErr.message}`);
  }

  static async revertContractOffsets(contractId: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { error } = await supabase.from(table).update({
      amount_paid_extra: 0,
      postponed_months: 0
    }).eq('id', contractId);

    if (error) throw new Error(`Falha ao reverter parcelas: ${error.message}`);
  }

  static async updateContractUrl(contractId: string, url: string, isTestMode?: boolean): Promise<void> {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { error } = await supabase.from(table).update({ contract_url: url }).eq('id', contractId);
    if (error) throw new Error(`Falha ao salvar URL do contrato: ${error.message}`);
  }

  static async uploadContractFile(
    contractId: string,
    file: File,
    isTestMode?: boolean
  ): Promise<string> {
    const folder = isTestMode ? 'test' : 'production';
    const ext = file.name.split('.').pop() || 'pdf';
    const storagePath = `${folder}/${contractId}.${ext}`;

    // Remove versão anterior (se existir) sem travar por erro de 404
    await supabase.storage.from('contracts').remove([storagePath]);

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

    // Salva o caminho interno (não a URL pública) na tabela
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { error: dbError } = await supabase.from(table).update({ contract_url: storagePath }).eq('id', contractId);
    if (dbError) throw new Error(`Arquivo enviado, mas falha ao salvar referência: ${dbError.message}`);

    return storagePath;
  }

  static async getContractSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(storagePath, 60); // 60 segundos de validade

    if (error || !data?.signedUrl) throw new Error(`Falha ao gerar link de acesso: ${error?.message}`);
    return data.signedUrl;
  }

  static async getContractTimeline(contractId: string, isTestMode?: boolean) {
    const table = isTestMode ? 'employee_loans_test' : 'employee_loans';
    const { data: loan, error } = await supabase.from(table).select('*').eq('id', contractId).single();
    if (error || !loan) throw new Error('Contrato não encontrado');
    
    const amount = parseFloat(String(loan.amount)) || 0;
    const inst = parseInt(String(loan.installments)) || 1;
    const installmentValue = amount / inst;
    
    // Matemática de elapsed vs extra. Precisamos mockar RawLoan pra type safe
    const elapsed = getElapsedMonths(loan as unknown as RawLoan); 
    const extraPaid = parseFloat(String(loan.amount_paid_extra)) || 0;
    const anticipatedCount = Math.floor(extraPaid / installmentValue);
    const postponed = parseInt(String(loan.postponed_months)) || 0;
    
    const [y, m] = loan.start_cycle.split('-').map(Number);
    let currentAbs = (y * 12) + m;
    
    const timeline = [];
    let physicalIndex = 1;
    let paidViaElapsed = 0;
    let postponedUsed = 0;
    
    for (let i = 0; i < inst + postponed; i++) {
      const curY = Math.floor((currentAbs - 1) / 12);
      const curM = ((currentAbs - 1) % 12) + 1;
      const label = `${String(curM).padStart(2, '0')}/${curY}`;
      
      let statusStr = '';
      if (paidViaElapsed < elapsed) {
        statusStr = 'PAGO';
        timeline.push({ index: physicalIndex++, label, status: statusStr, amount: installmentValue });
        paidViaElapsed++;
      } else if (postponedUsed < postponed) {
        statusStr = 'POSTERGADO';
        timeline.push({ index: 0, label, status: statusStr, amount: 0 });
        postponedUsed++;
      } else if ((physicalIndex - 1) < (elapsed + anticipatedCount)) {
        statusStr = 'ANTECIPADO';
        timeline.push({ index: physicalIndex++, label, status: statusStr, amount: installmentValue });
      } else {
        statusStr = 'A PAGAR';
        timeline.push({ index: physicalIndex++, label, status: statusStr, amount: installmentValue });
      }
      
      currentAbs++;
    }
    
    return timeline;
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
  if (!date || date === '-') return '-';
  try {
    const clean = date.split('T')[0];
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return '-';
  }
}
