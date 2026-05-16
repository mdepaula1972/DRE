"use client";

import { Membro, Recebimento, KpiTotais } from "@/types/comissoes";
import { formatCurrency } from "@/services/comissoes.service";
import { BadgeDollarSign, TrendingUp } from "lucide-react";

interface KpiCardsProps {
  equipe: Membro[];
  historico: Recebimento[];
}

const COLORS = [
  { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   icon: "bg-amber-100",   value: "text-amber-800"  },
  { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    icon: "bg-blue-100",    value: "text-blue-800"   },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100", value: "text-emerald-800" },
  { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    icon: "bg-rose-100",    value: "text-rose-800"   },
  { bg: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-700",  icon: "bg-violet-100",  value: "text-violet-800" },
];

export function KpiCards({ equipe, historico }: KpiCardsProps) {
  // Calcula totais de comissão por membro
  const totais: KpiTotais = { Geral: 0 };

  equipe.forEach(m => { totais[m.id] = 0; });

  historico.forEach(rec => {
    rec.comissoes.forEach(com => {
      if (!totais[com.membro_id]) totais[com.membro_id] = 0;
      totais[com.membro_id] += com.valor_calculado;
      totais.Geral += com.valor_calculado;
    });
  });

  const ativos = equipe.filter(m => m.ativo || (totais[m.id] ?? 0) > 0);

  if (ativos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {/* Card Total Geral */}
      <div className="col-span-2 md:col-span-3 lg:col-span-5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div>
          <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider mb-1">
            Total em Comissões (Período)
          </p>
          <p className="text-white text-3xl font-black">
            {formatCurrency(totais.Geral)}
          </p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <TrendingUp className="text-white" size={26} />
        </div>
      </div>

      {/* Cards por membro */}
      {ativos.map((m, idx) => {
        const color = COLORS[idx % COLORS.length];
        const valor = totais[m.id] ?? 0;
        return (
          <div
            key={m.id}
            className={`${color.bg} ${color.border} border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className={`w-8 h-8 ${color.icon} rounded-lg flex items-center justify-center mb-3`}>
              <BadgeDollarSign className={color.text} size={16} />
            </div>
            <p className={`text-xs font-bold uppercase tracking-wide ${color.text} mb-1`}>
              {m.nome}
            </p>
            <p className={`text-lg font-black ${color.value}`}>
              {formatCurrency(valor)}
            </p>
            <p className="text-slate-400 text-[10px] mt-1">
              {(m.pct_padrao * 100).toFixed(2)}% padrão
            </p>
          </div>
        );
      })}
    </div>
  );
}
