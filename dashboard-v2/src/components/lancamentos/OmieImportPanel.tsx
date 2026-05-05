"use client";

import { useState } from "react";
import { Download, Trash2, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  onImportComplete: () => void;
  onClear: () => void;
  isClearingAll: boolean;
}

export function OmieImportPanel({ onImportComplete, onClear, isClearingAll }: Props) {
  const [empresa, setEmpresa] = useState("DZM");
  
  // Default to today
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMsg, setLogMsg] = useState("");
  const [done, setDone] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    setProgress(0);
    setLogMsg("Conectando ao Omie...");
    setDone(false);

    try {
      const response = await fetch("/api/omie/sync-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          company: empresa,
        }),
      });

      const reader = response.body?.getReader();
      const textDecoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;

        const text = textDecoder.decode(value);
        const lines = text.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: PROGRESS:")) {
            const p = parseInt(line.replace("data: PROGRESS:", ""));
            setProgress(p);
          } else if (line.startsWith("data: LOG:")) {
            setLogMsg(line.replace("data: LOG:", "").trim());
          } else if (line.startsWith("data: DONE")) {
            setProgress(100);
            setDone(true);
            setLogMsg("Importação concluída com sucesso!");
            onImportComplete();
          } else if (line.startsWith("data: ERROR:")) {
            setLogMsg("❌ " + line.replace("data: ERROR:", "").trim());
          }
        }
      }
    } catch (e: any) {
      setLogMsg("❌ Erro: " + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden relative z-30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Download className="text-emerald-600" size={18} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Importar do Omie (Avançado)</p>
            <p className="text-xs text-slate-400">Auditoria flexível dia a dia sem sobreposição</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isClearingAll && <span className="text-xs text-rose-500 font-medium animate-pulse">Limpando...</span>}
          {done && !isImporting && <CheckCircle2 size={18} className="text-emerald-500" />}
          {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Empresa
              </label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                disabled={isImporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
              >
                <option value="Mar Brasil">Mar Brasil</option>
                <option value="DZM">DZM</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Data Inicial (De)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isImporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Data Final (Até)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isImporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {isImporting && (
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                <span className="text-emerald-600 animate-pulse">{logMsg || "Processando..."}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isImporting && logMsg && (
            <p className="text-xs font-medium text-slate-500">{logMsg}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                 if(confirm("Tem certeza que deseja limpar TODOS os dados importados do Omie?")) onClear();
              }}
              disabled={isImporting || isClearingAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all disabled:opacity-50"
              title="Limpar todos os dados importados"
            >
              <Trash2 size={14} />
              Limpar Banco
            </button>

            <button
              onClick={handleImport}
              disabled={isImporting || isClearingAll}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {isImporting ? (
                <><Loader2 size={16} className="animate-spin" /> Importando {empresa}...</>
              ) : (
                <><Download size={16} /> Fazer Upsert ({formatDateLabel(startDate)} a {formatDateLabel(endDate)})</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
