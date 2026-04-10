"use client";

import { useState, useEffect } from "react";
import { HeaderDashboard } from "@/components/layout/HeaderDashboard";
import { StatCard } from "@/components/loans/StatCard";
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
  const [isSyncing, setIsSyncing] = useState(false);
  
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
      // By default fetch from 2025-06-01. We could make this dynamic, but aligning with legacy.
      const data = await LancamentosService.getLancamentos('2025-06-01');
      setAllLancamentos(data.lancamentos);
      setAllocations(data.allocations);
      setDimDRE(data.dimDRE);
      setDimProjetos(data.dimProjetos);
      setDimCategorias(data.dimCategorias);
    } catch (err) {
      console.error('Erro ao carregar Lançamentos:', err);
      setError('Falha ao carregar registros. O banco de dados pode estar inacessível.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (base: Lancamento[], filters: LancamentoFilterValues) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    let result = base.filter(item => {
      // 1. Empresa
      if (filters.empresa) {
        const eName = (item.empresa || '').toUpperCase();
        if (!eName.includes(filters.empresa.toUpperCase())) return false;
      }

      // 2. Data Base / Mês
      let dataRefStr = '';
      if (filters.dateBase === 'vencimento') dataRefStr = item.data_vencimento || '';
      else if (filters.dateBase === 'pagamento') dataRefStr = item.data_pagamento || '';
      else dataRefStr = item.data_entrada || item.data_pagamento || '';

      if (!dataRefStr || dataRefStr === '---') {
        if (filters.month) return false;
      } else {
        if (filters.month) {
          const parts = dataRefStr.includes('/') ? dataRefStr.split('/') : dataRefStr.split('-');
          if (parts.length === 3) {
            let itemMonth = '';
            if (parts[0].length === 4) itemMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`;
            else itemMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;

            if (itemMonth !== filters.month) return false;
          }
        }
      }

      // Propriedades internas úteis pra ordenação
      item._dataLabel = dataRefStr;
      if (dataRefStr && dataRefStr !== '---') {
        const p = dataRefStr.includes('/') ? dataRefStr.split('/') : dataRefStr.split('-');
        item._dataSort = p[0].length === 4 
          ? new Date(Number(p[0]), Number(p[1])-1, Number(p[2].slice(0,2)))
          : new Date(Number(p[2]), Number(p[1])-1, Number(p[0]));
      } else {
        item._dataSort = new Date(0);
      }

      // 3. Status
      const statusRaw = (item.status_titulo || '').toUpperCase();
      const isPaid = statusRaw.includes('PAGO');
      const dtVenc = item.data_vencimento ? new Date(item.data_vencimento + 'T12:00:00') : new Date('2099-01-01');
      const isOverdue = !isPaid && dtVenc < today && !!item.data_vencimento && item.data_vencimento !== '---';

      if (filters.status) {
        if (filters.status === 'PAGO' && !isPaid) return false;
        if (filters.status === 'ABERTO' && (isPaid || isOverdue)) return false;
        if (filters.status === 'ATRASADO' && !isOverdue) return false;
      }

      // 4. Origem
      if (filters.source && item.fonte !== filters.source) return false;

      // 5. Search Text
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (!item.fornecedor.toLowerCase().includes(term) && !item.observacao?.toLowerCase().includes(term)) {
          return false;
        }
      }

      return true;
    });

    // Ordenar do mais novo pro mais velho
    result.sort((a, b) => (b._dataSort?.getTime() || 0) - (a._dataSort?.getTime() || 0));

    setFilteredLancamentos(result);
    setCurrentPage(1); // Reset page on filter change
    computeStats(result);
  };

  const totalPages = Math.ceil(filteredLancamentos.length / pageSize) || 1;
  const paginatedLancamentos = filteredLancamentos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const computeStats = (items: Lancamento[]) => {
    let totalOut = 0, totalPaid = 0, totalPending = 0;
    
    items.forEach(item => {
      const val = item.valor || 0;
      totalOut += val;
      
      const statusRaw = (item.status_titulo || '').toUpperCase();
      if (statusRaw.includes('PAGO')) {
        totalPaid += val;
      } else {
        totalPending += val;
      }
    });

    setStats({ totalSaidaMes: totalOut, totalAberto: totalPending, totalPago: totalPaid });
  };

  const triggerOmieSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/omie/sync', { method: 'POST' });
      const json = await res.json();
      const msg = json.message || 'Sincronização concluída.';
      const errMsg = json.errors?.length > 0 ? `\n\nAvisos:\n${json.errors.join('\n')}` : '';
      alert(`✅ ${msg}${errMsg}`);
      // Reload data from Supabase after sync
      await fetchData();
    } catch (e: any) {
      alert(`❌ Erro na sincronização: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Usamos o HeaderDashboard mas substituímos o onCreateEmployee pelo Update Dashboard que queremos aqui */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Receipt className="text-emerald-600" size={28} />
              Lançamentos Financeiros
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Gestão de Competência e Caixa Integrada ao Omie</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={triggerOmieSync}
              disabled={isSyncing}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-75 disabled:cursor-wait"
            >
              {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
              {isSyncing ? "Sincronizando..." : "Sincronizar Últimos 3 Dias (Omie)"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 animate-in fade-in">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
            <button 
              onClick={fetchData}
              className="ml-auto text-xs font-bold bg-white px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <LancamentosFilterBar onFilterChange={setActiveFilters} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard 
            title="Total Filtrado"
            value={formatCurrency(stats.totalSaidaMes)}
            icon={<Receipt size={24} />}
            color="blue"
            description="Todos os registros listados"
          />
          <StatCard 
            title="Total em Aberto / Atrasado"
            value={formatCurrency(stats.totalAberto)}
            icon={<Clock size={24} />}
            color="amber"
            description="Aguardando liquidação"
          />
          <StatCard 
            title="Total Pago"
            value={formatCurrency(stats.totalPago)}
            icon={<CheckCircle2 size={24} />}
            color="emerald"
            description="Confirmado em caixa"
          />
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
            <div className="flex justify-between items-end px-2">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                Resultados (Página {currentPage} de {totalPages})
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span>Itens por página:</span>
                  <select 
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                <span className="px-3 py-1 bg-slate-200/50 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                  {filteredLancamentos.length} registros totais
                </span>
              </div>
            </div>
            
            <LancamentosTable 
              lancamentos={paginatedLancamentos} 
              allocations={allocations}
              dimDRE={dimDRE}
              dimProjetos={dimProjetos}
              dimCategorias={dimCategorias}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <div className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">
                  {currentPage} / {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 pb-8">
          <p className="text-xs text-slate-400">
            © 2026 Mar Brasil - Dashboard Financeiro Integrado
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full text-slate-500">
            Versão {APP_VERSION}
          </span>
        </footer>
      </div>
    </main>
  );
}
