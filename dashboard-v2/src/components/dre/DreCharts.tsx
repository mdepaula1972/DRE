import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { DreCalculatedResult } from '@/types/dre';

interface DreChartsProps {
  results: DreCalculatedResult | null;
  isPrivacyMode: boolean;
}

const COLORS = ['#F2911B', '#00477A', '#2ecc71', '#e74c3c', '#9b59b6', '#34495e', '#16a085'];

export function DreCharts({ results, isPrivacyMode }: DreChartsProps) {
  if (!results) return null;

  const { mensal, validColumns, totais } = results;

  // 1. Dados para Receitas vs Despesas
  const receitasVsDespesasData = useMemo(() => {
    return validColumns.map(col => {
      // Entradas: Operacional + Indiretas (simplificação baseada nos totais do serviço)
      const operacional = mensal["Receita Bruta de Vendas"]?.[col] || 0;
      const indiretas = mensal["Receitas Indiretas"]?.[col] || 0;
      
      const impostos = (mensal["Impostos"]?.[col] || 0) + (mensal["Provisão IRPJ e CSSL Trimestral"]?.[col] || 0);
      
      const custos = ["Credenciado Operacional", "Terceirização de Mão de Obra", "CLTs", "Custo dos Serviços Prestados", "Preventiva - B2G", "Corretiva - B2G", "Outros Custos"].reduce((acc, curr) => acc + (mensal[curr]?.[col] || 0), 0);
      
      const despesas = ["Credenciado Administrativo", "Credenciado TI", "Despesas Administrativas", "Despesas de Vendas e Marketing", "Despesas Financeiras", "Outros Tributos", "Despesas Eventuais", "Despesas Variáveis"].reduce((acc, curr) => acc + (mensal[curr]?.[col] || 0), 0);

      const fcl = (operacional + indiretas) - impostos - custos - despesas; // Simplificado

      return {
        name: col,
        Receitas: operacional + indiretas,
        Saídas: impostos + custos + despesas,
        FCL: fcl
      };
    });
  }, [mensal, validColumns]);

  // 2. Dados para Composição de Custos e Despesas
  const composicaoData = useMemo(() => {
    const data = [
      { name: 'CLTs', value: totais['CLTs'] || 0 },
      { name: 'Terceirização', value: totais['Terceirização de Mão de Obra'] || 0 },
      { name: 'Credenciado Oper.', value: totais['Credenciado Operacional'] || 0 },
      { name: 'Credenciado Admin.', value: totais['Credenciado Administrativo'] || 0 },
      { name: 'Desp. Administrativas', value: totais['Despesas Administrativas'] || 0 },
      { name: 'Desp. Vendas/Mkt', value: totais['Despesas de Vendas e Marketing'] || 0 },
      { name: 'Outros', value: totais['Outros Custos'] || 0 }
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5
    
    return data;
  }, [totais]);

  const customTooltipFormatter = (value: any) => {
    if (value === undefined) return ['R$ 0,00', ''];
    if (isPrivacyMode) return ['R$ ****', ''];
    return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)), ''];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Receitas vs Despesas (Evolução Mensal) */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Receitas vs Saídas (Evolução Mensal)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={receitasVsDespesasData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                tickFormatter={(value) => isPrivacyMode ? '****' : `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={customTooltipFormatter}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Receitas" fill="#2ecc71" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Saídas" fill="#e74c3c" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="FCL" stroke="#00477A" strokeWidth={3} dot={{r: 4}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Composição de Custos */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Top 5 Custos e Despesas</h3>
        <div className="h-72 w-full flex items-center justify-center">
          {composicaoData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composicaoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {composicaoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={customTooltipFormatter}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-slate-400 text-sm">Sem dados suficientes</div>
          )}
        </div>
      </div>
    </div>
  );
}
