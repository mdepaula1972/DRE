"use client";

import { ArrowUpRight, Clock, CheckCircle, History, RotateCcw } from "lucide-react";

interface Contract {
  id: string;
  operationNumber: string;
  value: string;
  balance: string;
  installments: string;
  nextPayment: string;
  endDate: string;
  status: "ATIVO" | "LIQUIDADO" | "ATRASADO";
  startDate: string;
}

interface ContractCardProps {
  contract: Contract;
  onAntecipar?: () => void;
  onPostergar?: () => void;
  onLiquidar?: () => void;
  onEditar?: () => void;
  onReverter?: () => void;
}

const statusMap = {
  ATIVO: { bg: "bg-emerald-100", text: "text-emerald-700", label: "ATIVO" },
  LIQUIDADO: { bg: "bg-slate-100", text: "text-slate-600", label: "LIQUIDADO" },
  ATRASADO: { bg: "bg-red-100", text: "text-red-700", label: "ATRASADO" },
};

export function ContractCard({ 
  contract, 
  onAntecipar, 
  onPostergar, 
  onLiquidar, 
  onEditar, 
  onReverter 
}: ContractCardProps) {
  const status = statusMap[contract.status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative transition-all hover:border-emerald-200 hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
            #{contract.operationNumber}
          </div>
          <div>
            <p className="text-xs font-black text-slate-900">OP. #{contract.id}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Início: {contract.startDate}</p>
          </div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-y-3 mb-5">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Valor do Empréstimo</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{contract.value}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Saldo Devedor</p>
          <p className="text-sm font-black text-red-600 tabular-nums">{contract.balance}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Parcelas</p>
          <p className="text-sm font-black text-slate-800 tabular-nums">{contract.installments}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Última Parcela</p>
          <p className="text-sm font-black text-emerald-600 tabular-nums">{contract.endDate}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={onAntecipar}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition-all border border-transparent hover:border-sky-100"
        >
          <ArrowUpRight size={16} />
          <span className="text-[9px] font-bold uppercase">Antecipar</span>
        </button>
        <button 
          onClick={onPostergar}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100"
        >
          <Clock size={16} />
          <span className="text-[9px] font-bold uppercase">Postergar</span>
        </button>
        <button 
          onClick={onLiquidar}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
        >
          <CheckCircle size={16} />
          <span className="text-[9px] font-bold uppercase">Liquidar</span>
        </button>
        <button 
          onClick={onEditar}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
        >
          <History size={16} />
          <span className="text-[9px] font-bold uppercase">Editar</span>
        </button>
        <button 
          onClick={onReverter}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-all border border-transparent hover:border-red-100 col-span-2"
        >
          <RotateCcw size={16} />
          <span className="text-[9px] font-bold uppercase">Reverter Parcelas</span>
        </button>
      </div>
    </div>
  );
}
