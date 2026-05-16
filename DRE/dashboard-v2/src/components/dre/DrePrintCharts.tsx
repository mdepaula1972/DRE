import React from 'react';
import { DreCalculatedResult } from '@/types/dre';
import { ExportSelections } from './DreExportModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';

interface DrePrintChartsProps {
  results: DreCalculatedResult;
  selections: ExportSelections;
}

const PALETTE = {
  receita:  '#10b981', 
  saidas:   '#f43f5e', 
  fcl:      '#3b82f6', 
};

const COLORS_PIE = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#64748b'];

const fmtK = (v: number) => `${(v / 1000).toFixed(0)}k`;

export function DrePrintCharts({ results, selections }: DrePrintChartsProps) {
  const { mensal, validColumns, totais, kpis } = results;

  // 1. Evolução
  const evolucaoData = validColumns.map(col => ({
    name: col,
    Receitas: mensal['Total Entradas Operacionais']?.[col] || 0,
    Saídas: mensal['Total Saídas']?.[col] || 0,
    FCL: mensal['Fluxo de Caixa Livre FCL']?.[col] || 0,
  }));

  // 2. Waterfall
  const e = kpis.totalEntradas;
  const oe = kpis.outrasEntradas;
  const i  = -kpis.totalImpostos;
  const c  = -kpis.totalCustos;
  const d  = -kpis.totalDespesas;
  const inv = -kpis.totalInvestimentos;

  const waterfallSteps = [
    { name: 'Entradas Op.',    value: e,   cumulative: 0 },
    { name: 'Outras Ent.',     value: oe,  cumulative: e },
    { name: 'Impostos',        value: i,   cumulative: e + oe },
    { name: 'Custos',          value: c,   cumulative: e + oe + i },
    { name: 'Despesas',        value: d,   cumulative: e + oe + i + c },
    { name: 'Investimentos',   value: inv, cumulative: e + oe + i + c + d },
    { name: 'FCL',             value: kpis.fcl, cumulative: 0, isFinal: true },
  ];

  const waterfallData = waterfallSteps.map(s => ({
    name: s.name,
    base: (s as any).isFinal ? Math.min(0, s.value) : (s.value >= 0 ? s.cumulative : s.cumulative + s.value),
    bar: Math.abs(s.value),
    positive: s.value >= 0,
    isFinal: !!(s as any).isFinal,
    rawValue: s.value,
  }));

  // 3. Composição
  const composicaoData = [
    { name: 'Credenciados', value: (totais['Credenciado Operacional'] || 0) + (totais['Credenciado Administrativo'] || 0) + (totais['Credenciado TI'] || 0) },
    { name: 'Pessoal (CLTs)', value: totais['CLTs'] || 0 },
    { name: 'Terceirização', value: totais['Terceirização de Mão de Obra'] || 0 },
    { name: 'Desp. Admin.', value: totais['Despesas Administrativas'] || 0 },
    { name: 'Desp. Variáveis', value: totais['Despesas Variáveis'] || 0 },
  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

  // We need to render them with fixed width/height because ResponsiveContainer behaves weirdly off-screen
  return (
    <div id="dre-print-charts-container" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '900px', backgroundColor: '#ffffff', padding: '20px' }}>
      
      {selections.includeEvolution && (
        <div id="print-chart-evolution" style={{ width: '900px', height: '400px', marginBottom: '40px', backgroundColor: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Evolução Mensal</h3>
          <ComposedChart width={860} height={320} data={evolucaoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => fmtK(v)} />
            <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
            <Bar dataKey="Receitas" fill={PALETTE.receita} radius={[5, 5, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Saídas"   fill={PALETTE.saidas}  radius={[5, 5, 0, 0]} maxBarSize={36} />
            <Line type="monotone" dataKey="FCL" stroke={PALETTE.fcl} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE.fcl }} />
          </ComposedChart>
        </div>
      )}

      {selections.includeWaterfall && (
        <div id="print-chart-waterfall" style={{ width: '900px', height: '400px', marginBottom: '40px', backgroundColor: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Waterfall de Formação do FCL</h3>
          <BarChart width={860} height={320} data={waterfallData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => fmtK(v)} />
            <Bar dataKey="base" stackId="wf" fill="transparent" />
            <Bar dataKey="bar" stackId="wf" radius={[5, 5, 0, 0]} maxBarSize={50}>
              {waterfallData.map((entry, index) => (
                <Cell key={`wf-${index}`} fill={entry.isFinal ? (entry.rawValue >= 0 ? PALETTE.fcl : PALETTE.saidas) : (entry.positive ? PALETTE.receita : PALETTE.saidas)} />
              ))}
            </Bar>
          </BarChart>
        </div>
      )}

      {selections.includeDonut && (
        <div id="print-chart-donut" style={{ width: '900px', height: '400px', marginBottom: '40px', backgroundColor: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Composição de Custos e Despesas</h3>
          <PieChart width={860} height={320}>
            <Pie data={composicaoData} cx={430} cy={160} innerRadius={80} outerRadius={130} paddingAngle={3} dataKey="value" label>
              {composicaoData.map((_, index) => (
                <Cell key={`c-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} strokeWidth={0} />
              ))}
            </Pie>
            <Legend verticalAlign="bottom" />
          </PieChart>
        </div>
      )}

    </div>
  );
}
