"use client";

import { useState } from "react";
import { Filter, X, Search, Loader2 } from "lucide-react";
import { LancamentoFilterValues } from "@/types/lancamentos";

interface Props {
  onFilterChange: (filters: LancamentoFilterValues) => void;
  onSyncMonth?: (monthYear: string) => void;
  onImport?: (filters: LancamentoFilterValues) => void;
  onClear?: () => void;
  isProcessing?: boolean;
  progress?: number;
  availableCategories: string[];
  availableProjects: string[];
  availableDepartments: string[];
}

export function LancamentosFilterBar({ 
  onFilterChange, 
  onSyncMonth, 
  onImport, 
  onClear, 
  isProcessing, 
  progress = 0,
  availableCategories, 
  availableProjects, 
  availableDepartments 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<LancamentoFilterValues>({
    dateBase: 'registro',
  });

  const handleChange = (key: keyof LancamentoFilterValues, value: any) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
  };

  const handleApply = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const defaultFilters: LancamentoFilterValues = { dateBase: 'registro' };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="relative mb-6 z-20">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            className="w-full bg-slate-50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
            placeholder="Buscar por fornecedor / beneficiário..."
            value={filters.search || ""}
            onChange={(e) => {
              handleChange("search", e.target.value);
              // Auto apply text search for smoother experience
              onFilterChange({ ...filters, search: e.target.value });
            }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          {isProcessing && (
            <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] font-bold text-emerald-600 animate-pulse">Sincronizando... {progress}%</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {onClear && (
            <button
              onClick={() => {
                if(confirm("Tem certeza que deseja limpar TODOS os dados importados do Omie?")) onClear();
              }}
              disabled={isProcessing}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Limpar todos os dados"
            >
              <X size={20} />
            </button>
          )}

          {onImport && (
            <button
              onClick={() => onImport(filters)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <Loader2 size={16} className={isProcessing ? "animate-spin" : "hidden"} />
              <span>Importar Seleção</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isOpen ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter size={16} />
            <span>Filtros</span>
            {Object.keys(filters).length > 2 && !isOpen && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 p-5 origin-top animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Empresa */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Empresa</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.empresa || ""}
                onChange={(e) => handleChange("empresa", e.target.value)}
              >
                <option value="">Todas as Empresas</option>
                <option value="Mar Brasil">Mar Brasil</option>
                <option value="DZM">DZM</option>
              </select>
            </div>

            {/* Base de Data */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Base de Data</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.dateBase || "registro"}
                onChange={(e) => handleChange("dateBase", e.target.value as any)}
              >
                <option value="registro">Competência (Registro)</option>
                <option value="vencimento">Data de Vencimento</option>
                <option value="pagamento">Data de Pagamento</option>
              </select>
            </div>

            {/* Mês / Ano */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mês/Ano</label>
              <input
                type="month"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.month || ""}
                onChange={(e) => handleChange("month", e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.status || ""}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="PAGO">Pago</option>
                <option value="ABERTO">Em Aberto</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.categoria || ""}
                onChange={(e) => handleChange("categoria", e.target.value)}
              >
                <option value="">Todas as Categorias</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Projeto */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Projeto</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.projeto || ""}
                onChange={(e) => handleChange("projeto", e.target.value)}
              >
                <option value="">Todos os Projetos</option>
                {availableProjects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Departamento</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.departamento || ""}
                onChange={(e) => handleChange("departamento", e.target.value)}
              >
                <option value="">Todos os Departamentos</option>
                {availableDepartments.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            {/* Origem */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Origem</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                value={filters.source || ""}
                onChange={(e) => handleChange("source", e.target.value)}
              >
                <option value="">Todas Origens</option>
                <option value="CP">Contas a Pagar</option>
                <option value="MOV">Movimentos Saída</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={16} /> Limpar
            </button>
            {filters.month && onSyncMonth && (
              <button
                onClick={() => onSyncMonth(filters.month!)}
                className="mr-auto px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                Sincronizar {filters.month} na Omie
              </button>
            )}
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              Aplicar Filtros Detalhados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
