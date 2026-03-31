"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { Employee, Contract } from "@/types/loans";
import { LoansService, formatCurrency } from "@/services/loans.service";
import { useDataMode } from "@/contexts/DataModeContext";

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeClick?: (employeeId: string) => void;
}

export function EmployeeTable({ employees, onEmployeeClick }: EmployeeTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          Detalhamento por Colaborador
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-500">
            TOTAL: {employees.length}
          </span>
        </h3>
        
        <div className="flex items-center gap-2">
           <button className="p-1 px-3 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
             ANTERIOR
           </button>
           <button className="p-1 px-3 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
             PRÓXIMO
           </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">Empresa</th>
              <th className="py-3 px-4">Vínculo</th>
              <th className="py-3 px-4">Remuneração</th>
              <th className="py-3 px-4">Total Tomado</th>
              <th className="py-3 px-4">Total Recebido</th>
              <th className="py-3 px-4">Saldo Devedor</th>
              <th className="py-3 px-4">Parcela Mês</th>
              <th className="py-3 px-4">Contratos</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 text-sm">
                  Nenhum colaborador encontrado
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <EmployeeRow 
                  key={emp.id} 
                  employee={emp} 
                  isExpanded={expandedId === emp.id}
                  onToggle={() => handleRowClick(emp)}
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
  onToggle 
}: { 
  employee: Employee; 
  isExpanded: boolean; 
  onToggle: () => void; 
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

  return (
    <>
      <tr 
        className={`hover:bg-slate-50/80 transition-all cursor-pointer ${isExpanded ? 'bg-primary/5' : ''}`}
        onClick={onToggle}
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border-2 ${isExpanded ? 'border-primary' : 'border-white'} flex items-center justify-center text-xs font-bold text-slate-600 group`}>
               {employee.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                {employee.name}
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${employee.status === 'Ativo' ? 'bg-success/10 text-success' : 'bg-amber-100 text-primary'}`}>
                {employee.status}
              </span>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {employee.company}
          </span>
        </td>
        <td className="py-4 px-4 text-xs font-semibold text-slate-500">
          {employee.linkType}
        </td>
        <td className="py-4 px-4 text-sm font-bold text-slate-700 tabular-nums">
          {formatCurrency(employee.remuneration)}
        </td>
        <td className="py-4 px-4 text-sm font-bold text-slate-700 tabular-nums">
          {formatCurrency(employee.totalTaken)}
        </td>
        <td className="py-4 px-4 text-sm font-bold text-emerald-600 tabular-nums">
          {formatCurrency(employee.totalReceived)}
        </td>
        <td className="py-4 px-4 text-sm font-bold text-red-600 tabular-nums">
          {formatCurrency(employee.balance)}
        </td>
        <td className="py-4 px-4">
          <span className="text-sm font-black text-emerald-600 tabular-nums">
            {formatCurrency(employee.monthInstallment)}
          </span>
        </td>
        <td className="py-4 px-4">
           <div className="flex gap-1">
              {[...Array(Math.min(3, employee.contractsCount))].map((_, i) => (
                <div key={i} className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                  {i + 1}
                </div>
              ))}
              {employee.contractsCount > 3 && (
                <div className="w-5 h-5 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-400">
                  +{employee.contractsCount - 3}
                </div>
              )}
           </div>
        </td>
        <td className="py-4 px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-all text-slate-400 hover:text-primary">
              <ExternalLink size={16} />
            </button>
            <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-all text-slate-400">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={10} className="p-0 border-t-0">
            <div className="bg-primary/5 p-6 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="col-span-full text-center text-slate-400 py-8 text-sm">
                    Nenhum contrato encontrado.
                  </div>
                ) : contracts.map((contract, i) => (
                  <div key={contract.id} className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        contract.status === 'ATIVO' ? 'bg-primary/10 text-primary' : 
                        contract.status === 'LIQUIDADO' ? 'bg-success/10 text-success' : 'bg-red-100 text-red-600'
                      }`}>
                        {contract.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">#0{i + 1}</div>
                      {contract.operationNumber || `OP. #${i + 1}`}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Valor Tomado:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(Number(contract.value))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Saldo Devedor:</span>
                        <span className="font-bold text-red-600">{formatCurrency(Number(contract.balance))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500">Parcelas:</span>
                        <span className="font-bold text-slate-800">{contract.installments}x de {formatCurrency(Number(contract.installmentValue))}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                       <button className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-100 transition-colors">Liquidar</button>
                       <button className="p-1.5 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-200 transition-colors">Detalhes</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
