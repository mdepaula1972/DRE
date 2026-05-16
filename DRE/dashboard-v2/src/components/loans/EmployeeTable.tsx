"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, FileText, Calendar, AlertCircle } from "lucide-react";
import { Employee, Contract } from "@/types/loans";
import { LoansService, formatCurrency, getBillingMonthStr, calcInstallmentForMonth } from "@/services/loans.service";
import { useDataMode } from "@/contexts/DataModeContext";

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeClick?: (employeeId: string) => void;
}

export function EmployeeTable({ employees, onEmployeeClick }: EmployeeTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentMonthStr = getBillingMonthStr();
  const [cy, cm] = currentMonthStr.split('-').map(Number);
  const billingDate = new Date(cy, cm - 1, 1);
  
  const currentMonthLabel = billingDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    .toUpperCase().replace('. ', '/').replace(' DE ', '/');
  const currentMonthFull = billingDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const handleRowClick = (emp: Employee) => {
    if (onEmployeeClick) {
      onEmployeeClick(emp.id);
    } else {
      setExpandedId(expandedId === emp.id ? null : emp.id);
    }
  };

  return (
    <div className="card-premium overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
          Listagem de Colaboradores
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-500 font-bold">
            {employees.length} REGISTROS
          </span>
        </h3>
        
        <div className="flex items-center gap-2">
           <button className="p-1.5 px-4 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
             ANTERIOR
           </button>
           <button className="p-1.5 px-4 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
             PRÓXIMO
           </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
              <th className="py-4 px-6 min-w-[300px]">Colaborador / Cargo</th>
              <th className="py-4 px-4 text-center">Empresa</th>
              <th className="py-4 px-4 text-center whitespace-nowrap">Vínculo</th>
              <th className="py-4 px-4 text-right">Remuneração</th>
              <th className="py-4 px-4 text-center">Aditivos</th>
              <th className="py-4 px-4 text-right">Saldo Devedor</th>
              <th className="py-4 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span>Parcela Mês</span>
                  <span className="text-[9px] font-bold text-emerald-600 normal-case tracking-normal">{currentMonthLabel}</span>
                </div>
              </th>
              <th className="py-4 px-4 text-center">Vencimento</th>
              <th className="py-4 px-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-sm italic">
                  Nenhum colaborador encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <EmployeeRow 
                  key={emp.id} 
                  employee={emp} 
                  isExpanded={expandedId === emp.id}
                  onToggle={() => handleRowClick(emp)}
                  currentMonthStr={currentMonthStr}
                  currentMonthFull={currentMonthFull}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeRow({ 
  employee, 
  isExpanded, 
  onToggle,
  currentMonthStr,
  currentMonthFull,
}: { 
  employee: Employee; 
  isExpanded: boolean; 
  onToggle: () => void;
  currentMonthStr: string;
  currentMonthFull: string;
}) {
  const { isTestMode } = useDataMode();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setIsLoading(true);
      LoansService.getEmployeeContracts(employee.id, isTestMode)
        .then(setContracts)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isExpanded, employee.id, isTestMode]);

  // Lógica para Aditivos: Usamos a contagem inteligente já calculada pelo Service (Deduplicada)
  const aditiveCount = employee.aditivoCount || 0;
  const hasAditives = aditiveCount > 0;

  // Lógica para Vencimento
  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr + 'T12:00:00');
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 10;
  };

  return (
    <>
      <tr 
        className={`hover:bg-slate-50 transition-all cursor-pointer group ${isExpanded ? 'bg-emerald-50/30' : ''}`}
        onClick={onToggle}
      >
        <td className="py-4 px-6">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-slate-100 border-2 ${isExpanded ? 'border-emerald-500 bg-white' : 'border-white group-hover:border-slate-200'} flex items-center justify-center text-sm font-black text-slate-400 transition-all shrink-0`}>
               {employee.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-800 line-clamp-1 uppercase tracking-tight">
                {employee.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                  employee.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                  'bg-slate-100 text-slate-500'
                }`}>
                  {employee.status}
                </span>
                {employee.job_role && (
                   <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                     {employee.job_role}
                   </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-4 text-center">
          <span className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
            {employee.company}
          </span>
        </td>
        <td className="py-4 px-4 text-center text-[10px] font-black text-slate-500 uppercase">
          {employee.linkType}
        </td>
        <td className="py-4 px-4 text-right text-sm font-bold text-slate-700 tabular-nums">
          {formatCurrency(employee.remuneration)}
        </td>
        
        {/* Nova Coluna: Aditivos */}
        <td className="py-4 px-4 text-center">
          {hasAditives ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
               <FileText size={12} />
               <span className="text-[10px] font-black">{aditiveCount}</span>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-300">Nenhum</span>
          )}
        </td>

        <td className="py-4 px-4 text-right text-sm font-bold text-red-600 tabular-nums">
          {formatCurrency(employee.balance)}
        </td>
        <td className="py-4 px-4 text-right">
          <span className="text-sm font-black text-emerald-600 tabular-nums">
            {formatCurrency(employee.monthInstallment)}
          </span>
        </td>

        {/* Nova Coluna: Vencimento */}
        <td className="py-4 px-4 text-center whitespace-nowrap">
          {employee.contract_expiry_date ? (
            <div className={`inline-flex flex-col items-center gap-0.5 ${isExpiringSoon(employee.contract_expiry_date) ? 'animate-pulse' : ''}`}>
               <span className={`text-[10px] font-black tabular-nums ${isExpiringSoon(employee.contract_expiry_date) ? 'text-amber-600' : 'text-slate-600'}`}>
                 {new Date(employee.contract_expiry_date + 'T12:00:00').toLocaleDateString('pt-BR')}
               </span>
               {isExpiringSoon(employee.contract_expiry_date) && (
                 <span className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1">
                   <AlertCircle size={8} /> Vence em breve
                 </span>
               )}
            </div>
          ) : (
             <span className="text-[10px] font-bold text-slate-300">-</span>
          )}
        </td>

        <td className="py-4 px-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <button className="p-2 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-slate-400 shadow-sm border border-transparent hover:border-emerald-600">
              <ExternalLink size={16} />
            </button>
            <button className={`p-2 rounded-lg transition-all border ${isExpanded ? 'bg-slate-800 text-white border-slate-900' : 'hover:bg-slate-100 text-slate-400 border-transparent'}`}>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0 border-t-0 bg-slate-50/50">
            <div className="p-8 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 gap-3 text-slate-400 font-bold text-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    Carregando detalhes...
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="col-span-full text-center text-slate-400 py-12 text-sm font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                    Nenhum contrato ativo para este colaborador.
                  </div>
                ) : contracts.map((contract, i) => {
                  const installmentThisMonth = calcInstallmentForMonth(contract as any, currentMonthStr);

                  return (
                  <div key={contract.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        contract.status === 'ATIVO' ? 'bg-emerald-500 text-white' : 
                        contract.status === 'LIQUIDADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-emerald-500/20">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operação</p>
                        <h4 className="text-sm font-black text-slate-800 truncate uppercase mt-1">
                          {contract.operationNumber || `OP. #${i + 1}`}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Valor do Empréstimo</span>
                        <span className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(Number(contract.value))}</span>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Saldo Residual</span>
                        <span className="text-sm font-black text-red-600 tabular-nums">{formatCurrency(Number(contract.balance))}</span>
                      </div>
                      <div className="flex justify-between items-center p-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Plano de Pagas</span>
                        <span className="text-sm font-bold text-slate-800 tabular-nums">{contract.installments}x de {formatCurrency(Number(contract.installmentValue))}</span>
                      </div>

                      <div className="flex justify-between items-center bg-emerald-600 p-3 rounded-xl mt-4 shadow-lg shadow-emerald-600/10">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest leading-none">Comprometimento</span>
                          <span className="text-[11px] font-black text-white capitalize mt-1">
                            {currentMonthFull}
                          </span>
                        </div>
                        <span className={`text-sm font-black tabular-nums text-white`}>
                          {installmentThisMonth > 0 ? formatCurrency(installmentThisMonth) : 'LIQUIDADO'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                       <button className="py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-md active:scale-95">Quitar Agora</button>
                       <button className="py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all active:scale-95">Auditoria</button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
