"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Fingerprint, Tags, Calendar, Building2 } from "lucide-react";
import { Lancamento } from "@/types/lancamentos";
import { formatDateBR, formatCurrency } from "@/services/lancamentos.service";

interface Props {
  lancamentos: Lancamento[];
  allocations: any[];
  dimDRE: Map<string, string>;
  dimProjetos: Map<string, string>;
  dimCategorias: Map<string, any>;
}

export function LancamentosTable({ lancamentos, allocations, dimDRE, dimProjetos, dimCategorias }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const isOverdue = (item: Lancamento) => {
    const isPaid = (item.status_titulo || '').toUpperCase().includes('PAGO');
    const statusRaw = (item.status_titulo || '').toUpperCase();
    const today = new Date();
    today.setHours(0,0,0,0);
    const dtVenc = item.data_vencimento ? new Date(item.data_vencimento + 'T12:00:00') : new Date('2099-01-01');
    // Trust Omie: status "ATRASADO" = overdue. Also catch "A VENCER" with past due date.
    return !isPaid && (statusRaw === 'ATRASADO' || (dtVenc < today && !!item.data_vencimento && item.data_vencimento !== '---'));
  };

  const getStatusInfo = (item: Lancamento) => {
    const raw = (item.status_titulo || '').toUpperCase();
    const isPaid = raw.includes('PAGO');
    if (isPaid) return { label: 'PAGO', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (isOverdue(item)) return { label: 'ATRASADO', color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' };
    return { label: raw || 'ABERTO', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-5 py-4 w-32">Status</th>
              <th className="px-5 py-4">Data Ref.</th>
              <th className="px-5 py-4">Empresa</th>
              <th className="px-5 py-4 w-[280px]">Fornecedor/Beneficiário</th>
              <th className="px-5 py-4 text-right">Valor</th>
              <th className="px-5 py-4">Categoria</th>
              <th className="px-5 py-4 text-center">Fonte</th>
              <th className="px-5 py-4 text-center w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lancamentos.map((item) => {
              const isExpanded = expandedIds.has(item.id_global);
              const status = getStatusInfo(item);
              const catInfo = dimCategorias.get(item.categoria_id);
              const catName = catInfo?.descricao || item.categoria_id;

              // Row Data prep
              const itemAllocs = allocations.filter(a => String(a.codigo_lancamento_omie) === String(item.codigo_lancamento_omie));
              const hasAlloc = itemAllocs.length > 0;
              
              let dreText = 'Não vinculado';
              if (hasAlloc && itemAllocs[0].descricao_conta_dre) {
                dreText = itemAllocs[0].descricao_conta_dre;
              } else if (catInfo && catInfo.codigo_dre) {
                dreText = dimDRE.get(catInfo.codigo_dre) || `Cód: ${catInfo.codigo_dre}`;
              }

              const projText = (hasAlloc && itemAllocs[0].descricao_projeto) || 
                               (item._projetos && item._projetos.length > 0 ? item._projetos[0] : 'Nenhum');

              return (
                <React.Fragment key={item.id_global}>
                  <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${status.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${status.color}`} />
                        <span className={`text-[10px] font-bold ${status.text}`}>{status.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                      {formatDateBR(item._dataLabel)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-700 text-xs">{item.empresa}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[250px]" title={item.fornecedor}>
                        {item.fornecedor}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-slate-900">{formatCurrency(item.valor)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded leading-none truncate max-w-[150px]" title={catName}>
                        {catName}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        item.fonte === 'CP' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {item.fonte}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button 
                        onClick={() => toggleExpand(item.id_global)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          isExpanded 
                            ? 'bg-slate-100 border-slate-300 text-slate-800' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>Detalhes</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                      <td colSpan={8} className="p-0">
                        <div className="px-8 py-5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                          
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                                <Calendar size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Datas</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">Vencimento</span>
                                  <strong className="text-rose-600">{formatDateBR(item.data_vencimento)}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">Pagamento</span>
                                  <strong className="text-emerald-600">{formatDateBR(item.data_pagamento)}</strong>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                                <Tags size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Classificação (DRE / Projeto)</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                                <div className="flex justify-between items-start">
                                  <span className="text-slate-500">Conta DRE</span>
                                  <span className="font-semibold text-right text-blue-700 w-2/3">{dreText}</span>
                                </div>
                                <div className="flex justify-between items-start pt-2 border-t border-slate-100">
                                  <span className="text-slate-500">Projeto</span>
                                  <span className="font-medium text-right line-clamp-1 w-2/3" title={projText}>{projText}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                                <Building2 size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Rateio / Departamentos</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                {!hasAlloc ? (
                                  <span className="text-slate-400 italic">Padrão / Sem Rateio</span>
                                ) : (
                                  <ul className="space-y-2">
                                    {itemAllocs.map((a, i) => (
                                      <li key={i} className="flex justify-between items-center pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                        <span className="text-slate-600 line-clamp-1" title={a.descricao_departamento || a.codigo_departamento}>
                                          {a.descricao_departamento || a.codigo_departamento}
                                        </span>
                                        <div className="text-right whitespace-nowrap ml-4">
                                          <strong className="text-slate-900">{formatCurrency(a.valor_alocado)}</strong>
                                          <span className="text-[10px] text-slate-400 ml-1">({a.percentual_departamento}%)</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                                <Fingerprint size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Identificação Sistêmica</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-600">
                                {item.codigo_lancamento_omie && <div className="mb-1">OMIE: {item.codigo_lancamento_omie}</div>}
                                {item.codigo_movimento_cc && <div className="mb-1">MOV_CC: {item.codigo_movimento_cc}</div>}
                                {!item.codigo_lancamento_omie && !item.codigo_movimento_cc && <div>ID Indisponível</div>}
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                                <FileText size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Observação</span>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 min-h-[60px]">
                                {item.observacao || <span className="italic text-slate-400">Nenhuma observação registrada.</span>}
                              </div>
                            </div>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {lancamentos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                  Nenhum lançamento encontrado para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
