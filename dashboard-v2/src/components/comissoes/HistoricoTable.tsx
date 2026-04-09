"use client";

import { Membro, Recebimento } from "@/types/comissoes";
import { formatCurrency, formatDate, formatCiclo } from "@/services/comissoes.service";
import { Pencil, Trash2, InboxIcon } from "lucide-react";

interface HistoricoTableProps {
  equipe: Membro[];
  historico: Recebimento[];
  onEdit: (rec: Recebimento) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function HistoricoTable({ equipe, historico, onEdit, onDelete, isLoading }: HistoricoTableProps) {
  // Colunas dinâmicas: membros ativos + membros que aparecem no histórico
  const nomesSet = new Set<string>();
  equipe.filter(m => m.ativo).forEach(m => nomesSet.add(m.nome));
  historico.forEach(rec => rec.comissoes.forEach(c => { if (c.membroNome) nomesSet.add(c.membroNome); }));
  const colunasMembros = Array.from(nomesSet).sort();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando histórico...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          Histórico de Recebimentos e Comissões
          <span className="ml-2 bg-white border border-slate-200 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded">
            {historico.length} registro{historico.length !== 1 ? "s" : ""}
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 w-20">Ações</th>
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Contrato</th>
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Data</th>
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">NF</th>
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Ciclo</th>
              <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Vlr. Líquido</th>
              <th className="text-right text-[11px] font-semibold text-amber-600 uppercase tracking-wide px-4 py-3">Total 1%</th>
              {colunasMembros.map(nome => (
                <th key={nome} className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                  {nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {historico.length === 0 ? (
              <tr>
                <td colSpan={7 + colunasMembros.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <InboxIcon size={36} strokeWidth={1} />
                    <p className="font-medium text-sm">Nenhum recebimento encontrado</p>
                    <p className="text-xs">Ajuste os filtros ou registre um novo recebimento</p>
                  </div>
                </td>
              </tr>
            ) : (
              historico.map(rec => {
                const totalUmPct = rec.valor_liquido * 0.01;
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(rec)}
                          className="p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => onDelete(rec.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                    {/* Contrato */}
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate" title={rec.contratoNome}>
                      {rec.contratoNome}
                    </td>
                    {/* Data */}
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(rec.data_recebimento)}
                    </td>
                    {/* NF */}
                    <td className="px-4 py-3 text-slate-500">
                      {rec.nota_fiscal || "—"}
                    </td>
                    {/* Ciclo */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatCiclo(rec.ciclo)}
                    </td>
                    {/* Valor Líquido */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(rec.valor_liquido)}
                    </td>
                    {/* Total 1% */}
                    <td className="px-4 py-3 text-right font-bold text-amber-600 whitespace-nowrap">
                      {formatCurrency(totalUmPct)}
                    </td>
                    {/* Colunas por membro */}
                    {colunasMembros.map(nome => {
                      const comissao = rec.comissoes.find(c => c.membroNome === nome);
                      const valor = comissao?.valor_calculado ?? 0;
                      return (
                        <td
                          key={nome}
                          className={`px-4 py-3 text-right whitespace-nowrap ${
                            valor > 0 ? "text-slate-700 font-medium" : "text-slate-300"
                          }`}
                        >
                          {formatCurrency(valor)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
