import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, ArrowRight, RotateCcw, Target, Lightbulb, TrendingUp, TrendingDown, X } from 'lucide-react';
import { DreSimulationParams, DreCalculatedResult } from '@/types/dre';

interface DreSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  params: DreSimulationParams;
  onChange: (params: DreSimulationParams) => void;
  onReset: () => void;
  originalResults: DreCalculatedResult | null;
  simulatedFcl: number;
}

export function DreSimulator({ isOpen, onClose, params, onChange, onReset, originalResults, simulatedFcl }: DreSimulatorProps) {
  const [targetMode, setTargetMode] = useState(false);
  const [targetFcl, setTargetFcl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setTargetMode(false);
      setTargetFcl('');
    }
  }, [isOpen]);

  const originalFcl = originalResults?.kpis.fcl || 0;

  const handleChange = (key: keyof DreSimulationParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  // ---- GOAL SEEK ENGINE ----
  const goalSeek = useMemo(() => {
    if (!targetMode || !targetFcl || isNaN(parseFloat(targetFcl))) return null;
    const meta = parseFloat(targetFcl);
    const delta = meta - originalFcl;
    
    if (delta === 0) return null;

    const baseRevenue = originalResults?.totais['Total Entradas Operacionais'] || 1;
    const baseCosts = originalResults?.totais['Total Custos Operacionais'] || 1;
    const baseExpenses = originalResults?.totais['Total Despesas Rateadas'] || 1;

    // Se delta > 0 (quero mais lucro): 
    // Para atingir com receita: (Receita * X) - Receita = delta -> Receita(X-1) = delta -> X = 1 + (delta / Receita)
    const reqRevenuePcts = (delta / baseRevenue) * 100;
    
    // Para atingir cortando custos: (Custos * X) - Custos = -delta -> Custos(1-X) = delta -> X = 1 - (delta / Custos)
    // Então a % de redução é (delta / Custos) * 100
    const reqCostsReduction = (delta / baseCosts) * 100;
    const reqExpensesReduction = (delta / baseExpenses) * 100;

    return {
      meta,
      delta,
      reqRevenuePcts,
      reqCostsReduction,
      reqExpensesReduction
    };
  }, [targetMode, targetFcl, originalFcl, originalResults]);

  const applyGoalSeek = (type: 'revenue' | 'costs' | 'expenses' | 'equilibrated') => {
    if (!goalSeek) return;
    if (type === 'revenue') {
      onChange({ revenueMultiplier: 1 + (goalSeek.reqRevenuePcts / 100), costsMultiplier: 1, expensesMultiplier: 1 });
    } else if (type === 'costs') {
      onChange({ revenueMultiplier: 1, costsMultiplier: 1 - (goalSeek.reqCostsReduction / 100), expensesMultiplier: 1 });
    } else if (type === 'expenses') {
      onChange({ revenueMultiplier: 1, costsMultiplier: 1, expensesMultiplier: 1 - (goalSeek.reqExpensesReduction / 100) });
    } else if (type === 'equilibrated') {
      // Metade aumento de receita, metade corte de despesas
      onChange({ 
        revenueMultiplier: 1 + ((goalSeek.reqRevenuePcts / 2) / 100), 
        costsMultiplier: 1, 
        expensesMultiplier: 1 - ((goalSeek.reqExpensesReduction / 2) / 100) 
      });
    }
  };

  if (!isOpen) return null;

  const renderSlider = (
    label: string, 
    key: keyof DreSimulationParams, 
    min: number, 
    max: number, 
    step: number,
    colorClass: string
  ) => {
    const value = params[key];
    const pct = Math.round((value - 1) * 100);
    const pctLabel = pct > 0 ? `+${pct}%` : `${pct}%`;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-slate-700">{label}</label>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct === 0 ? 'bg-slate-100 text-slate-500' : colorClass}`}>
            {pctLabel}
          </span>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Fixado */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 text-indigo-800">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <SlidersHorizontal size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Simulador de Cenários</h3>
              <p className="text-xs text-slate-500 font-medium">Modelação Financeira In-Memory</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Controles de Ação Rápidos */}
          <div className="flex gap-3 mb-8">
            <button 
              onClick={() => setTargetMode(!targetMode)}
              className={`flex-1 flex justify-center items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl transition-all shadow-sm border ${
                targetMode 
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Target size={16} /> Busca de Meta (FCL)
            </button>
            <button 
              onClick={() => {
                setTargetFcl('');
                onReset();
              }}
              className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-white px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-200 shadow-sm transition-all"
              title="Resetar todos os sliders"
            >
              <RotateCcw size={16} />
            </button>
          </div>

      {targetMode && (
        <div className="mb-8 p-5 bg-white rounded-2xl border border-amber-200 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Target size={18} className="text-amber-500"/> Definir FCL Alvo
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                Informe o valor de FCL que deseja atingir. O sistema calculará o que precisa ser feito nas receitas ou despesas.
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number"
                    value={targetFcl}
                    onChange={(e) => setTargetFcl(e.target.value)}
                    placeholder="Ex: 150000"
                    className="w-full pl-10 pr-4 py-2 border-2 border-amber-200 focus:border-amber-500 rounded-xl outline-none font-mono font-bold text-slate-700"
                  />
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  FCL Atual: <span className="font-mono font-bold text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalFcl)}</span>
                </div>
              </div>
            </div>

            {goalSeek && (
              <div className="w-full md:w-auto bg-amber-50 p-4 rounded-xl border border-amber-100 min-w-[250px]">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Impacto Necessário (Delta)</p>
                <p className={`text-xl font-black font-mono ${goalSeek.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {goalSeek.delta > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goalSeek.delta)}
                </p>
              </div>
            )}
          </div>

          {/* Painel de Recomendações */}
          {goalSeek && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h5 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-amber-500" /> Sugestões de Ação (Caminhos Isolados)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Caminho 1: Receita */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <TrendingUp size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Via Receita</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Aumentar as vendas para diluir o custo.
                    </p>
                  </div>
                  <button 
                    onClick={() => applyGoalSeek('revenue')}
                    className="w-full py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-sm rounded-lg transition-colors"
                  >
                    Aumentar {goalSeek.reqRevenuePcts > 0 ? '+' : ''}{goalSeek.reqRevenuePcts.toFixed(1)}%
                  </button>
                </div>

                {/* Caminho 2: Despesas */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <TrendingDown size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Via Despesas</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Cortar gastos administrativos e rateios.
                    </p>
                  </div>
                  <button 
                    onClick={() => applyGoalSeek('expenses')}
                    disabled={goalSeek.reqExpensesReduction > 100}
                    className="w-full py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {goalSeek.reqExpensesReduction > 100 ? 'Inviável (>100%)' : `Reduzir ${goalSeek.reqExpensesReduction.toFixed(1)}%`}
                  </button>
                </div>

                {/* Caminho 3: Custos */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <TrendingDown size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Via Custos</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      Reduzir o custo operacional da operação.
                    </p>
                  </div>
                  <button 
                    onClick={() => applyGoalSeek('costs')}
                    disabled={goalSeek.reqCostsReduction > 100}
                    className="w-full py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {goalSeek.reqCostsReduction > 100 ? 'Inviável (>100%)' : `Reduzir ${goalSeek.reqCostsReduction.toFixed(1)}%`}
                  </button>
                </div>

                {/* Caminho 4: Equilibrado */}
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <Target size={16} /> <span className="font-bold text-xs uppercase tracking-wider">Caminho Equilibrado</span>
                    </div>
                    <p className="text-sm text-indigo-900/70 mb-4 leading-tight">
                      Metade em aumento de Vendas, metade em corte de Despesas.
                    </p>
                  </div>
                  <button 
                    onClick={() => applyGoalSeek('equilibrated')}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors"
                  >
                    Aplicar Cenário
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-8 relative">
        {/* Overlay para bloquear os sliders se a Busca de Meta estiver ativa */}
        {targetMode && (
          <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-10 rounded-xl"></div>
        )}
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          {renderSlider('Receitas Operacionais', 'revenueMultiplier', 0.5, 1.5, 0.01, 'bg-emerald-100 text-emerald-700')}
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          {renderSlider('Custos Operacionais', 'costsMultiplier', 0.5, 1.5, 0.01, 'bg-rose-100 text-rose-700')}
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          {renderSlider('Despesas Administrativas', 'expensesMultiplier', 0.5, 1.5, 0.01, 'bg-rose-100 text-rose-700')}
        </div>
      </div>

        </div> {/* End of Scrollable content */}

        {/* Rodapé Fixado: Impacto */}
        <div className="p-6 bg-white border-t border-slate-200 flex-shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-indigo-500 bg-indigo-50 p-1.5 rounded-lg">
                <ArrowRight size={16} />
              </div>
              <div>
                <p className="text-sm text-indigo-900 font-bold">Impacto Projetado no FCL</p>
                <p className="text-[11px] text-slate-500">Essa simulação reflete instantaneamente nos gráficos sem alterar a base de dados oficial.</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cenário Original</p>
                <p className="text-sm font-mono text-slate-500 line-through">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalFcl)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Resultado Simulado</p>
                <p className={`text-xl font-black font-mono ${simulatedFcl >= originalFcl ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulatedFcl)}
                </p>
              </div>
            </div>

            {originalFcl !== simulatedFcl && (
              <div className={`w-full text-center px-4 py-2 rounded-xl text-sm font-bold border ${
                simulatedFcl > originalFcl ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                Delta: {simulatedFcl > originalFcl ? '+' : ''}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulatedFcl - originalFcl)}
              </div>
            )}
          </div>
        </div>

    </div>
  );
}
