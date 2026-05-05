"use client";

import { useState, useEffect } from "react";
import { HeaderDashboard } from "@/components/layout/HeaderDashboard";
import { StatCard } from "@/components/loans/StatCard";
import { OmieImportPanel } from "@/components/lancamentos/OmieImportPanel";
import { LancamentosFilterBar } from "@/components/lancamentos/LancamentosFilterBar";
import { LancamentosTable } from "@/components/lancamentos/LancamentosTable";
import { LancamentosService, formatCurrency } from "@/services/lancamentos.service";
import { Lancamento, LancamentoFilterValues, LancamentoStats } from "@/types/lancamentos";
import { APP_VERSION } from "@/version";
import {
  Receipt,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function LancamentosPage() {
  // Data states
  const [allLancamentos, setAllLancamentos] = useState<Lancamento[]>([]);
  const [filteredLancamentos, setFilteredLancamentos] = useState<Lancamento[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [dimDRE, setDimDRE] = useState<Map<string, string>>(new Map());
  const [dimProjetos, setDimProjetos] = useState<Map<string, string>>(new Map());
  const [dimCategorias, setDimCategorias] = useState<Map<string, any>>(new Map());

  const [stats, setStats] = useState<LancamentoStats>({ totalSaidaMes: 0, totalAberto: 0, totalPago: 0 });
  const [activeFilters, setActiveFilters] = useState<LancamentoFilterValues>({ dateBase: 'registro' });

  // Pagination Config
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters(allLancamentos, activeFilters);
  }, [activeFilters, allLancamentos]);

  const fetchData = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Sincronizando com a carga histórica 2024
      const data = await LancamentosService.getLancamentos('2024-01-01');
      setAllLancamentos(data.lancamentos);
      setAllocations(data.allocations);
      setDimDRE(data.dimDRE);
      setDimProjetos(data.dimProjetos);
      setDimCategorias(data.dimCategorias);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (confirm("Deseja realmente limpar todos os dados da plataforma?")) {
      setIsLoading(true);
      await LancamentosService.clearAll();
      await fetchData();
    }
  };

  const applyFilters = (base: Lancamento[], filters: LancamentoFilterValues) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = base.filter(item => {
      // 1. Empresa
      if (filters.empresa) {
        const itemEmpresa = (item.empresa_nome || '').toUpperCase().trim();
        const filterEmpresa = filters.empresa.toUpperCase().trim();
        if (filterEmpresa === 'MAR BRASIL' && !itemEmpresa.includes('MAR BRASIL')) return false;
        if (filterEmpresa === 'DZM' && (!itemEmpresa.includes('DZM') || itemEmpresa.includes('MAR BRASIL'))) return false;
        if (filterEmpresa !== 'MAR BRASIL' && filterEmpresa !== 'DZM' && !itemEmpresa.includes(filterEmpresa)) return false;
      }

      // 2. Data Base
      let dataRefStr = '';
      if (filters.dateBase === 'vencimento') dataRefStr = item.data_vencimento || '';
      else if (filters.dateBase === 'pagamento') dataRefStr = item.data_pagamento || '';
      else dataRefStr = item.data_registro || item.data_pagamento || '';

      if (!dataRefStr || dataRefStr === '---') {
        if (filters.startDate || filters.endDate) return false;
      } else {
        const p = dataRefStr.includes('/') ? dataRefStr.split('/') : dataRefStr.split('-');
        const itemDate = p[0].length === 4
          ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2].slice(0, 2)))
          : new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        
        itemDate.setHours(0,0,0,0);

        if (filters.startDate) {
          const start = new Date(filters.startDate + 'T00:00:00');
          if (itemDate < start) return false;
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate + 'T00:00:00');
          if (itemDate > end) return false;
        }
      }

      item._dataLabel = dataRefStr;
      if (dataRefStr && dataRefStr !== '---') {
        const p = dataRefStr.includes('/') ? dataRefStr.split('/') : dataRefStr.split('-');
        item._dataSort = p[0].length === 4
          ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2].slice(0, 2)))
          : new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      } else {
        item._dataSort = new Date(0);
      }

      // 3. Status
      const statusRaw = (item.status || '').toUpperCase();
      const isPaid = statusRaw.includes('PAGO');
      const dtVenc = item.data_vencimento ? new Date(item.data_vencimento + 'T12:00:00') : new Date('2099-01-01');
      const isOverdue = !isPaid && (statusRaw === 'ATRASADO' || (dtVenc < today && !!item.data_vencimento && item.data_vencimento !== '---'));

      if (filters.status) {
        if (filters.status === 'PAGO' && !isPaid) return false;
        if (filters.status === 'ABERTO' && (isPaid || isOverdue)) return false;
        if (filters.status === 'ATRASADO' && !isOverdue) return false;
      }

      // 4. Fonte
      if (filters.source && item.fonte !== filters.source) return false;

      // 5. Categoria
      if (filters.categoria && item.categoria_codigo !== filters.categoria) {
        const catKey = `${String(item.empresa_nome || '').trim()}-${String(item.categoria_codigo)}`;
        const catName = item.categoria_nome || dimCategorias.get(catKey)?.descricao;
        if (catName !== filters.categoria) return false;
      }

      // 6. Projeto
      if (filters.projeto && item.projeto_nome !== filters.projeto) return false;

      // 7. Search
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (!item.fornecedor_nome?.toLowerCase().includes(term) && !item.raw_data?.observacao?.toLowerCase().includes(term)) return false;
      }

      return true;
    });

    result.sort((a, b) => (b._dataSort?.getTime() || 0) - (a._dataSort?.getTime() || 0));
    setFilteredLancamentos(result);
    setCurrentPage(1);
    computeStats(result);
  };

  const computeStats = (items: Lancamento[]) => {
    let totalOut = 0, totalPaid = 0, totalPending = 0;
    items.forEach(item => {
      const val = item.valor_alocado || 0;
      totalOut += val;
      const isPaid = (item.status || '').toUpperCase().includes('PAGO');
      if (isPaid) totalPaid += val;
      else totalPending += val;
    });
    setStats({ totalSaidaMes: totalOut, totalAberto: totalPending, totalPago: totalPaid });
  };

  const totalPages = Math.ceil(filteredLancamentos.length / pageSize) || 1;
  const paginatedLancamentos = filteredLancamentos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <HeaderDashboard />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Lançamentos Financeiros
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Gestão Integrada Omie (Motor 360º Ativo)
              <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                {APP_VERSION}
              </span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={fetchData} className="ml-auto text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        <OmieImportPanel 
          onImportComplete={fetchData}
          onClear={handleClearData}
          isClearingAll={isLoading}
        />

        <LancamentosFilterBar
          onFilterChange={setActiveFilters}
          availableCategories={(() => {
            const base = activeFilters.empresa
              ? allLancamentos.filter(l => (l.empresa_nome || '').toUpperCase().includes(activeFilters.empresa!.toUpperCase()))
              : allLancamentos;
            return Array.from(new Set(base.map(l => l.categoria_nome).filter(Boolean))).sort() as string[];
          })()}
          availableProjects={(() => {
            const base = activeFilters.empresa
              ? allLancamentos.filter(l => (l.empresa_nome || '').toUpperCase().includes(activeFilters.empresa!.toUpperCase()))
              : allLancamentos;
            return Array.from(new Set(base.map(l => l.projeto_nome).filter(Boolean))).sort() as string[];
          })()}
          availableDepartments={(() => {
            const base = activeFilters.empresa
              ? allLancamentos.filter(l => (l.empresa_nome || '').toUpperCase().includes(activeFilters.empresa!.toUpperCase()))
              : allLancamentos;
            return Array.from(new Set(base.map(l => l.departamento_nome).filter(Boolean))).sort() as string[];
          })()}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard title="Total Filtrado" value={formatCurrency(stats.totalSaidaMes)} icon={<Receipt size={24} />} color="blue" />
          <StatCard title="Em Aberto" value={formatCurrency(stats.totalAberto)} icon={<Clock size={24} />} color="amber" />
          <StatCard title="Total Pago" value={formatCurrency(stats.totalPago)} icon={<CheckCircle2 size={24} />} color="emerald" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Montando visão consolidada...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <LancamentosTable 
              lancamentos={paginatedLancamentos} 
              allocations={allocations}
              dimDRE={dimDRE}
              dimProjetos={dimProjetos}
              dimCategorias={dimCategorias}
            />
            
            <div className="flex items-center justify-between px-2">
               <span className="text-xs font-bold text-slate-400 uppercase">Página {currentPage} de {totalPages}</span>
               <div className="flex gap-2">
                 <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                 <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">Próxima</button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
