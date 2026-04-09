"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ComissoesService, formatCurrency } from "@/services/comissoes.service";
import { Membro, ContratoBase, Recebimento, ComissoesFilters } from "@/types/comissoes";
import { KpiCards } from "@/components/comissoes/KpiCards";
import { HistoricoTable } from "@/components/comissoes/HistoricoTable";
import { LancamentoModal } from "@/components/comissoes/LancamentoModal";
import { EquipeModal } from "@/components/comissoes/EquipeModal";
import { ContratoModal } from "@/components/comissoes/ContratoModal";
import { APP_VERSION } from "@/version";
import {
  BadgeDollarSign,
  Plus,
  Users,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";

export default function ComissoesPage() {
  // ── State ────────────────────────────────────────────────────────────────────
  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [contratos, setContratos] = useState<ContratoBase[]>([]);
  const [historico, setHistorico] = useState<Recebimento[]>([]);
  const [filteredHistorico, setFilteredHistorico] = useState<Recebimento[]>([]);

  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLancamentoOpen, setIsLancamentoOpen] = useState(false);
  const [isEquipeOpen, setIsEquipeOpen] = useState(false);
  const [isContratoOpen, setIsContratoOpen] = useState(false);
  const [editData, setEditData] = useState<Recebimento | null>(null);

  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ComissoesFilters>({});
  const [filterForm, setFilterForm] = useState<ComissoesFilters>({});

  // ── Derivados ────────────────────────────────────────────────────────────────
  const equipeMap = new Map(equipe.map(m => [m.id, m.nome]));
  const totalGeral = filteredHistorico.reduce(
    (sum, rec) => sum + rec.comissoes.reduce((s, c) => s + c.valor_calculado, 0),
    0
  );

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchInit = useCallback(async () => {
    setIsLoadingInit(true);
    try {
      const [eq, ct] = await Promise.all([
        ComissoesService.getEquipe(),
        ComissoesService.getContratos(),
      ]);
      setEquipe(eq);
      setContratos(ct);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingInit(false);
    }
  }, []);

  const fetchHistorico = useCallback(async (currentFilters: ComissoesFilters = {}) => {
    setIsLoadingHistorico(true);
    try {
      const eq = await ComissoesService.getEquipe();
      const map = new Map(eq.map(m => [m.id, m.nome]));
      const data = await ComissoesService.getHistorico(map, currentFilters);
      setHistorico(data);
      setFilteredHistorico(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingHistorico(false);
    }
  }, []);

  useEffect(() => {
    fetchInit();
    fetchHistorico();
  }, [fetchInit, fetchHistorico]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveLancamento = async (payload: Parameters<typeof ComissoesService.saveRecebimento>[0]) => {
    await ComissoesService.saveRecebimento(payload);
    await fetchHistorico(filters);
  };

  const handleEdit = (rec: Recebimento) => {
    setEditData(rec);
    setIsLancamentoOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este lançamento? Essa ação não pode ser desfeita.")) return;
    try {
      await ComissoesService.deleteRecebimento(id);
      await fetchHistorico(filters);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleMembro = async (id: string, ativo: boolean) => {
    const updated = await ComissoesService.toggleMembro(id, ativo);
    setEquipe(prev => prev.map(m => m.id === id ? updated : m));
  };

  const handleAddMembro = async (nome: string, pct: number) => {
    const novo = await ComissoesService.addMembro({ nome, pct_padrao: pct });
    setEquipe(prev => [...prev, novo]);
  };

  const handleAddContrato = async (payload: { nome_contrato: string; numero_contrato?: string; observacoes?: string }) => {
    const novo = await ComissoesService.addContrato(payload);
    setContratos(prev => [...prev, novo]);
  };

  const handleApplyFilters = () => {
    setFilters(filterForm);
    fetchHistorico(filterForm);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const empty: ComissoesFilters = {};
    setFilterForm(empty);
    setFilters(empty);
    fetchHistorico(empty);
    setShowFilters(false);
  };

  const hasActiveFilters = Object.values(filters).some(v => v && v !== "");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Header */}
        <header className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all shadow-sm"
              title="Voltar ao Portal"
            >
              <ChevronLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <BadgeDollarSign className="text-amber-600" size={20} />
                </div>
                <h1 className="text-2xl font-black text-slate-900">Gestão de Comissões</h1>
              </div>
              <p className="text-sm text-slate-500">
                Supabase · Dinâmico ·{" "}
                <span className="font-semibold text-amber-600">{formatCurrency(totalGeral)}</span>
                {" "}no período
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Versão */}
            <span className="hidden lg:flex text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-full text-slate-500">
              {APP_VERSION}
            </span>

            {/* Filtros */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${
                hasActiveFilters
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {Object.values(filters).filter(v => v && v !== "").length}
                </span>
              )}
            </button>

            {/* Gerenciar Equipe */}
            <button
              onClick={() => setIsEquipeOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-700 transition-all shadow-sm"
            >
              <Users size={16} />
              <span className="hidden sm:inline">Equipe</span>
            </button>

            {/* Novo Recebimento */}
            <button
              onClick={() => { setEditData(null); setIsLancamentoOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all shadow-md"
            >
              <Plus size={16} />
              Novo Recebimento
            </button>
          </div>
        </header>

        {/* Painel de Filtros */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Data Início</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={filterForm.dataInicio || ""}
                  onChange={e => setFilterForm(p => ({ ...p, dataInicio: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Data Fim</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={filterForm.dataFim || ""}
                  onChange={e => setFilterForm(p => ({ ...p, dataFim: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ciclo</label>
                <input type="month" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={filterForm.ciclo || ""}
                  onChange={e => setFilterForm(p => ({ ...p, ciclo: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contrato</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={filterForm.contratoId || ""}
                  onChange={e => setFilterForm(p => ({ ...p, contratoId: e.target.value }))}>
                  <option value="">Todos</option>
                  {contratos.map(c => <option key={c.id} value={c.id}>{c.nome_contrato}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Comissionado</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={filterForm.membroId || ""}
                  onChange={e => setFilterForm(p => ({ ...p, membroId: e.target.value }))}>
                  <option value="">Todos</option>
                  {equipe.filter(m => m.ativo).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={handleClearFilters} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition-colors">
                <X size={14} /> Limpar
              </button>
              <button onClick={handleApplyFilters} className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors">
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{error}</span>
            <button onClick={() => { setError(null); fetchInit(); fetchHistorico(filters); }}
              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 underline">
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        )}

        {/* KPI Cards */}
        {!isLoadingInit && (
          <KpiCards equipe={equipe} historico={filteredHistorico} />
        )}

        {/* Tabela */}
        <HistoricoTable
          equipe={equipe}
          historico={filteredHistorico}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoadingHistorico}
        />

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-400">© 2026 Mar Brasil — Gestão de Comissões</p>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full text-slate-500">
            {APP_VERSION}
          </span>
        </footer>
      </div>

      {/* Modais */}
      <LancamentoModal
        isOpen={isLancamentoOpen}
        onClose={() => { setIsLancamentoOpen(false); setEditData(null); }}
        onSave={handleSaveLancamento}
        onNovoContrato={() => { setIsLancamentoOpen(false); setIsContratoOpen(true); }}
        equipe={equipe}
        contratos={contratos}
        editData={editData}
      />

      <EquipeModal
        isOpen={isEquipeOpen}
        onClose={() => setIsEquipeOpen(false)}
        equipe={equipe}
        onToggle={handleToggleMembro}
        onAddMembro={handleAddMembro}
      />

      <ContratoModal
        isOpen={isContratoOpen}
        onClose={() => { setIsContratoOpen(false); setIsLancamentoOpen(true); }}
        onSave={handleAddContrato}
      />
    </main>
  );
}
