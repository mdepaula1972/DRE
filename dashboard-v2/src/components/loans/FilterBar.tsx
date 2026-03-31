"use client";

import { Search, Filter, Check, Calendar, Building2, User, FileCheck, Link2, X } from "lucide-react";
import { useState, useEffect } from "react";

export interface FilterValues {
  search: string;
  empresa: string;
  status: string;
  vinculo: string;
  incluirExColaboradores: boolean;
  incluirLiquidados: boolean;
}

interface FilterBarProps {
  onFilterChange: (filters: FilterValues) => void;
}

const DEFAULT_FILTERS: FilterValues = {
  search: "",
  empresa: "",
  status: "",
  vinculo: "",
  incluirExColaboradores: false,
  incluirLiquidados: false,
};

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<FilterValues>(DEFAULT_FILTERS);

  const handleChange = (field: keyof FilterValues, value: string | boolean) => {
    setPendingFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    setFilters(pendingFilters);
    onFilterChange(pendingFilters);
  };

  const handleClear = () => {
    setPendingFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== "incluirExColaboradores" && k !== "incluirLiquidados" ? v !== "" && v !== false : v === true
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col xl:flex-row gap-4 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1 w-full">

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
                value={pendingFilters.search}
                onChange={e => handleChange("search", e.target.value)}
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
              value={pendingFilters.empresa}
              onChange={e => handleChange("empresa", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todas</option>
              <option value="MarBR">MarBR</option>
              <option value="DZM">DZM</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <FileCheck size={14} className="text-slate-400" />
              Status
            </label>
            <select
              value={pendingFilters.status}
              onChange={e => handleChange("status", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Quitado">Quitado</option>
            </select>
          </div>

          {/* Vínculo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Link2 size={14} className="text-slate-400" />
              Vínculo
            </label>
            <select
              value={pendingFilters.vinculo}
              onChange={e => handleChange("vinculo", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Todos</option>
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="Estagiário">Estagiário</option>
            </select>
          </div>

          {/* Placeholder 5th column */}
          <div className="hidden xl:block" />
        </div>

        {/* Checkboxes e Botões */}
        <div className="flex flex-col xl:flex-row items-end xl:items-center gap-4">
          <div className="flex flex-col gap-2 pb-1 xl:pb-0">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pendingFilters.incluirExColaboradores ? "bg-emerald-600 border-emerald-600" : "bg-slate-50 border-slate-300 group-hover:border-emerald-500"}`}
                onClick={() => handleChange("incluirExColaboradores", !pendingFilters.incluirExColaboradores)}
              >
                {pendingFilters.incluirExColaboradores && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-600 select-none">Incluir ex-colaboradores</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${pendingFilters.incluirLiquidados ? "bg-emerald-600 border-emerald-600" : "bg-slate-50 border-slate-300 group-hover:border-emerald-500"}`}
                onClick={() => handleChange("incluirLiquidados", !pendingFilters.incluirLiquidados)}
              >
                {pendingFilters.incluirLiquidados && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-600 select-none">Incluir contratos liquidados</span>
            </label>
          </div>

          <div className="flex gap-2">
            {hasActiveFilters && (
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
    </div>
  );
}
