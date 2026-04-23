import React, { useState } from 'react';
import { DreCalculatedResult } from '@/types/dre';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
        className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-transform ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Total Custos Operacionais")}
      >
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Custos Operacionais</h3>
        <p className="text-2xl font-black text-rose-600">
          {displayValue(kpis.totalCustos)}
        </p>
      </div>

      {/* Despesas Rateadas */}
      <div 
        className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-transform ${onCardClick ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => onCardClick && onCardClick("Total Despesas Rateadas")}
      >
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Despesas Rateadas</h3>
        <p className="text-2xl font-black text-rose-600">
          {displayValue(kpis.totalDespesas)}
        </p>
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
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showExtra ? 'opacity-100 max-h-[500px] mt-4' : 'opacity-0 max-h-0 mt-0'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Outras Entradas */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Outras Entradas")}
          >
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Outras Entradas</h3>
            <p className="text-xl font-bold text-slate-700">
              {displayValue(kpis.outrasEntradas)}
            </p>
          </div>

          {/* Impostos */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Total de Impostos")}
          >
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Impostos</h3>
            <p className="text-xl font-bold text-slate-700">
              {displayValue(kpis.totalImpostos)}
            </p>
          </div>

          {/* Investimentos */}
          <div 
            className={`bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-4 transition-transform ${onCardClick ? 'cursor-pointer hover:bg-slate-100 hover:scale-[1.02]' : ''}`}
            onClick={() => onCardClick && onCardClick("Total Investimentos")}
          >
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Investimentos</h3>
            <p className="text-xl font-bold text-slate-700">
              {displayValue(kpis.totalInvestimentos)}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
