"use client";

import { useState, useEffect } from "react";
import { X, Wallet, ArrowUpRight, History, CreditCard, Clock, CheckCircle, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Employee, Contract } from "@/types/loans";
import { LoansService, formatCurrency, formatDate } from "@/services/loans.service";
import { ContractCard } from "./ContractCard";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}

export function SideDrawer({ isOpen, onClose, employeeId }: SideDrawerProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeData(employeeId);
    }
  }, [isOpen, employeeId]);

  const fetchEmployeeData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [empData, contractsData] = await Promise.all([
        LoansService.getEmployeeDetails(id),
        LoansService.getEmployeeContracts(id)
      ]);
      
      setEmployee(empData);
      setContracts(contractsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Falha ao carregar dados do colaborador');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Mock data fallback when no employee loaded
  const mockEmployee: Employee = {
    id: '1',
    name: 'Ana Carolina Pereira da Silva Medaglia Moura',
    company: 'MayBR',
    linkType: 'PJ',
    remuneration: 13500,
    totalTaken: 183300,
    totalReceived: 69499.25,
    balance: 113800.75,
    monthInstallment: 1400,
    contractsCount: 5,
    status: 'Ativo'
  };

  const displayEmployee = employee || mockEmployee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          
          {/* Drawer */}
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  {getInitials(displayEmployee.name)}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {displayEmployee.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{displayEmployee.company}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-emerald-600">{displayEmployee.linkType}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 text-sm">
                {error}
              </div>
            ) : (
            <div className="p-6 space-y-8">
              {/* Resumo Financeiro */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Tomado</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(displayEmployee.totalTaken)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Já Recebido</p>
                  <p className="text-lg font-black text-emerald-600 tabular-nums">{formatCurrency(displayEmployee.totalReceived)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Saldo Devedor</p>
                  <p className="text-lg font-black text-red-600 tabular-nums">{formatCurrency(displayEmployee.balance)}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Remuneração</p>
                  <p className="text-lg font-black text-amber-600 tabular-nums">{formatCurrency(displayEmployee.remuneration)}</p>
                </div>
              </div>

              {/* Contratos */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                  <CreditCard size={14} className="text-emerald-600" />
                  Contratos Ativos ({contracts.length})
                </h3>
                
                {contracts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Nenhum contrato encontrado</p>
                ) : (
                  contracts.map(contract => (
                    <ContractCard
                      key={contract.id}
                      contract={{
                        id: contract.id,
                        operationNumber: contract.operationNumber,
                        value: formatCurrency(contract.value),
                        balance: formatCurrency(contract.balance),
                        installments: `${contract.installments}x de ${formatCurrency(contract.installmentValue)}`,
                        nextPayment: formatDate(contract.nextPaymentDate),
                        endDate: formatDate(contract.endDate || contract.nextPaymentDate),
                        status: contract.status,
                        startDate: contract.startDate
                      }}
                    />
                  ))
                )}
              </div>

              {/* Histórico Recente - Desativado até ter dados reais no banco */}
              {/*
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                  <History size={14} className="text-slate-400" />
                  Histórico Recente
                </h3>
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 italic">Histórico de pagamentos será implementado em breve.</p>
                </div>
              </div>
              */}
            </div>
            )}

            <div className="sticky bottom-0 p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 mt-auto">
               <button 
                 onClick={onClose}
                 className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-md"
               >
                 Fechar Painel
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
