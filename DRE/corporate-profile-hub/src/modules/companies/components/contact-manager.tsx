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
import { ContactForm } from "../forms/contact-form";
import { supabase } from "@/lib/supabase/client";
import { 
    Phone, 
    Mail, 
    User, 
    Plus, 
    Trash2, 
    Briefcase,
    Loader2,
    MessageCircle,
    Star,
    BellRing,
    ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ContactManager({ companyId }: { companyId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);

  const fetchContacts = async () => {
    if (!companyId || companyId === "new") {
        setLoading(false);
        return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("company_contacts")
      .select("*")
      .eq("company_id", companyId)
      .order("department")
      .order("name");

    if (!error && data) {
      setContacts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este contato?")) return;

    const { error } = await supabase
      .from("company_contacts")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchContacts();
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
        window.open(`https://wa.me/55${cleanPhone}`, "_blank");
    } else {
        alert("Telefone inválido para WhatsApp");
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg font-black uppercase tracking-tight">Pontos de Contato</CardTitle>
          <CardDescription>
            Contatos inteligentes vinculados à base de colaboradores.
          </CardDescription>
        </div>
        {!showForm && (
            <Button 
                onClick={() => setShowForm(true)} 
                className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
                <Plus className="size-4 mr-2" />
                Novo Contato
            </Button>
        )}
      </CardHeader>
      
      <CardContent className="px-0">
        {showForm ? (
            <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-xl animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3 mb-8">
                    <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Plus className="size-5" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                        {editingContact ? "Editar Contato Corporativo" : "Configurar Novo Contato"}
                    </h3>
                </div>
                <ContactForm 
                    companyId={companyId}
                    contact={editingContact}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingContact(null);
                        fetchContacts();
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingContact(null);
                    }}
                />
            </div>
        ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="size-10 animate-spin opacity-20" />
                <span className="font-bold text-xs uppercase tracking-widest opacity-40">Sincronizando contatos...</span>
            </div>
        ) : contacts.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <div className="size-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <User className="size-8" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum contato encontrado</p>
                <Button variant="link" onClick={() => setShowForm(true)} className="text-primary font-black mt-2">Clique para adicionar o primeiro</Button>
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2">
                {contacts.map((contact) => (
                    <div 
                        key={contact.id}
                        className="group relative bg-white border border-slate-100 p-6 rounded-3xl transition-all hover:shadow-xl hover:shadow-slate-200/50"
                    >

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                    <User className="size-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-black text-primary text-base uppercase leading-tight tracking-tighter">
                                        {contact.contact_types && contact.contact_types.length > 0 
                                            ? contact.contact_types.join(" | ") 
                                            : "CONTATO GERAL"}
                                    </h4>
                                    <div className="flex flex-col gap-2 mt-1">
                                        <span className="text-lg font-bold text-slate-800 tracking-tight leading-none">
                                            {contact.name}
                                        </span>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {contact.department && (
                                                <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase">
                                                    {contact.department}
                                                </Badge>
                                            )}
                                            {contact.receives_notifications && (
                                                <Badge className="bg-amber-50 text-amber-600 border-none font-bold text-[9px] uppercase">
                                                    <BellRing className="size-3 mr-1" /> Alertas
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                        setEditingContact(contact);
                                        setShowForm(true);
                                    }}
                                    className="size-9 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                                >
                                    <ExternalLink className="size-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete(contact.id)}
                                    className="size-9 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between group/line">
                                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                                    <Mail className="size-4 opacity-40" />
                                    <span className="truncate max-w-[150px] lg:max-w-none">{contact.email || "---"}</span>
                                </div>
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="text-primary opacity-0 group-hover/line:opacity-100 transition-all font-bold text-xs">Enviar E-mail</a>
                                )}
                            </div>

                            <div className="flex items-center justify-between group/line">
                                <div className="flex items-center gap-3 text-sm text-slate-900 font-black">
                                    <Phone className="size-4 text-primary opacity-60" />
                                    <span className="font-mono tracking-tighter text-base">{contact.phone || "---"}</span>
                                </div>
                                {contact.phone && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => openWhatsApp(contact.phone)}
                                        className="h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black text-[10px] rounded-lg px-3"
                                    >
                                        <MessageCircle className="size-3 mr-1.5" /> WHATSAPP
                                    </Button>
                                )}
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
