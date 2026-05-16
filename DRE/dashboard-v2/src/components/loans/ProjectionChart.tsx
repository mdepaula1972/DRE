"use client";

import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ComposedChart,
  Line
} from 'recharts';
import { ProjectionData } from "@/types/loans";

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-xs">
      <p className="font-black text-slate-800 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500 font-semibold">{entry.name === 'total' ? 'Realizado' : 'Previsto'}:</span>
          <span className="font-black text-slate-800">{formatBRL(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
};

interface ProjectionChartProps {
  data?: ProjectionData[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  // Se não houver dados reais, gera um mock dinâmico preenchido começando do mês atual 
  // para que as barras não "sumam" misteriosamente no modo teste.
  const getDynamicDefaultData = () => {
    const defaultArr = [];
    const now = new Date();
    let currentAbs = now.getFullYear() * 12 + now.getMonth();
    
    // Tendência decrescente (mais realista para amortização de empréstimos)
    const fakeValues = [10500, 9800, 9100, 8200, 7500, 6800, 6100, 5400, 4800, 4100, 3500, 2900];

    for(let i = 0; i < 12; i++) {
        const y = Math.floor(currentAbs / 12);
        const m = (currentAbs % 12);
        const label = new Date(y, m, 1)
          .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
          .toUpperCase()
          .replace(' DE ', '/')
          .replace(/\. /g, '/')
          .replace(/\./g, '');

        defaultArr.push({ month: label, total: fakeValues[i] || 4000, previsto: (fakeValues[i] || 4000) * 0.95 });
        currentAbs++;
    }
    return defaultArr;
  };

  const chartData = (data && data.length > 0 ? data : getDynamicDefaultData()).map(d => ({
    month: 'month' in d ? d.month : (d as any).name,
    total: Number(d.total.toFixed(2)),
    previsto: Number(d.previsto.toFixed(2)),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Projeção de Recebimentos
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Previsão baseada em contratos ativos para os próximos 12 meses
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="text-slate-600 dark:text-slate-400">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">Previsto</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.4}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }}
              tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 71, 122, 0.03)' }} />
            <Bar 
              dataKey="total" 
              fill="url(#colorTotal)" 
              radius={[4, 4, 0, 0]} 
              barSize={24}
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="previsto" 
              stroke="#2ecc71" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#2ecc71', strokeWidth: 2, stroke: '#FFF' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={2000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
