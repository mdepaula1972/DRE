"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstitutionalForm } from "../forms/institutional-form";
import { BrandingForm } from "../forms/branding-form";
import { AddressManager } from "./address-manager";
import { BankDataForm } from "../forms/bank-data-form";
import { ContactManager } from "./contact-manager";
import { PartnerManager } from "./partner-manager";
import { DocumentManager } from "@/modules/documents/components/document-manager";
import { 
    Building2, 
    Palette, 
    MapPin, 
    Phone, 
    Banknote, 
    Users, 
    FileText 
} from "lucide-react";

export function CompanyTabsHub({ company, onUpdate }: { company: any, onUpdate: () => void }) {
  console.log("🍊 [DEBUG] TabsHub Rendered for:", company?.id);
  const isNew = company.id === "new";

  return (
    <div className="theme-cockpit">
        <Tabs defaultValue="institucional" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1.5 overflow-x-auto h-auto flex-wrap md:flex-nowrap rounded-[20px] border border-slate-200/60 backdrop-blur-md">
            <TabsTrigger value="institucional" className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <Building2 className="size-4" />
                <span className="hidden md:inline">Institucional</span>
            </TabsTrigger>
            <TabsTrigger value="branding" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <Palette className="size-4" />
                <span className="hidden md:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="enderecos" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <MapPin className="size-4" />
                <span className="hidden md:inline">Endereços</span>
            </TabsTrigger>
            <TabsTrigger value="contatos" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <Phone className="size-4" />
                <span className="hidden md:inline">Contatos</span>
            </TabsTrigger>
            <TabsTrigger value="bancario" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <Banknote className="size-4" />
                <span className="hidden md:inline">Bancário</span>
            </TabsTrigger>
            <TabsTrigger value="responsaveis" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <Users className="size-4" />
                <span className="hidden md:inline">Sócios</span>
            </TabsTrigger>
            <TabsTrigger value="documentos" disabled={isNew} className="gap-2.5 rounded-xl data-[state=active]:bg-ember data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/20 transition-all font-black text-[10px] uppercase tracking-[0.12em] text-slate-500 py-2.5 px-5">
                <FileText className="size-4" />
                <span className="hidden md:inline">Documentos</span>
            </TabsTrigger>
        </TabsList>

        <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TabsContent value="institucional">
                <InstitutionalForm company={company} onUpdate={onUpdate} />
            </TabsContent>
            
            {!isNew ? (
                <>
                <TabsContent value="branding">
                    <BrandingForm company={company} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="enderecos">
                    <AddressManager companyId={company.id} />
                </TabsContent>

                <TabsContent value="contatos">
                    <ContactManager companyId={company.id} />
                </TabsContent>

                <TabsContent value="bancario">
                    <BankDataForm company={company} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="responsaveis">
                    <PartnerManager companyId={company.id} />
                </TabsContent>

                <TabsContent value="documentos">
                    <DocumentManager companyId={company.id} />
                </TabsContent>
                </>
            ) : (
                <div className="p-12 border-2 border-dashed border-slate-200/60 rounded-3xl bg-slate-50/50 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Salve os dados institucionais para liberar as outras abas
                    </p>
                </div>
            )}
        </div>
        </Tabs>
    </div>
  );
}
