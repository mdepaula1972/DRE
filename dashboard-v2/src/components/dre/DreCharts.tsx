'use client';
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell as RadarCell
} from 'recharts';
import { DreCalculatedResult } from '@/types/dre';
import { BarChart2, PieChart as PieIcon, GitFork, Layers } from 'lucide-react';

interface DreChartsProps {
  results: DreCalculatedResult | null;
  isPrivacyMode: boolean;
}

const PALETTE = {
  receita:  '#10b981', // emerald
  saidas:   '#f43f5e', // rose
  fcl:      '#3b82f6', // blue
  custos:   '#f59e0b', // amber
  despesas: '#8b5cf6', // violet
  impostos: '#06b6d4', // cyan
  investimentos: '#64748b', // slate
};

const COLORS_PIE = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#64748b'];

const fmt = (v: number, privacy: boolean) =>
  privacy ? 'R$ ****' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtK = (v: number, privacy: boolean) =>
  privacy ? '****' : `${(v / 1000).toFixed(0)}k`;

type ChartTab = 'evolucao' | 'waterfall' | 'composicao' | 'radar';

const TABS: { id: ChartTab; label: string; icon: React.ReactNode }[] = [
  { id: 'evolucao',    label: 'Evolução',   icon: <BarChart2 size={14} /> },
  { id: 'waterfall',  label: 'Waterfall',  icon: <GitFork size={14} /> },
  { id: 'composicao', label: 'Composição', icon: <PieIcon size={14} /> },
  { id: 'radar',      label: 'Radar',      icon: <Layers size={14} /> },
];

