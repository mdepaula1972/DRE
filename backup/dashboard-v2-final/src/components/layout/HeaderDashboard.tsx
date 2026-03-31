"use client";

import { PlusCircle, FileText, Users, Home, LogOut, Box } from "lucide-react";

export function HeaderDashboard() {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Logo Cube Icon */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg shadow-lg flex items-center justify-center">
              <Box className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            {/* Decorative shadow element */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-600/20 rounded-lg -z-10" />
          </div>
          
          {/* Brand Text */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">MAR BRASIL</span>
            </div>
            <span className="text-xs font-medium text-slate-500">Serviços e Locações</span>
          </div>
        </div>

        {/* Title */}
        <div className="hidden md:block ml-4 pl-4 border-l border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            Empréstimos
          </h1>
          <p className="text-xs text-slate-500">
            Consolidação, acompanhamento e histórico gerencial
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <PlusCircle size={18} />
          <span>Novo Empréstimo</span>
        </button>
        
        <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-200">
          <FileText size={18} />
          <span>Gerar Termo</span>
        </button>

        <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border border-slate-200">
          <Users size={18} />
          <span>PeopleBoard</span>
        </button>

        <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <Home size={18} />
          <span>Voltar ao Início</span>
        </button>
      </div>
    </header>
  );
}
