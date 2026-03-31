/**
 * Logic for loan calculations ported from legacy system.
 * Based on the 'day 10 closing' rule.
 */

export interface Loan {
  id: string;
  employee_id: string;
  amount: number | string;
  installments: number;
  start_cycle: string; // YYYY-MM
  amount_paid_extra?: number | string;
  notes?: string;
  status?: string;
}

export interface Employee {
  id: string;
  full_name: string;
  company: string;
  employment_type: string;
  remuneration: number | string;
  _loans: Loan[];
}

export function calculateLoanDebt(ln: Loan): number {
  const now = new Date();
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  const sc = ln.start_cycle;
  if (!amount || !inst || !sc) return 0;

  const [y, m] = sc.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  
  // Calculate elapsed months
  let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  
  // Closing day 10 rule: if today is before the 10th, the current installment hasn't "hit" the debt yet
  if (now.getDate() < 10) elapsed--;
  
  elapsed = Math.max(0, Math.min(elapsed, inst));

  const standardPaid = elapsed * (amount / inst);
  const extraPaid = parseFloat(String(ln.amount_paid_extra)) || 0;
  
  return Math.max(0, amount - (standardPaid + extraPaid));
}

export function calculateTotalDebt(emp: Employee): number {
  return (emp._loans || []).reduce((acc, ln) => acc + calculateLoanDebt(ln), 0);
}

export function calculateTotalTaken(emp: Employee): number {
  return (emp._loans || []).reduce((acc, ln) => acc + (parseFloat(String(ln.amount)) || 0), 0);
}

export function getInstallmentForMonthSingle(ln: Loan, monthStr: string): number {
  const [ty, tm] = monthStr.split("-").map(Number);
  const targetAbs = ty * 12 + tm;
  
  const amount = parseFloat(String(ln.amount)) || 0;
  const inst = parseInt(String(ln.installments)) || 0;
  const sc = ln.start_cycle;
  if (!amount || !inst || !sc) return 0;

  const [sy, sm] = sc.split("-").map(Number);
  const startAbs = sy * 12 + sm;
  const endAbs = startAbs + inst - 1;

  if (targetAbs >= startAbs && targetAbs <= endAbs) {
    return amount / inst;
  }
  return 0;
}

export function getEmployeeInstallmentForMonth(emp: Employee, monthStr: string): number {
  return (emp._loans || []).reduce((acc, ln) => acc + getInstallmentForMonthSingle(ln, monthStr), 0);
}
