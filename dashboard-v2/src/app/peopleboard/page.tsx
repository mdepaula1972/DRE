"use client";

import { useState, useEffect } from "react";
import { HeaderDashboard } from "@/components/layout/HeaderDashboard";
import { FilterBar, FilterValues } from "@/components/loans/FilterBar";
import { StatCard } from "@/components/loans/StatCard";
import { ProjectionChart } from "@/components/loans/ProjectionChart";
import { EmployeeTable } from "@/components/loans/EmployeeTable";
import { SideDrawer } from "@/components/loans/SideDrawer";
import { ProfileDrawer } from "@/components/people/ProfileDrawer";
import { PaymentProcessingModal } from "@/components/loans/PaymentProcessingModal";
import { NewLoanModal } from "@/components/loans/NewLoanModal";
import { LoansService, formatCurrency, getBillingMonthStr } from "@/services/loans.service";
import { Employee, LoanStats, ProjectionData } from "@/types/loans";
import { useDataMode } from "@/contexts/DataModeContext";
import { APP_VERSION } from "@/version";
import { 
  Receipt, 
  PiggyBank, 
  HandCoins, 
  CalendarClock, 
  FileCheck, 
  Files, 
  TrendingUp, 
  Timer,
  Loader2,
  AlertCircle,
  CreditCard
} from "lucide-react";

