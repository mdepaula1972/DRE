"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Home, ExternalLink } from "lucide-react";
import { APP_VERSION } from "@/version";

export function HeaderFinanceiro() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoOmie = () => {
    window.open("https://app.omie.com.br", "_blank");
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <Image
                src="/mar-brasil-logo.png"
                alt="Mar Brasil"
                width={140}
                height={48}
                className="object-contain h-12 w-auto"
                priority
              />
              <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded self-start mt-1">{APP_VERSION}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 ml-0.5">Serviços e Locações</span>
          </div>
        </div>

        {/* Title */}
        <div className="hidden md:block ml-4 pl-4 border-l border-slate-200">
          <h1 className="text-xl font-bold text-slate-800 leading-tight tracking-tight">
            Financeiro <span className="text-emerald-600">360º</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Integração Consolidada Omie ERP
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGoOmie}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all border border-slate-200 shadow-sm"
        >
          <ExternalLink size={16} />
          <span>Abrir Omie</span>
        </button>

        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-slate-200"
        >
          <Home size={16} />
          <span>Dashboard Principal</span>
        </button>
      </div>
    </header>
  );
}
