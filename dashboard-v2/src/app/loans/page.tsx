"use client";

import { useState, useEffect } from "react";
import { HeaderDashboard } from "@/components/layout/HeaderDashboard";
import { FilterBar, FilterValues } from "@/components/loans/FilterBar";
import { StatCard } from "@/components/loans/StatCard";
import { ProjectionChart } from "@/components/loans/ProjectionChart";
import { EmployeeTable } from "@/components/loans/EmployeeTable";
import { SideDrawer } from "@/components/loans/SideDrawer";
import { PaymentProcessingModal } from "@/components/loans/PaymentProcessingModal";
import { LoansService, formatCurrency } from "@/services/loans.service";
import { Employee, LoanStats, ProjectionData } from "@/types/loans";
import { useDataMode } from "@/contexts/DataModeContext";
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

export default function LoansPage() {
  const { isTestMode } = useDataMode();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>(undefined);
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [projections, setProjections] = useState<ProjectionData[]>([]);
  
  // Loading states
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingProjections, setIsLoadingProjections] = useState(true);
  
  // Error states
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount and when test mode changes
  useEffect(() => {
    fetchData();
  }, [isTestMode]);

  const fetchData = async () => {
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
      const employeesData = await LoansService.getEmployees(undefined, isTestMode);
      setEmployees(employeesData);
      setFilteredEmployees(employeesData); // Reset filters on data refresh
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
      setError('Falha ao carregar colaboradores');
    } finally {
      setIsLoadingEmployees(false);
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
  };

  const handleFilterChange = (filters: FilterValues) => {
    let result = [...employees];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(term));
    }
    if (filters.empresa) {
      result = result.filter(e => e.company === filters.empresa);
    }
    if (filters.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters.vinculo) {
      result = result.filter(e => e.linkType === filters.vinculo);
    }
    if (!filters.incluirLiquidados) {
      result = result.filter(e => e.status !== 'Quitado');
    }

    setFilteredEmployees(result);
  };

  // Loading placeholder for stat cards
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
        
        <HeaderDashboard />
        
        <FilterBar onFilterChange={handleFilterChange} />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
            <button 
              onClick={fetchData}
              className="ml-auto text-xs font-semibold underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Botão Processar Parcelas */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            <CreditCard size={18} />
            Processar Parcelas
          </button>
        </div>

        {/* Primeiro Grid - Cards Principais Financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {isLoadingStats ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : stats && (
            <>
              <StatCard 
                title="Total Emprestado"
                value={formatCurrency(stats.totalEmprestado)}
                icon={<Receipt size={22} />}
                color="blue"
              />
              <StatCard 
                title="Saldo Devedor"
                value={formatCurrency(stats.saldoDevedor)}
                icon={<PiggyBank size={22} />}
                color="red"
              />
              <StatCard 
                title="Total Já Recebido"
                value={formatCurrency(stats.totalRecebido)}
                icon={<HandCoins size={22} />}
                color="green"
              />
              <StatCard 
                title="Recebível no Mês"
                value={formatCurrency(stats.recebivelMes)}
                icon={<CalendarClock size={22} />}
                color="emerald"
                trend="+12%"
              />
            </>
          )}
        </div>

        {/* Segundo Grid - Cards de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoadingStats ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : stats && (
            <>
              <StatCard 
                title="Contratos Ativos"
                value={stats.contratosAtivos.toString()}
                icon={<FileCheck size={22} />}
                color="purple"
                description="Acumulado histórico"
              />
              <StatCard 
                title="Contratos Liquidados"
                value={stats.contratosLiquidados.toString()}
                icon={<Files size={22} />}
                color="amber"
              />
              <StatCard 
                title="Maior Empréstimo"
                value={formatCurrency(stats.maiorEmprestimo)}
                icon={<TrendingUp size={22} />}
                color="sky"
                description={`Ref: ${stats.maiorEmprestimoRef}`}
              />
              <StatCard 
                title="Próximo a Encerrar"
                value={stats.proximoEncerrar}
                icon={<Timer size={22} />}
                color="slate"
                description={`${stats.parcelasRestantes} parcelas restantes`}
              />
            </>
          )}
        </div>

        {/* Seção de Gráfico */}
        <div className="mb-6">
          {isLoadingProjections ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          ) : (
            <ProjectionChart data={projections} />
          )}
        </div>

        {/* Seção de Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Detalhamento por Colaborador
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-500">
                {isLoadingEmployees ? '...' : `${filteredEmployees.length} de ${employees.length} registros`}
              </span>
            </h3>
            
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                Total
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-300" />
                Previsto
              </span>
            </div>
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
        </div>

        {/* Rodapé */}
        <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © 2026 Mar Brasil - Sistema de Gestão Financeira
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full text-slate-500">
            Versão v1.0
          </span>
        </footer>
      </div>

      {/* Painel Lateral */}
      <SideDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        employeeId={selectedEmployee}
        onDataChanged={fetchData}
      />

      {/* Modal de Processamento de Parcelas */}
      <PaymentProcessingModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </main>
  );
}
