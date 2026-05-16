"use client";

import { useState } from "react";
import { Membro } from "@/types/comissoes";
import { X, UserCheck, UserX, UserPlus, Loader2 } from "lucide-react";

interface EquipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipe: Membro[];
  onToggle: (id: string, ativo: boolean) => Promise<void>;
  onAddMembro: (nome: string, pct: number) => Promise<void>;
}

export function EquipeModal({ isOpen, onClose, equipe, onToggle, onAddMembro }: EquipeModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [pct, setPct] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (membro: Membro) => {
    setLoadingId(membro.id);
    try {
      await onToggle(membro.id, !membro.ativo);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddSubmit = async () => {
    if (!nome.trim()) return;
    setIsSaving(true);
    try {
      await onAddMembro(nome.trim(), parseFloat(pct) / 100 || 0);
      setNome("");
      setPct("");
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar Equipe</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Lista */}
        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
          {equipe.map(m => (
            <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              m.ativo ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"
            }`}>
              <div>
                <p className={`text-sm font-semibold ${m.ativo ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  {m.nome}
                </p>
                <p className="text-xs text-slate-400">{(m.pct_padrao * 100).toFixed(2)}% padrão</p>
              </div>
              <button
                onClick={() => handleToggle(m)}
                disabled={loadingId === m.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  m.ativo
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {loadingId === m.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : m.ativo ? <><UserCheck size={12} /> Ativo</> : <><UserX size={12} /> Inativo</>
                }
              </button>
            </div>
          ))}
        </div>

        {/* Formulário novo membro */}
        {showForm ? (
          <div className="px-6 pb-4 border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Novo Comissionado</h3>
            <input
              type="text"
              placeholder="Nome"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="% padrão (ex: 0.35)"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={pct}
                onChange={e => setPct(e.target.value)}
              />
              <span className="self-center text-sm text-slate-400">%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={isSaving || !nome.trim()}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 hover:border-amber-400 text-slate-400 hover:text-amber-600 rounded-xl text-sm font-semibold transition-all"
            >
              <UserPlus size={16} />
              Novo Comissionado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
