// Version Control - Dashboard Financeiro
// Updated automatically on each commit

export const APP_VERSION = "v.01.16";
export const VERSION_DATE = "2026-03-31";
export const VERSION_CHANGELOG = [
  "v.01.16 - Fix filter semantics (Quitado=employee/Liquidado=contract); stat cards react to active filters",
  "v.01.15 - Implement live FilterBar: search by name, empresa, status, vinculo, liquidados toggle",
  "v.01.14 - Fix action buttons (remove confirm/prompt blockers); fix hasTestEmployee query; pass contractUrl to ContractCard",
  "v.01.13 - Replace URL link with native secure file upload to Supabase Storage (contracts bucket)",
  "v.01.12 - Add detailed Contract Timeline and Contract URL attachment capability",
  "v.01.11 - Fix math offset bug in calcDebtForLoan; impl SideDrawer actions (posterg/antecip/liquidar/revert)",
  "v.01.10 - Add real-time dynamic EmployeeTable inline expansion connected to test environment",
  "v.01.09 - Fix loan_stats view column references",
  "v.01.08 - Fix empty employee_name by using full_name as fallback",
  "v.01.07 - Add test employee management buttons in UI",
  "v.01.06 - Generate installments directly without view dependency",
  "v.01.05 - Fix generate_installments to use contract_id",
  "v.01.04 - Add full_name column to test employee",
  "v.01.03 - Remove updated_at from test employee function",
  "v.01.02 - Add simplified test employee system with revert capability",
  "v.01.01 - Add version control and display in header",
  "v.01.00 - Fix: loans_data type JSONB for views to work correctly",
  "v.00.99 - Add data mode selector (Production/Test)",
  "v.00.98 - Add PaymentProcessingModal for manual payment control",
  "v.00.97 - Add loan_payments table and test environment",
];
