import React from 'react';
import { Eye, FileText, SlidersHorizontal, LogOut } from 'lucide-react';
import { APP_VERSION } from '@/version';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface DreHeaderProps {
  lastUpdate: string | null;
  onExportPDF: () => void;
  onTogglePrivacy: () => void;
  isPrivacyMode: boolean;
  onToggleSimulator: () => void;
}

export function DreHeader({ lastUpdate, onExportPDF, onTogglePrivacy, isPrivacyMode, onToggleSimulator }: DreHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900">DRE <span className="text-emerald-600">Pro</span></h1>
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
        
        <button 
          onClick={onToggleSimulator}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Simular</span>
        </button>

        <button 
          onClick={onExportPDF}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors shadow-md min-w-[140px]"
        >
          <FileText size={16} /> <span className="hidden sm:inline">Exportar PDF</span>
        </button>

        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm"
          title="Sair do Sistema"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
