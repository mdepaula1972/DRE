"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartnerForm } from "../forms/partner-form";
import { supabase } from "@/lib/supabase/client";
import { 
    Users, 
    Plus, 
    Trash2, 
    Loader2,
    ShieldCheck,
    PieChart,
    UserCircle,
    Building2,
    Percent,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PartnerManager({ companyId }: { companyId: string }) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);

  const fetchPartners = async () => {
    if (!companyId || companyId === "new") {
        setLoading(false);
        return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("company_contacts")
      .select("*")
      .eq("company_id", companyId)
      .gt("participation_percentage", 0) // Filtra apenas contatos que são sócios
      .order("participation_percentage", { ascending: false });

    if (!error && data) {
      setPartners(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPartners();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este sócio?")) return;

    const { error } = await supabase
      .from("company_contacts")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchPartners();
    }
  };

  // Cálculo da Participação Total
  const totalParticipation = partners.reduce((acc, p) => acc + Number(p.participation_percentage), 0);
  const remainingParticipation = 100 - totalParticipation;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
            <Users className="size-6 text-primary" />
            Composição Societária
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Gestão de sócios, participações e poderes administrativos.
          </CardDescription>
        </div>
        {!showForm && (
            <Button 
                onClick={() => setShowForm(true)} 
                disabled={totalParticipation >= 100}
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 h-11 px-8"
            >
                <Plus className="size-4 mr-2" />
                Vincular Novo Sócio
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="px-0 space-y-8">
        {/* Widget de Capital Social */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    <PieChart className="size-4 text-emerald-500" />
                    Capital Social Integralizado
                </div>
                <div className="text-xl font-black text-slate-800">
                    {totalParticipation.toFixed(2)}%
                </div>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary transition-all duration-500 rounded-full" 
                    style={{ width: `${Math.min(totalParticipation, 100)}%` }}
                />
            </div>
            <div className="mt-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className={totalParticipation === 100 ? "text-emerald-600" : "text-slate-400"}>
                    {totalParticipation === 100 ? "Capital 100% Distribuído" : `${remainingParticipation.toFixed(2)}% Disponível`}
                </span>
                {totalParticipation > 100 && (
                    <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="size-3" /> Excesso de Participação!
                    </span>
                )}
            </div>
        </div>

        {showForm ? (
            <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="size-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 leading-none">
                            {editingPartner ? "Editar Sócio" : "Novo Sócio"}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                            Preencha os dados de identificação e cota societária
                        </p>
                    </div>
                </div>
                <PartnerForm 
                    companyId={companyId}
                    partner={editingPartner}
                    maxAllowed={remainingParticipation}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingPartner(null);
                        fetchPartners();
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingPartner(null);
                    }}
                />
            </div>
        ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
                <Loader2 className="size-10 animate-spin opacity-20" />
                <span className="font-bold text-xs uppercase tracking-widest opacity-40">Sincronizando sócios...</span>
            </div>
        ) : partners.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div className="size-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <Users className="size-10" />
                </div>
                <h4 className="text-slate-800 font-black uppercase text-xs tracking-widest mb-1">Nenhum sócio vinculado</h4>
                <p className="text-slate-400 text-xs font-medium mb-6">Comece vinculando os sócios para completar o perfil da empresa.</p>
                <Button variant="outline" onClick={() => setShowForm(true)} className="rounded-xl font-bold border-slate-200">
                    Adicionar Primeiro Sócio
                </Button>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2">
                {partners.map((partner) => (
                    <div 
                        key={partner.id}
                        className="group relative bg-white border border-slate-100 p-6 rounded-3xl transition-all hover:shadow-xl hover:shadow-slate-200/50"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="size-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                                    {partner.tax_id.replace(/\D/g, "").length > 11 ? (
                                        <Building2 className="size-6 text-slate-400 group-hover:text-primary" />
                                    ) : (
                                        <UserCircle className="size-7 text-slate-400 group-hover:text-primary" />
                                    )}
                                    <div className="mt-1 flex items-center gap-0.5 text-[9px] font-black text-primary">
                                        <Percent className="size-2.5" />
                                        {Number(partner.participation_percentage).toFixed(1)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-slate-900 text-base uppercase leading-tight tracking-tighter">
                                        {partner.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase px-2">
                                            {partner.role}
                                        </Badge>
                                        {partner.is_administrator && (
                                            <Badge className="bg-amber-50 text-amber-600 border-none font-bold text-[9px] uppercase flex items-center gap-1">
                                                <ShieldCheck className="size-3" /> Administrador
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                        setEditingPartner(partner);
                                        setShowForm(true);
                                    }}
                                    className="size-9 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                                >
                                    <Plus className="size-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete(partner.id)}
                                    className="size-9 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento ID</p>
                                <p className="text-sm font-mono font-bold text-slate-600 tracking-tighter">{partner.tax_id}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Participação</p>
                                <p className="text-xl font-black text-primary leading-none mt-1">{Number(partner.participation_percentage).toFixed(2)}%</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
