"use client";

import { Search, Filter, Check, Building2, User, Link2, X, Briefcase, BadgeDollarSign, FileText } from "lucide-react";
import { useState } from "react";

export interface FilterValues {
  search: string;
  empresa: string;
  vinculo: string;
  status: string;           // Ativo, Inativo
  cargo: string;            // Função/Cargo
  remuneracaoRange: string; // ate2k, 2k-3.5k, 3.5k-5k, acima5k
  temAditivo: string;       // sim, nao
  incluirQuitados: boolean;
  mostrarTodos: boolean;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterValues) => void;
}

const DEFAULT_FILTERS: FilterValues = {
  search: "",
  empresa: "",
  vinculo: "",
  status: "",
  cargo: "",
  remuneracaoRange: "",
  temAditivo: "",
  incluirQuitados: false,
  mostrarTodos: false,
};

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [pending, setPending] = useState<FilterValues>(DEFAULT_FILTERS);
  const [active, setActive] = useState<FilterValues>(DEFAULT_FILTERS);

  const set = (field: keyof FilterValues, value: string | boolean) =>
    setPending(prev => ({ ...prev, [field]: value }));

  const handleApply = () => {
    setActive(pending);
    onFilterChange(pending);
  };

  const handleClear = () => {
    setPending(DEFAULT_FILTERS);
    setActive(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const hasActive =
    active.search !== "" || 
    active.empresa !== "" || 
    active.vinculo !== "" || 
    active.status !== "" || 
    active.cargo !== "" || 
    active.remuneracaoRange !== "" || 
    active.temAditivo !== "" || 
    active.incluirQuitados || 
    active.mostrarTodos;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        {/* Primeira Linha: Busca e Selects Básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {/* Busca por nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} />
              Colaborador
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={pending.search}
                onChange={e => set("search", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApply()}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>

          {/* Cargo/Função */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={12} />
              Função / Cargo
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: Analista, Gerente..."
                value={pending.cargo}
                onChange={e => set("cargo", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApply()}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
              <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>

          {/* Empresa */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={12} />
              Empresa
            </label>
            <select
              value={pending.empresa}
              onChange={e => set("empresa", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none appearance-none"
            >
              <option value="">Todas as Empresas</option>
              <option value="MarBR">MarBR</option>
              <option value="DZM">DZM</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Status Atual
            </label>
            <select
              value={pending.status}
              onChange={e => set("status", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todos os Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>

        {/* Segunda Linha: Filtros Especializados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full border-t border-slate-100 pt-4">
          
          {/* Remuneração */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BadgeDollarSign size={12} />
              Faixa Salarial
            </label>
            <select
              value={pending.remuneracaoRange}
              onChange={e => set("remuneracaoRange", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Qualquer valor</option>
              <option value="ate2k">Menos de R$ 2.000</option>
              <option value="2k-3.5k">R$ 2.000 - R$ 3.500</option>
              <option value="3.5k-5k">R$ 3.500 - R$ 5.000</option>
              <option value="acima5k">Acima de R$ 5.000</option>
            </select>
          </div>

          {/* Vínculo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Link2 size={12} />
              Tipo de Vínculo
            </label>
            <select
              value={pending.vinculo}
              onChange={e => set("vinculo", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todos os Vínculos</option>
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="Estagiário">Estagiário</option>
            </select>
          </div>

          {/* Possui Aditivo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={12} />
              Histórico / Aditivos
            </label>
            <select
              value={pending.temAditivo}
              onChange={e => set("temAditivo", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Indiferente</option>
              <option value="sim">Possui Aditivos</option>
              <option value="nao">Sem Aditivos</option>
            </select>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 pt-5">
            {hasActive && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap"
              >
                <X size={15} />
                Limpar
              </button>
            )}
            <button
              onClick={handleApply}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Filter size={18} />
              Refinar Busca
            </button>
          </div>
        </div>

        {/* Checkboxes de Configuração */}
        <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pending.incluirQuitados ? "bg-emerald-600 border-emerald-600" : "bg-slate-50 border-slate-300 group-hover:border-emerald-500"}`}
                onClick={() => set("incluirQuitados", !pending.incluirQuitados)}
              >
                {pending.incluirQuitados && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-semibold text-slate-600 select-none">Incluir Quitados</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pending.mostrarTodos ? "bg-blue-600 border-blue-600" : "bg-slate-50 border-slate-300 group-hover:border-blue-500"}`}
                onClick={() => set("mostrarTodos", !pending.mostrarTodos)}
              >
                {pending.mostrarTodos && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-semibold text-slate-600 select-none">Mostrar Todos (Sem Empréstimo)</span>
            </label>
        </div>
      </div>

      {/* Tags de filtros ativos */}
      {hasActive && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
          {active.search && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full border border-slate-200 uppercase">
              PESQUISA: {active.search}
            </span>
          )}
          {active.cargo && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200 uppercase">
              CARGO: {active.cargo}
            </span>
          )}
          {active.status && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase">
              STATUS: {active.status}
            </span>
          )}
          {active.remuneracaoRange && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 uppercase">
              SALÁRIO: {active.remuneracaoRange}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
