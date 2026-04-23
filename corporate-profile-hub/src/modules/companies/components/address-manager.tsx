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
import { AddressForm } from "../forms/address-form";
import { supabase } from "@/lib/supabase/client";
import { 
    MapPin, 
    Plus, 
    Trash2, 
    Loader2,
    Edit3,
    Home,
    Building,
    Truck,
    CreditCard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AddressManager({ companyId }: { companyId: string }) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  const fetchAddresses = async () => {
    if (!companyId || companyId === "new") {
        setLoading(false);
        return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("company_addresses")
      .select("*")
      .eq("company_id", companyId)
      .order("type");

    if (!error && data) {
      setAddresses(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este endereço?")) return;

    const { error } = await supabase
      .from("company_addresses")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchAddresses();
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
        case 'Matriz': return <Home className="size-5" />;
        case 'Filial': return <Building className="size-5" />;
        case 'Entrega': return <Truck className="size-5" />;
        case 'Cobrança': return <CreditCard className="size-5" />;
        default: return <MapPin className="size-5" />;
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800">Gestão de Localidades</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Gerencie múltiplos endereços (Matriz, Unidades e Filiais) desta empresa.
          </CardDescription>
        </div>
        {!showForm && (
            <Button 
                onClick={() => setShowForm(true)} 
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
                <Plus className="size-4 mr-2" />
                Novo Endereço
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="px-0">
        {showForm ? (
            <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3 mb-8">
                    <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        {editingAddress ? <Edit3 className="size-5" /> : <Plus className="size-5" />}
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                        {editingAddress ? "Editar Localidade" : "Adicionar Nova Localidade"}
                    </h3>
                </div>
                <AddressForm 
                    companyId={companyId}
                    address={editingAddress}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingAddress(null);
                        fetchAddresses();
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingAddress(null);
                    }}
                />
            </div>
        ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="size-10 animate-spin opacity-20" />
                <span className="font-bold text-xs uppercase tracking-widest opacity-40 text-slate-500">Sincronizando endereços...</span>
            </div>
        ) : addresses.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <MapPin className="size-8" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum endereço cadastrado</p>
                <Button variant="link" onClick={() => setShowForm(true)} className="text-primary font-black mt-2">Adicionar o primeiro agora</Button>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2">
                {addresses.map((addr) => (
                    <div 
                        key={addr.id}
                        className="group relative bg-white border border-slate-100 p-6 rounded-3xl transition-all hover:shadow-xl hover:shadow-slate-200/50"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                    {getAddressIcon(addr.type)}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-slate-900 text-base uppercase leading-tight tracking-tighter">{addr.city}</h4>
                                        <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase px-2">
                                            {addr.type}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{addr.state}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                        setEditingAddress(addr);
                                        setShowForm(true);
                                    }}
                                    className="size-9 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                                >
                                    <Edit3 className="size-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete(addr.id)}
                                    className="size-9 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-50 space-y-1.5 focus:outline-none">
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                {addr.street}{addr.number ? `, ${addr.number}` : ""}{addr.complement ? ` - ${addr.complement}` : ""}
                            </p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                                {addr.neighborhood} • {addr.zip_code}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
