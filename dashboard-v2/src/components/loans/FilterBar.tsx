"use client";

import { Search, Filter, Check, Calendar, Building2, User, FileCheck, Link2 } from "lucide-react";
import { useState } from "react";

export function FilterBar() {
  const [includeExCollabs, setIncludeExCollabs] = useState(false);
  const [includeLiquidated, setIncludeLiquidated] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col xl:flex-row gap-4 items-end">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1 w-full">
          {/* Competência */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Competência
            </label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
              <option>Mar/26</option>
              <option>Fev/26</option>
              <option>Jan/26</option>
            </select>
          </div>

          {/* Empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              Empresa
            </label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
              <option value="">Todas</option>
              <option value="MarBR">MarBR</option>
              <option value="DZM">DZM</option>
            </select>
          </div>

          {/* Colaborador */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              Colaborador
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Totalzin procurar..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>

          {/* Status do contrato */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <FileCheck size={14} className="text-slate-400" />
              Status do contrato
            </label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
              <option>Todos</option>
              <option>Ativo</option>
              <option>Liquidado</option>
              <option>Próximo a encerrar</option>
            </select>
          </div>

          {/* Vínculo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Link2 size={14} className="text-slate-400" />
              Vínculo
            </label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none">
              <option>Todos</option>
              <option>CLT</option>
              <option>PJ</option>
              <option>Estagiário</option>
            </select>
          </div>
        </div>

        {/* Checkboxes e Botão */}
        <div className="flex flex-col xl:flex-row items-end xl:items-center gap-4">
          <div className="flex flex-col gap-2 pb-1 xl:pb-0">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div 
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeExCollabs ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-50 border-slate-300 group-hover:border-emerald-500'}`}
                onClick={() => setIncludeExCollabs(!includeExCollabs)}
              >
                {includeExCollabs && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-600 select-none">Incluir ex-colaboradores</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div 
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeLiquidated ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-50 border-slate-300 group-hover:border-emerald-500'}`}
                onClick={() => setIncludeLiquidated(!includeLiquidated)}
              >
                {includeLiquidated && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs font-medium text-slate-600 select-none">Incluir contratos liquidados</span>
            </label>
          </div>

          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 h-[42px] transition-all whitespace-nowrap shadow-sm">
            <Filter size={18} />
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
