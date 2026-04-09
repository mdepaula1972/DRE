"use client";

import { useState, useEffect } from "react";
import { Membro, ContratoBase, Recebimento, DivisaoInput } from "@/types/comissoes";
import { formatCurrency } from "@/services/comissoes.service";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

interface LancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    contrato_id: string;
    data_recebimento: string;
    nota_fiscal: string;
    ciclo: string;
    valor_bruto: number;
    valor_liquido: number;
    divisoes: DivisaoInput[];
    editId?: string;
  }) => Promise<void>;
  onNovoContrato: () => void;
  equipe: Membro[];
  contratos: ContratoBase[];
  editData?: Recebimento | null;
}

const PERCENTUAIS_PADRAO: Record<string, number> = {
  Carlos: 0.35,
  Abrantes: 0.35,
  Geovanna: 0.20,
  Prado: 0.10,
};

export function LancamentoModal({
  isOpen, onClose, onSave, onNovoContrato, equipe, contratos, editData,
}: LancamentoModalProps) {
  const [contratoId, setContratoId] = useState("");
  const [data, setData] = useState("");
  const [nf, setNf] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [bruto, setBruto] = useState("");
  const [liquido, setLiquido] = useState("");
  const [divisoes, setDivisoes] = useState<DivisaoInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membrosAtivos = equipe.filter(m => m.ativo);
  const liquidoNum = parseFloat(liquido) || 0;
  const totalPct = divisoes.reduce((s, d) => s + d.porcentagem, 0);
  const pctOk = Math.abs(totalPct - 1.0) < 0.001;

  // Inicializa divisões com percentuais padrão ao abrir
  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      // Modo edição: preencher com dados existentes
      setContratoId(editData.contrato_id);
      setData(editData.data_recebimento);
      setNf(editData.nota_fiscal ?? "");
      setCiclo(editData.ciclo ?? "");
      setBruto(String(editData.valor_bruto));
      setLiquido(String(editData.valor_liquido));
      setDivisoes(membrosAtivos.map(m => {
        const com = editData.comissoes.find(c => c.membro_id === m.id);
        return {
          membro_id: m.id,
          nome: m.nome,
          porcentagem: com ? com.porcentagem * 100 : (PERCENTUAIS_PADRAO[m.nome] ?? 0),
          valor_calculado: com?.valor_calculado ?? 0,
        };
      }));
    } else {
      // Modo criação: reset + percentuais padrão
      setContratoId("");
      setData(new Date().toISOString().slice(0, 10));
      setNf("");
      setCiclo("");
      setBruto("");
      setLiquido("");
      setDivisoes(membrosAtivos.map(m => ({
        membro_id: m.id,
        nome: m.nome,
        porcentagem: PERCENTUAIS_PADRAO[m.nome] ?? 0,
        valor_calculado: 0,
      })));
    }
    setError(null);
  }, [isOpen, editData, equipe]);

  // Recalcula valores ao digitar o líquido ou alterar percentuais
  useEffect(() => {
    setDivisoes(prev => prev.map(d => ({
      ...d,
      valor_calculado: liquidoNum * (d.porcentagem / 100),
    })));
  }, [liquidoNum]);

  const handlePctChange = (membroId: string, pct: number) => {
    setDivisoes(prev => prev.map(d =>
      d.membro_id === membroId
        ? { ...d, porcentagem: pct, valor_calculado: liquidoNum * (pct / 100) }
        : d
    ));
  };

  const handleSubmit = async () => {
    if (!contratoId) { setError("Selecione um contrato."); return; }
    if (!data) { setError("Informe a data de recebimento."); return; }
    if (!liquido || parseFloat(liquido) <= 0) { setError("Informe o valor líquido."); return; }
    if (!pctOk) { setError(`A soma dos percentuais deve ser 1,00%. Atual: ${totalPct.toFixed(2)}%`); return; }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        contrato_id: contratoId,
        data_recebimento: data,
        nota_fiscal: nf,
        ciclo,
        valor_bruto: parseFloat(bruto) || parseFloat(liquido),
        valor_liquido: parseFloat(liquido),
        divisoes,
        editId: editData?.id,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar lançamento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editData ? "Editar Recebimento" : "Novo Recebimento"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Preencha os dados e distribua as comissões</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Contrato */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Contrato *
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={contratoId}
                onChange={e => setContratoId(e.target.value)}
              >
                <option value="">Selecione um contrato...</option>
                {contratos.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_contrato}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onNovoContrato}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-all"
                title="Novo contrato"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Data, NF, Ciclo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Data *</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Nota Fiscal</label>
              <input type="text" placeholder="Ex: 202" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={nf} onChange={e => setNf(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Ciclo</label>
              <input type="month" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={ciclo} onChange={e => setCiclo(e.target.value)} />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Valor Bruto</label>
              <input type="number" step="0.01" placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={bruto} onChange={e => setBruto(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Valor Líquido *</label>
              <input type="number" step="0.01" placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={liquido} onChange={e => setLiquido(e.target.value)} />
            </div>
          </div>

          {/* Distribuição */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Distribuição de Comissões (1%)
              </h3>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                pctOk
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600"
              }`}>
                {pctOk ? <CheckCircle2 size={12} className="inline mr-1" /> : null}
                {totalPct.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {divisoes.map(d => (
                <div key={d.membro_id} className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2">{d.nome}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      value={d.porcentagem}
                      onChange={e => handlePctChange(d.membro_id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-xs text-slate-400 shrink-0">%</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1.5">
                    {formatCurrency(d.valor_calculado)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSaving ? "Salvando..." : editData ? "Atualizar" : "Salvar Lançamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
