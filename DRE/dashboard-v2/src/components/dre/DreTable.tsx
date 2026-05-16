import React from 'react';
import { DreCalculatedResult } from '@/types/dre';

interface DreTableProps {
  results: DreCalculatedResult | null;
  isPrivacyMode: boolean;
  onRowClick?: (title: string) => void;
}

export function DreTable({ results, isPrivacyMode, onRowClick }: DreTableProps) {
  if (!results) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-sm">
        Faça o upload do CSV para visualizar o detalhamento financeiro.
      </div>
    );
  }

  const { estrutura, totais, mensal, validColumns } = results;

  // Inverter a ordem das colunas para mostrar o mês mais recente primeiro
  const reversedColumns = [...validColumns].reverse();

  const displayValue = (val: number, isPercent = false) => {
    if (isPrivacyMode) return '****';
    if (isPercent) return `${val.toFixed(2).replace('.', ',')}%`;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Detalhamento Financeiro</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                Descrição
              </th>
              <th className="px-4 py-3 text-right bg-slate-200 font-bold border-r border-slate-300">
                Total
              </th>
              {reversedColumns.map(col => (
                <th key={col} className="px-4 py-3 text-right">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {estrutura.map((item, idx) => {
              if (item.tipo === 'hidden') return null;
              
              if (item.tipo === 'divisor') {
                return (
                  <tr key={`div-${idx}`} className="bg-slate-50">
                    <td colSpan={reversedColumns.length + 2} className="h-2"></td>
                  </tr>
                );
              }

              const isCard = item.tipo === 'card' || item.tipo === 'card_percentual';
              const isCalc = item.tipo === 'linha_calc';
              const isPercent = item.tipo === 'card_percentual';

              const totalVal = totais[item.titulo] || 0;

              return (
                <tr 
                  key={idx} 
                  onClick={() => onRowClick && onRowClick(item.titulo)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-amber-50/50' : ''} ${
                    isCard ? 'bg-slate-50 font-bold text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <td className={`px-4 py-2.5 sticky left-0 border-r border-slate-200 ${
                    isCard ? 'bg-slate-50 z-10' : 'bg-white z-10'
                  }`}>
                    {item.titulo}
                  </td>
                  
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-[13px] bg-slate-50 border-r border-slate-200">
                    {displayValue(totalVal, isPercent)}
                  </td>

                  {reversedColumns.map(col => {
                    const monthVal = mensal[item.titulo]?.[col] || 0;
                    return (
                      <td key={col} className="px-4 py-2.5 text-right font-mono text-[13px]">
                        {displayValue(monthVal, isPercent)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
