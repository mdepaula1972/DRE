import React, { useState, useMemo } from 'react';
import { X, TrendingUp, ListTree, BarChart2, Plus, Minus, ChevronRight, ChevronDown } from 'lucide-react';
import { DreRow } from '@/types/dre';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

interface DreDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mensalData: Record<string, number>;
  sourceRows?: Record<string, DreRow[]>;
  isPrivacyMode: boolean;
}

export function DreDetailsModal({ 
  isOpen, 
  onClose, 
  title, 
  mensalData, 
  sourceRows,
  isPrivacyMode 
}: DreDetailsModalProps) {
  
  const [activeTab, setActiveTab] = useState<'chart' | 'transactions'>('chart');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (month: string, cat: string) => {
    const key = `${month}-${cat}`;
    setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const data = Object.keys(mensalData).map(col => ({
    name: col,
    valor: mensalData[col]
  }));

  const total = data.reduce((acc, curr) => acc + curr.valor, 0);

  const formatValue = (value: number) => {
    if (isPrivacyMode) return 'R$ ****';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const customTooltipFormatter = (value: any) => {
    if (value === undefined) return ['', title];
    return [formatValue(Number(value)), title];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex flex-col border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">{title}</h2>
                <p className="text-sm font-medium text-slate-500">
                  Evolução Detalhada • Total: <span className="font-bold text-slate-700">{formatValue(total)}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 flex gap-6">
            <button
              onClick={() => setActiveTab('chart')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'chart' 
                  ? 'border-amber-500 text-amber-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart2 size={16} /> Visão Analítica
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'transactions' 
                  ? 'border-amber-500 text-amber-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <ListTree size={16} /> Transações de Origem
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === 'chart' && (
            <>
          {/* Gráfico */}
          <div className="h-64 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F2911B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F2911B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12}}
                  tickFormatter={(value) => isPrivacyMode ? '****' : `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={customTooltipFormatter}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="valor" stroke="#F2911B" strokeWidth={3} fillOpacity={1} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela Resumo */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-200">Período</th>
                  <th className="px-6 py-3 border-b border-slate-200 text-right">Valor Consolidado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{item.name}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-600">{formatValue(item.valor_alocado || item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}

          {activeTab === 'transactions' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700 text-sm">Consolidado de Origem</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-slate-100/50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 sticky left-0 min-w-[280px] max-w-[280px] bg-slate-50 z-20 border-r">Categoria / Projeto</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right bg-slate-50 border-r sticky left-[280px] min-w-[120px] max-w-[120px] z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Total</th>
                      {data.map(item => (
                        <th key={item.name} className="px-4 py-3 border-b border-slate-200 text-right">{item.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const grouped: Record<string, {
                        totalGlobal: number;
                        totaisMensais: Record<string, number>;
                        projetos: Record<string, {
                          projeto: string;
                          empresa: string;
                          totalProjGlobal: number;
                          mensalProj: Record<string, number>;
                        }>
                      }> = {};

                      let hasRows = false;

                      data.forEach(item => {
                        const monthName = item.name;
                        const monthRows = sourceRows ? sourceRows[monthName] || [] : [];
                        
                        monthRows.forEach(r => {
                          hasRows = true;
                          const cat = r.Categoria || 'Sem Categoria';
                          const proj = r.Projeto || '-';
                          const emp = r.Empresa || '-';
                          const val = parseFloat(r[monthName]?.toString().replace(',', '.') || '0');
                          
                          if (!grouped[cat]) {
                            grouped[cat] = { totalGlobal: 0, totaisMensais: {}, projetos: {} };
                          }
                          
                          grouped[cat].totalGlobal += val;
                          grouped[cat].totaisMensais[monthName] = (grouped[cat].totaisMensais[monthName] || 0) + val;
                          
                          const projKey = `${proj}|${emp}`;
                          if (!grouped[cat].projetos[projKey]) {
                            grouped[cat].projetos[projKey] = { projeto: proj, empresa: emp, totalProjGlobal: 0, mensalProj: {} };
                          }
                          grouped[cat].projetos[projKey].totalProjGlobal += val;
                          grouped[cat].projetos[projKey].mensalProj[monthName] = (grouped[cat].projetos[projKey].mensalProj[monthName] || 0) + val;
                        });
                      });

                      if (!hasRows) {
                        return (
                          <tr>
                            <td colSpan={data.length + 2} className="text-center py-10 text-slate-400">
                              <ListTree size={32} className="mx-auto mb-3 opacity-50" />
                              <p>Nenhuma transação individual vinculada a esta linha.</p>
                            </td>
                          </tr>
                        );
                      }

                      return Object.entries(grouped).map(([cat, catData]) => {
                        const isExpanded = expandedCats[`global-${cat}`];
                        return (
                          <React.Fragment key={cat}>
                            {/* Linha Categoria */}
                            <tr 
                              className="hover:bg-slate-50 cursor-pointer transition-colors group"
                              onClick={() => toggleCat('global', cat)}
                            >
                              <td className="px-4 py-3 flex items-center gap-2 text-amber-700 font-bold text-[13px] sticky left-0 min-w-[280px] max-w-[280px] whitespace-normal bg-white z-10 border-r border-slate-100 group-hover:bg-slate-50">
                                <div className="min-w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200 transition-colors">
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <span className="flex-1 leading-tight">{cat}</span>
                                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1 whitespace-nowrap shrink-0">
                                  {Object.keys(catData.projetos).length} {Object.keys(catData.projetos).length === 1 ? 'reg' : 'regs'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 bg-slate-50 border-r border-slate-200 sticky left-[280px] min-w-[120px] max-w-[120px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                {formatValue(catData.totalGlobal)}
                              </td>
                              {data.map(item => (
                                <td key={item.name} className="px-4 py-3 text-right font-mono text-slate-600">
                                  {formatValue(catData.totaisMensais[item.name] || 0)}
                                </td>
                              ))}
                            </tr>

                            {/* Linhas Projetos */}
                            {isExpanded && Object.values(catData.projetos).map((p, pIdx) => (
                              <tr key={`${cat}-${pIdx}`} className="bg-amber-50/20 border-l-2 border-l-amber-300">
                                <td className="px-4 py-2.5 pl-10 flex flex-col gap-0.5 sticky left-0 min-w-[280px] max-w-[280px] whitespace-normal bg-amber-50/95 z-10 border-r border-amber-100/50">
                                  <span className="text-slate-700 font-semibold text-[11px] uppercase tracking-wider leading-tight">{p.projeto}</span>
                                  {p.empresa !== '-' && <span className="text-slate-400 text-[10px] truncate">{p.empresa}</span>}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono text-[12px] text-slate-600 bg-amber-50/95 border-r border-amber-200/50 font-semibold sticky left-[280px] min-w-[120px] max-w-[120px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                  {formatValue(p.totalProjGlobal)}
                                </td>
                                {data.map(item => (
                                  <td key={item.name} className="px-4 py-2.5 text-right font-mono text-[12px] text-slate-600">
                                    {formatValue(p.mensalProj[item.name] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
