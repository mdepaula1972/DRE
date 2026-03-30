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

interface ProjectionChartProps {
  data?: ProjectionData[];
}

const defaultData = [
  { month: 'Mar/25', total: 4200, previsto: 3800 },
  { month: 'Abr/25', total: 4800, previsto: 4500 },
  { month: 'Mai/25', total: 5100, previsto: 4900 },
  { month: 'Jun/25', total: 5800, previsto: 5200 },
  { month: 'Jul/25', total: 6200, previsto: 5800 },
  { month: 'Ago/25', total: 6900, previsto: 6200 },
  { month: 'Set/25', total: 7200, previsto: 6800 },
  { month: 'Out/25', total: 8100, previsto: 7200 },
  { month: 'Nov/25', total: 8500, previsto: 7800 },
  { month: 'Dez/25', total: 9200, previsto: 8500 },
  { month: 'Jan/26', total: 9800, previsto: 9100 },
  { month: 'Fev/26', total: 10500, previsto: 9800 },
];

export function ProjectionChart({ data }: ProjectionChartProps) {
  const chartData = data?.length ? data.map(d => ({ 
    name: d.month, 
    total: d.total, 
    previsto: d.previsto 
  })) : defaultData;

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
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#FFF', 
                borderRadius: '12px', 
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: '600'
              }}
              cursor={{ fill: 'rgba(0, 71, 122, 0.03)' }}
            />
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
