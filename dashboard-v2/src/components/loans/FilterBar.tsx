"use client";

import { Search, Filter, Check, Building2, User, Link2, X } from "lucide-react";
import { useState } from "react";

export interface FilterValues {
  search: string;
  empresa: string;
  vinculo: string;
  incluirQuitados: boolean;   // Funcionários SEM nenhuma dívida ativa
}

interface FilterBarProps {
  onFilterChange: (filters: FilterValues) => void;
}

const DEFAULT_FILTERS: FilterValues = {
  search: "",
  empresa: "",
  vinculo: "",
  incluirQuitados: false,
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
    active.search !== "" || active.empresa !== "" || active.vinculo !== "" || active.incluirQuitados;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col xl:flex-row gap-4 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 w-full">

          {/* Busca por nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
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

          {/* Empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              Empresa
            </label>
            <select
              value={pending.empresa}
              onChange={e => set("empresa", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todas</option>
              <option value="MarBR">MarBR</option>
              <option value="DZM">DZM</option>
            </select>
          </div>

          {/* Vínculo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Link2 size={14} className="text-slate-400" />
              Vínculo
            </label>
            <select
              value={pending.vinculo}
              onChange={e => set("vinculo", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todos</option>
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="Estagiário">Estagiário</option>
            </select>
          </div>

          {/* Placeholder 4th column */}
          <div className="hidden xl:block" />
        </div>

        {/* Checkboxes e Botões */}
        <div className="flex flex-col xl:flex-row items-end xl:items-center gap-4">
          <div className="flex flex-col gap-2 pb-1 xl:pb-0">
            {/* Incluir colaboradores totalmente quitados */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pending.incluirQuitados ? "bg-emerald-600 border-emerald-600" : "bg-slate-50 border-slate-300 group-hover:border-emerald-500"}`}
                onClick={() => set("incluirQuitados", !pending.incluirQuitados)}
              >
                {pending.incluirQuitados && <Check size={12} className="text-white" />}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-600 select-none">Incluir colaboradores quitados</span>
                <p className="text-[10px] text-slate-400 select-none">Sem nenhuma dívida ativa</p>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            {hasActive && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all h-[42px]"
              >
                <X size={15} />
                Limpar
              </button>
            )}
            <button
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 h-[42px] transition-all whitespace-nowrap shadow-sm"
            >
              <Filter size={18} />
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tags de filtros ativos */}
      {hasActive && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
          {active.search && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
              Nome: "{active.search}"
            </span>
          )}
          {active.empresa && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
              Empresa: {active.empresa}
            </span>
          )}
          {active.vinculo && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
              Vínculo: {active.vinculo}
            </span>
          )}
          {active.incluirQuitados && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full border border-slate-200">
              + Colaboradores quitados
            </span>
          )}
        </div>
      )}
    </div>
  );
}