export function DreCharts({ results, isPrivacyMode }: DreChartsProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>('evolucao');

  if (!results) return null;

  const { mensal, validColumns, totais, kpis } = results;

  // ── 1. Evolução Mensal ────────────────────────────────────────────────────
  const evolucaoData = useMemo(() => validColumns.map(col => {
    const receitas = (mensal['Total Entradas Operacionais']?.[col] || 0);
    const saidas   = (mensal['Total Saídas']?.[col] || 0);
    const fcl      = (mensal['Fluxo de Caixa Livre FCL']?.[col] || 0);
    return { name: col, Receitas: receitas, Saídas: saidas, FCL: fcl };
  }), [mensal, validColumns]);

  // ── 2. Waterfall DRE ─────────────────────────────────────────────────────
  // Each bar is positioned absolutely: start from cumulative sum, extend by value
  const waterfallData = useMemo(() => {
    const e = kpis.totalEntradas;
    const oe = kpis.outrasEntradas;
    const i  = -kpis.totalImpostos;
    const c  = -kpis.totalCustos;
    const d  = -kpis.totalDespesas;
    const inv = -kpis.totalInvestimentos;

    const steps = [
      { name: 'Entradas Op.',    value: e,   cumulative: 0 },
      { name: 'Outras Ent.',     value: oe,  cumulative: e },
      { name: 'Impostos',        value: i,   cumulative: e + oe },
      { name: 'Custos',          value: c,   cumulative: e + oe + i },
      { name: 'Despesas',        value: d,   cumulative: e + oe + i + c },
      { name: 'Investimentos',   value: inv, cumulative: e + oe + i + c + d },
      { name: 'FCL',             value: kpis.fcl, cumulative: 0, isFinal: true },
    ];

    return steps.map(s => ({
      name: s.name,
      // Transparent bar (base - to float the real bar)
      base: (s as any).isFinal ? Math.min(0, s.value) : (s.value >= 0 ? s.cumulative : s.cumulative + s.value),
      // Actual visible bar
      bar: Math.abs(s.value),
      positive: s.value >= 0,
      isFinal: !!(s as any).isFinal,
      rawValue: s.value,
    }));
  }, [kpis]);

  // ── 3. Composição Custos+Despesas (Donut) ────────────────────────────────
  const composicaoData = useMemo(() => [
    { name: 'Credenciados', value: (totais['Credenciado Operacional'] || 0) + (totais['Credenciado Administrativo'] || 0) + (totais['Credenciado TI'] || 0) },
    { name: 'Pessoal (CLTs)', value: totais['CLTs'] || 0 },
    { name: 'Terceirização', value: totais['Terceirização de Mão de Obra'] || 0 },
    { name: 'Desp. Admin.', value: totais['Despesas Administrativas'] || 0 },
    { name: 'Desp. Variáveis', value: totais['Despesas Variáveis'] || 0 },
    { name: 'Preventiva', value: totais['Preventiva - B2G'] || 0 },
    { name: 'Corretiva', value: totais['Corretiva - B2G'] || 0 },
  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6), [totais]);

  // ── 4. Radar de Proporções ───────────────────────────────────────────────
  const radarData = useMemo(() => {
    const total = kpis.totalEntradas || 1;
    return [
      { subject: 'Custos',       value: Math.round((kpis.totalCustos / total) * 100) },
      { subject: 'Despesas',     value: Math.round((kpis.totalDespesas / total) * 100) },
      { subject: 'Impostos',     value: Math.round((kpis.totalImpostos / total) * 100) },
      { subject: 'Investimentos',value: Math.round((kpis.totalInvestimentos / total) * 100) },
      { subject: 'FCL',          value: Math.max(0, Math.round((kpis.fcl / total) * 100)) },
      { subject: 'Outras Ent.',  value: Math.round((kpis.outrasEntradas / total) * 100) },
    ];
  }, [kpis]);

  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: '12px' };

  // ── Custom Waterfall tooltip ──────────────────────────────────────────────
  const WaterfallTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload?.rawValue ?? 0;
    return (
      <div style={tooltipStyle} className="bg-white px-4 py-3">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        <p className={`font-mono font-black text-base ${raw >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmt(raw, isPrivacyMode)}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-100 bg-slate-50/70 px-2 pt-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl mr-1 transition-all ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-slate-200 text-slate-800 shadow-sm -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="p-6">

        {/* ── TAB 1: EVOLUÇÃO MENSAL ── */}
        {activeTab === 'evolucao' && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Receitas, Saídas e FCL mês a mês</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolucaoData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => fmtK(v, isPrivacyMode)} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v), isPrivacyMode), '']} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                  <Bar dataKey="Receitas" fill={PALETTE.receita} radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Saídas"   fill={PALETTE.saidas}  radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Line type="monotone" dataKey="FCL" stroke={PALETTE.fcl} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE.fcl }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── TAB 2: WATERFALL ── */}
        {activeTab === 'waterfall' && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Cascata de construção do FCL — de onde vem e para onde vai cada real</p>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => fmtK(v, isPrivacyMode)} />
                  <Tooltip content={<WaterfallTooltip />} />
                  {/* Base transparente para flutuar */}
                  <Bar dataKey="base" stackId="wf" fill="transparent" />
                  {/* Barra visível com cor por contexto */}
                  <Bar dataKey="bar" stackId="wf" radius={[5, 5, 0, 0]} maxBarSize={50}>
                    {waterfallData.map((entry, index) => (
                      <Cell
                        key={`wf-${index}`}
                        fill={
                          entry.isFinal
                            ? (entry.rawValue >= 0 ? PALETTE.fcl : PALETTE.saidas)
                            : (entry.positive ? PALETTE.receita : PALETTE.saidas)
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legenda manual */}
            <div className="flex items-center gap-5 mt-4 justify-center text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: PALETTE.receita}} /> Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: PALETTE.saidas}} /> Saídas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{background: PALETTE.fcl}} /> FCL</span>
            </div>
          </div>
        )}

        {/* ── TAB 3: COMPOSIÇÃO (DONUT) ── */}
        {activeTab === 'composicao' && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Distribuição das principais categorias de custo e despesa</p>
            <div className="h-72 w-full flex items-center">
              {composicaoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={composicaoData}
                      cx="40%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {composicaoData.map((_, index) => (
                        <Cell key={`c-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [fmt(Number(v), isPrivacyMode), '']} contentStyle={tooltipStyle} />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                      formatter={(value, entry: any) => (
                        <span style={{ color: '#475569' }}>
                          {value} {!isPrivacyMode && `(${((entry.payload.value / (kpis.totalCustos + kpis.totalDespesas)) * 100).toFixed(1)}%)`}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-sm mx-auto">Sem dados suficientes</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: RADAR ── */}
        {activeTab === 'radar' && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Proporção de cada componente sobre o Total de Entradas Operacionais (%)</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 40, left: 40, bottom: 10 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Radar
                    name="% sobre Receita"
                    dataKey="value"
                    stroke={PALETTE.fcl}
                    fill={PALETTE.fcl}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(v: any) => [`${v}%`, '% sobre Receita']} contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