export default function PeopleboardPage() {
  const { isTestMode } = useDataMode();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>(undefined);
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [projections, setProjections] = useState<ProjectionData[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterValues | undefined>(undefined);
  
  // Lista de colaboradores com contrato vencendo (<= 10 dias)
  const [expiringEmployees, setExpiringEmployees] = useState<Employee[]>([]);

  // Calcula os totais dos cards dinamicamente a partir do array filtrado
  const computeStats = (list: Employee[], base: LoanStats | null): LoanStats | null => {
    if (!base) return null;
    if (list.length === 0) return { ...base, totalEmprestado: 0, saldoDevedor: 0, totalRecebido: 0, recebivelMes: 0, contratosAtivos: 0, contratosLiquidados: 0 };
    return {
      ...base,
      totalEmprestado: list.reduce((s, e) => s + (e.totalTaken || 0), 0),
      saldoDevedor: list.reduce((s, e) => s + (e.balance || 0), 0),
      totalRecebido: list.reduce((s, e) => s + (e.totalReceived || 0), 0),
      recebivelMes: list.reduce((s, e) => s + (e.monthInstallment || 0), 0),
      contratosAtivos: list.filter(e => e.status === 'Ativo').length,
      contratosLiquidados: list.filter(e => e.status === 'Quitado').length,
    };
  };

  const filteredStats = computeStats(filteredEmployees, stats);
  
  // Loading states
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingProjections, setIsLoadingProjections] = useState(true);
  
  // Error states
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount and when test mode or active filters change
  useEffect(() => {
    fetchData(activeFilters);
  }, [isTestMode, activeFilters?.mostrarTodos]);

  const fetchData = async (filters?: FilterValues) => {
    setError(null);
    
    try {
      // Fetch stats
      setIsLoadingStats(true);
      const statsData = await LoansService.getStats(isTestMode);
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
      setError('Falha ao carregar estatísticas');
    } finally {
      setIsLoadingStats(false);
    }

    try {
      // Fetch employees
      setIsLoadingEmployees(true);
      const employeesData = await LoansService.getEmployees(filters, isTestMode);
      setEmployees(employeesData);
      
      if (filters) {
        applyLocalFilters(employeesData, filters);
      } else {
        setFilteredEmployees(employeesData);
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
      setError('Falha ao carregar colaboradores');
    } finally {
      setIsLoadingEmployees(false);
    }

    // Check for expiring contracts
    try {
      const allEmps = await LoansService.getEmployees({ mostrarTodos: true }, isTestMode);
      const now = new Date();
      const warningThreshold = new Date();
      warningThreshold.setDate(now.getDate() + 10);

      const expiring = allEmps.filter(e => {
        if (!e.contract_expiry_date) return false;
        const expiry = new Date(e.contract_expiry_date + 'T12:00:00');
        return expiry >= now && expiry <= warningThreshold;
      });
      setExpiringEmployees(expiring);
    } catch (err) {
      console.error('Erro ao verificar vencimentos:', err);
    }

    try {
      // Fetch projections
      setIsLoadingProjections(true);
      const projectionsData = await LoansService.getProjections(isTestMode);
      setProjections(projectionsData);
    } catch (err) {
      console.error('Erro ao carregar projeções:', err);
    } finally {
      setIsLoadingProjections(false);
    }
  };

  const handleEmployeeClick = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setIsDrawerOpen(true);
    setIsProfileDrawerOpen(true);
  };

  const handleCreateEmployeeClick = () => {
    setSelectedEmployee(undefined);
    setIsProfileDrawerOpen(true);
  };

  const handleFilterChange = (filters: FilterValues) => {
    setActiveFilters(filters);
    applyLocalFilters(employees, filters);
  };

  const applyLocalFilters = (baseList: Employee[], filters: FilterValues) => {
    let result = [...baseList];

    if (!filters.incluirQuitados) {
      result = result.filter(e => {
        if (e.totalTaken > 0 && e.balance <= 0) return false;
        return true;
      });
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(term));
    }
    if (filters.empresa) {
      result = result.filter(e => e.company === filters.empresa);
    }
    if (filters.vinculo) {
      result = result.filter(e => e.linkType === filters.vinculo);
    }
    
    // Novos Filtros
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    
    if (filters.cargo) {
      const cargoTerm = filters.cargo.toLowerCase();
      result = result.filter(e => (e.job_role || '').toLowerCase().includes(cargoTerm));
    }
    
    if (filters.remuneracaoRange) {
      result = result.filter(e => {
        const salary = e.remuneration || 0;
        switch (filters.remuneracaoRange) {
          case 'ate2k': return salary < 2000;
          case '2k-3.5k': return salary >= 2000 && salary < 3500;
          case '3.5k-5k': return salary >= 3500 && salary <= 5000;
          case 'acima5k': return salary > 5000;
          default: return true;
        }
      });
    }
    
    if (filters.temAditivo !== '') {
      const wantAditive = filters.temAditivo === 'sim';
      result = result.filter(e => {
        const count = e.aditivoCount || 0;
        return wantAditive ? count > 0 : count === 0;
      });
    }

    setFilteredEmployees(result);
  };

  const StatCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-24" />
          <div className="h-6 bg-slate-200 rounded w-32" />
        </div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <HeaderDashboard 
          activeFilters={activeFilters} 
          isTestMode={isTestMode} 
          onCreateEmployee={handleCreateEmployeeClick}
          onOpenNewLoan={() => setIsNewLoanOpen(true)}
        />
        
        <FilterBar onFilterChange={handleFilterChange} />

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
            <button 
              onClick={() => fetchData(activeFilters)}
              className="ml-auto text-xs font-semibold underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {expiringEmployees.length > 0 && (
          <div className="mb-6 p-1 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-[14px] flex items-start gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 shadow-inner">
                  <CalendarClock className="text-amber-600" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Alerta de Vencimento</h4>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Prazo Curto</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Identificamos contratos ou aditivos com vencimento nos próximos 10 dias. Recomenda-se a renovação ou baixa:
                </p>
                <div className="flex flex-wrap gap-2">
                  {expiringEmployees.map(e => {
                    const expiry = new Date(e.contract_expiry_date! + 'T12:00:00');
                    const diffTime = expiry.getTime() - new Date().getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    return (
                      <button 
                        key={e.id}
                        onClick={() => handleEmployeeClick(e.id)}
                        className="group relative px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all flex items-center gap-3 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
                        <div className="text-left">
                          <div className="text-[11px] font-bold text-slate-900 group-hover:text-amber-700 transition-colors uppercase leading-none mb-1">
                            {e.name}
                          </div>
                          <div className="text-[9px] font-medium text-slate-500 flex items-center gap-1">
                            <Timer size={10} />
                            Vence em {diffDays} {diffDays === 1 ? 'dia' : 'dias'} ({new Date(e.contract_expiry_date!).toLocaleDateString('pt-BR')})
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            <CreditCard size={18} />
            Processar Parcelas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {isLoadingStats ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : filteredStats && (
            <>
              <StatCard 
                title="Total Emprestado"
                value={formatCurrency(filteredStats.totalEmprestado)}
                icon={<Receipt size={22} />}
                color="blue"
              />
              <StatCard 
                title="Saldo Devedor"
                value={formatCurrency(filteredStats.saldoDevedor)}
                icon={<PiggyBank size={22} />}
                color="red"
              />
              <StatCard 
                title="Total Já Recebido"
                value={formatCurrency(filteredStats.totalRecebido)}
                icon={<HandCoins size={22} />}
                color="green"
              />
              <StatCard 
                title="Total Mês"
                value={formatCurrency(filteredStats.recebivelMes)}
                icon={<CalendarClock size={22} />}
                color="emerald"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoadingStats ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : filteredStats && (
            <>
              <StatCard 
                title="Colaboradores Ativos"
                value={filteredStats.contratosAtivos.toString()}
                icon={<FileCheck size={22} />}
                color="purple"
                description="Com dívida ativa"
              />
              <StatCard 
                title="Totalmente Quitados"
                value={filteredStats.contratosLiquidados.toString()}
                icon={<Files size={22} />}
                color="amber"
                description="Sem dívida pendente"
              />
              <StatCard 
                title="Maior Empréstimo"
                value={formatCurrency(stats?.maiorEmprestimo ?? 0)}
                icon={<TrendingUp size={22} />}
                color="sky"
                description={`Ref: ${stats?.maiorEmprestimoRef ?? '-'}`}
              />
              <StatCard 
                title="Próximo a Encerrar"
                value={stats?.proximoEncerrar ?? '-'}
                icon={<Timer size={22} />}
                color="slate"
                description={`${stats?.parcelasRestantes ?? 0} parcelas restantes`}
              />
            </>
          )}
        </div>

        <div className="mb-6">
          {isLoadingProjections ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <ProjectionChart data={projections} />
          )}
        </div>

        {isLoadingEmployees ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <EmployeeTable 
            employees={filteredEmployees}
            onEmployeeClick={handleEmployeeClick} 
          />
        )}

        <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © 2026 Mar Brasil - Peopleboard Cockpit
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full text-slate-500">
            Versão {APP_VERSION}
          </span>
        </footer>
      </div>

      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setIsProfileDrawerOpen(false);
          setSelectedEmployee(undefined);
        }} 
        employeeId={selectedEmployee}
        onDataChanged={fetchData}
        onAddNewLoan={() => setIsNewLoanOpen(true)}
      />

      <ProfileDrawer 
        isOpen={isProfileDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setIsProfileDrawerOpen(false);
          setSelectedEmployee(undefined);
        }} 
        employeeId={selectedEmployee}
        onDataChanged={fetchData}
      />

      <PaymentProcessingModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <NewLoanModal 
        isOpen={isNewLoanOpen} 
        onClose={() => setIsNewLoanOpen(false)} 
        onSuccess={() => fetchData(activeFilters)}
        onGenerateTerm={(loanData) => {
          const { PDFService } = require('@/services/pdf.service');
          PDFService.generateDebtTermPDF(loanData, {}, isTestMode);
        }}
      />
    </main>
  );
}
