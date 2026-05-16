"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface ContratoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { nome_contrato: string; numero_contrato?: string; observacoes?: string }) => Promise<void>;
}

export function ContratoModal({ isOpen, onClose, onSave }: ContratoModalProps) {
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [obs, setObs] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nome.trim()) { setError("Nome do contrato é obrigatório."); return; }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ nome_contrato: nome.trim(), numero_contrato: numero || undefined, observacoes: obs || undefined });
      setNome(""); setNumero(""); setObs("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Novo Contrato</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Nome *</label>
            <input
              type="text"
              placeholder="Ex: Prefeitura de Fortaleza"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Número (opcional)</label>
            <input
              type="text"
              placeholder="Ex: CT-2024-001"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={numero}
              onChange={e => setNumero(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Observações (opcional)</label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              value={obs}
              onChange={e => setObs(e.target.value)}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
