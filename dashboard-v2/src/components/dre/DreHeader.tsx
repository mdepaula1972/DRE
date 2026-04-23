import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Eye, FileText, SlidersHorizontal } from 'lucide-react';
import { APP_VERSION } from '@/version';

interface DreHeaderProps {
  lastUpdate: string | null;
  onExportPDF: () => void;
  onTogglePrivacy: () => void;
  isPrivacyMode: boolean;
  onToggleSimulator: () => void;
}

export function DreHeader({ lastUpdate, onExportPDF, onTogglePrivacy, isPrivacyMode, onToggleSimulator }: DreHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
      <div className="flex items-center gap-4">
        <Link 
          href="/" 
          className="p-2 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors shadow-sm"
          title="Voltar ao Início"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900">Demonstração do Resultado</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-full text-slate-500">
              {APP_VERSION}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {lastUpdate ? `Atualizado em: ${lastUpdate}` : 'Aguardando dados...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <button 
          onClick={onTogglePrivacy}
          className={`p-2.5 rounded-xl border transition-colors shadow-sm ${
            isPrivacyMode 
              ? "bg-slate-800 border-slate-800 text-amber-400" 
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
          title="Ocultar Valores"
        >
          <Eye size={18} />
        </button>
        
        <Link 
          href="/indicadores_v2.html" 
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          Gestor
        </Link>

        <button 
          onClick={onToggleSimulator}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Simular</span>
        </button>

        <button 
          onClick={onExportPDF}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors shadow-md"
        >
          <FileText size={16} />
          <span className="hidden sm:inline">Exportar PDF</span>
        </button>
      </div>
    </header>
  );
}
