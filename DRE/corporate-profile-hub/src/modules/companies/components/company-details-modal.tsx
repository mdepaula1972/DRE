"use client";

import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { CompanyTabsHub } from "./company-tabs-hub";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompanyDetailsModalProps {
  company: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedCompany?: any) => void;
}

export function CompanyDetailsModal({ 
  company, 
  isOpen, 
  onClose, 
  onUpdate 
}: CompanyDetailsModalProps) {
  console.log("🍊 [DEBUG] Dialog Modal State:", { isOpen, companyId: company?.id });
  if (!company) return null;

  const branding = company.branding || {};
  const primaryColor = branding.primary_color || "#F2911B";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 overflow-hidden border-none bg-white shadow-2xl rounded-3xl flex flex-col">
        <DialogHeader className="sr-only">
            <DialogTitle>Detalhamento da Empresa</DialogTitle>
            <DialogDescription>Visualize e edite os dados da empresa selecionada.</DialogDescription>
        </DialogHeader>

        {/* Header Moderno Estilo Ficha (Fixo) */}
        <div className="flex-none p-8 bg-slate-50 border-b border-slate-100 relative group overflow-hidden">
            {/* Efeito de Gradiente no Fundo do Header */}
            <div 
                className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" 
                style={{ backgroundColor: `${primaryColor}10` }}
            />

            <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-6">
                    {/* Logo Container com Sombra Premium */}
                    <div 
                        className="p-4 rounded-3xl text-white shadow-2xl flex items-center justify-center min-h-[72px] min-w-[72px] transition-transform duration-300 hover:scale-105"
                        style={{ 
                            backgroundColor: primaryColor,
                            boxShadow: `0 20px 40px -12px ${primaryColor}40`
                        }}
                    >
                        {branding.logo_url ? (
                            <img src={branding.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
                        ) : (
                            <Building2 size={32} />
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">
                            {company.id === "new" ? "Nova Ficha Cadastral" : (company.trade_name || company.legal_name)}
                        </h2>
                        <div className="flex items-center gap-3">
                            <Badge className="bg-white border-slate-200 text-slate-500 font-black text-[10px] py-1 px-3 rounded-full shadow-sm">
                                {company.id === "new" ? "AGUARDANDO DADOS" : `ID: ${company.id.substring(0, 8)}`}
                            </Badge>
                            {company.tax_id && (
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">
                                    {company.tax_id}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Linha de Indicador de Status (Simple Header) */}
            <div className="flex items-center gap-8 mt-8 border-t border-slate-200/50 pt-6">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Status da Ficha</span>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "size-2.5 rounded-full shadow-sm animate-pulse",
                            company.status === 'active' ? "bg-emerald-500 shadow-emerald-200" : "bg-red-500 shadow-red-200"
                        )} />
                        <span className="text-sm font-black text-slate-700">
                            {company.status === 'active' ? 'ATIVA' : 'INATIVA'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Área de Conteúdo com Scroll Vertical Nativo (Para Garantir Visibilidade) */}
        <div className="flex-1 overflow-y-auto p-10 bg-white">
            <div className="max-w-4xl mx-auto">
                <CompanyTabsHub company={company} onUpdate={onUpdate} />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
