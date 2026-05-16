import React, { useState } from 'react';
import { DreCalculatedResult } from '@/types/dre';
import { ChevronDown, ChevronUp, Wallet, ArrowDownRight, ArrowUpRight, MonitorSmartphone, Activity } from 'lucide-react';
import { formatCurrency } from '@/services/comissoes.service'; // We can reuse formatCurrency from here or create a utils

interface DreKpiCardsProps {
  results: DreCalculatedResult | null;
  isPrivacyMode: boolean;
  onCardClick?: (title: string) => void;
}

export function DreKpiCards({ results, isPrivacyMode, onCardClick }: DreKpiCardsProps) {
  const [showExtra, setShowExtra] = useState(false);

  if (!results) return null;

  const { kpis } = results;

  const displayValue = (val: number, isPercent = false) => {
    if (isPrivacyMode) return 'R$ ****';
    if (isPercent) return `${val.toFixed(2).replace('.', ',')}%`;
    
    // Simples formatCurrency local para evitar dependência errada se comissoes.service não existir
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const calcPercent = (value: number) => {
    if (kpis.totalEntradas === 0) return '0,00%';
    return `${((value / kpis.totalEntradas) * 100).toFixed(1).replace('.', ',')}%`;
  };

  const fclPorEquipamento = kpis.totalEquipamentos > 0 ? (kpis.fcl / kpis.totalEquipamentos) : 0;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-20">
      {/* Total Entradas */}
      <div 
        className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-transform ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Total Entradas Operacionais")}
      >
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entradas Operacionais</h3>
        <p className="text-2xl font-black text-slate-800">
          {displayValue(kpis.totalEntradas)}
        </p>
      </div>

      {/* Custos Operacionais */}
      <div 
        className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-transform flex flex-col justify-between ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Total Custos Operacionais")}
      >
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custos Operacionais</h3>
          <p className="text-2xl font-black text-rose-600">
            {displayValue(kpis.totalCustos)}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded-md">
          <Wallet size={12} className="text-emerald-500" />
          <span>{calcPercent(kpis.totalCustos)} da Receita</span>
        </div>
      </div>

      {/* Despesas Rateadas */}
      <div 
        className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-transform flex flex-col justify-between ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Total Despesas Rateadas")}
      >
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Despesas Rateadas</h3>
          <p className="text-2xl font-black text-rose-600">
            {displayValue(kpis.totalDespesas)}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded-md">
          <Wallet size={12} className="text-emerald-500" />
          <span>{calcPercent(kpis.totalDespesas)} da Receita</span>
        </div>
      </div>

      {/* Fluxo de Caixa Livre */}
      <div 
        className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md transition-transform ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Fluxo de Caixa Livre FCL")}
      >
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fluxo de Caixa Livre</h3>
        <p className={`text-2xl font-black ${kpis.fcl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {displayValue(kpis.fcl)}
        </p>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Margem: {displayValue(kpis.percFcl, true)}
        </p>
      </div>
      </div>

      {/* Botão de Toggle Moderno */}
      <div className="flex justify-center -mt-3 relative z-30">
        <button 
          onClick={() => setShowExtra(!showExtra)}
          className="bg-white border border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5 hover:text-slate-700"
        >
          {showExtra ? (
            <><ChevronUp size={14} strokeWidth={2.5} /> Ocultar Secundários</>
          ) : (
            <><ChevronDown size={14} strokeWidth={2.5} /> Indicadores Adicionais</>
          )}
        </button>
      </div>

      {/* Grid Secundário */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showExtra ? 'opacity-100 max-h-[600px] mt-4' : 'opacity-0 max-h-0 mt-0'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Outras Entradas */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform flex flex-col justify-between ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Outras Entradas")}
          >
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Outras Entradas</h3>
              <p className="text-xl font-bold text-slate-700">
                {displayValue(kpis.outrasEntradas)}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <ArrowUpRight size={12} className="text-emerald-500" />
              <span>{calcPercent(kpis.outrasEntradas)} vs Operacional</span>
            </div>
          </div>

          {/* Impostos */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform flex flex-col justify-between ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Total de Impostos")}
          >
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Impostos</h3>
              <p className="text-xl font-bold text-slate-700">
                {displayValue(kpis.totalImpostos)}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <ArrowDownRight size={12} className="text-rose-500" />
              <span>{calcPercent(kpis.totalImpostos)} da Receita</span>
            </div>
          </div>

          {/* Investimentos */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform flex flex-col justify-between ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Total Investimentos")}
          >
            <div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Investimentos</h3>
              <p className="text-xl font-bold text-slate-700">
                {displayValue(kpis.totalInvestimentos)}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Wallet size={12} className="text-emerald-500" />
              <span>{calcPercent(kpis.totalInvestimentos)} da Receita</span>
            </div>
          </div>

          {/* Análise de Equipamentos */}
          <div className="bg-indigo-50 border border-indigo-200 border-dashed rounded-2xl p-4 transition-transform flex flex-col justify-between relative overflow-hidden">
            <MonitorSmartphone className="absolute -right-4 -bottom-4 text-indigo-100 opacity-50" size={80} />
            <div className="relative z-10">
              <h3 className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">Análise de Equipamentos</h3>
              <p className="text-xl font-black text-indigo-900">
                {kpis.totalEquipamentos.toLocaleString('pt-BR')} <span className="text-sm font-medium text-indigo-600 tracking-normal">ativos</span>
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-100/50 w-fit px-2 py-1 rounded relative z-10">
              <Activity size={12} className="text-indigo-600" />
              <span>{displayValue(fclPorEquipamento)} de FCL/Máquina</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
