'use client';

import Image from "next/image";
import { LogOut } from "lucide-react";
import { APP_VERSION } from "@/version";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function HeaderFinanceiro() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded self-start mt-1">{APP_VERSION}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 ml-0.5">SaaS DRE</span>
          </div>
        </div>

        {/* Title */}
        <div className="hidden md:block ml-4 pl-4 border-l border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 leading-tight tracking-tight">
            DRE <span className="text-emerald-600">Pro</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Demonstração de Resultado Interativa
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-slate-200 shadow-sm"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
