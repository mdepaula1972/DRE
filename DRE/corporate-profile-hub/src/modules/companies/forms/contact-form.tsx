"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { maskPhone } from "@/lib/masks";
import { SmartContactPicker } from "../components/smart-contact-picker";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  phone: z.string().optional(),
  contact_types: z.array(z.string()).min(1, "Selecione pelo menos um tipo"),
  department: z.string().optional(),
  job_role: z.string().optional(),
  receives_notifications: z.boolean().default(true),
});

type ContactValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  companyId: string;
  contact?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContactForm({ companyId, contact, onSuccess, onCancel }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(contact?.employee_id || null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      contact_types: contact?.contact_types || [],
      department: contact?.department || "",
      job_role: contact?.job_role || "",
      receives_notifications: contact?.receives_notifications ?? true,
    },
  });

  const phoneValue = watch("phone");
  useEffect(() => {
    if (phoneValue) {
        setValue("phone", maskPhone(phoneValue));
    }
  }, [phoneValue, setValue]);

  const handleEmployeeSelect = (emp: any | null) => {
    if (emp) {
      setSelectedEmployeeId(emp.id);
      // Prioriza Nome da Pessoa Física (PF)
      setValue("name", emp.responsible_name || emp.full_name);
      if (emp.email) setValue("email", emp.email);
      if (emp.phone) setValue("phone", emp.phone);
      if (emp.job_role) setValue("job_role", emp.job_role);
    } else {
      setSelectedEmployeeId(null);
    }
  };

  const onSubmit = async (values: ContactValues) => {
    setLoading(true);
    
    try {
        const contactData = { 
            ...values, 
            company_id: companyId,
            employee_id: selectedEmployeeId 
        };

        if (!contact?.id) {
            const { error } = await supabase.from("company_contacts").insert(contactData);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("company_contacts").update(contactData).eq("id", contact.id);
            if (error) throw error;
        }

        // Lógica de Enriquecimento Reverso (v1.5)
        // Se houver um colaborador vinculado, atualizamos o cadastro master dele na PeopleBoard
        if (selectedEmployeeId) {
            await supabase.from("employees").update({
                email: values.email,
                phone: values.phone,
                job_role: values.job_role,
            }).eq("id", selectedEmployeeId);
        }

        onSuccess();
    } catch (error: any) {
        console.error("ContactForm: Error saving contact:", error);
        alert("Erro ao salvar: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6">
        
        {/* Tipo de Contato (Multisseleção) */}
        <div className="space-y-3 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Finalidade do Contato (O que este contato resolve?)
            </Label>
            <ToggleGroup 
                type="multiple" 
                variant="outline" 
                className="flex-wrap justify-start gap-2"
                value={watch("contact_types")}
                onValueChange={(val) => {
                    if (val && val.length > 0) {
                        setValue("contact_types", val);
                    } else {
                        setValue("contact_types", []);
                    }
                }}
            >
                <ToggleGroupItem value="Contas a Pagar" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">CONTAS A PAGAR</ToggleGroupItem>
                <ToggleGroupItem value="Contas a Receber" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">CONTAS A RECEBER</ToggleGroupItem>
                <ToggleGroupItem value="Faturamento" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">FATURAMENTO</ToggleGroupItem>
                <ToggleGroupItem value="Compras" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">COMPRAS</ToggleGroupItem>
                <ToggleGroupItem value="Jurídico" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">JURÍDICO</ToggleGroupItem>
                <ToggleGroupItem value="Licitações" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">LICITAÇÕES</ToggleGroupItem>
                <ToggleGroupItem value="TI" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">TI</ToggleGroupItem>
                <ToggleGroupItem value="Operacional" className="px-3 h-8 text-[10px] font-bold rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">OPERACIONAL</ToggleGroupItem>
            </ToggleGroup>
            {errors.contact_types && <p className="text-xs text-destructive">{errors.contact_types.message}</p>}
        </div>

        {/* Nome com Smart Search */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pessoa Responsável</Label>
            {selectedEmployeeId && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[9px] uppercase px-2 py-0">
                    <UserCheck className="size-3 mr-1" /> Funcionário Vinculado
                </Badge>
            )}
          </div>
          <SmartContactPicker 
            defaultValue={watch("name")}
            onSelect={handleEmployeeSelect}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Departamento Interno</Label>
            <Input {...register("department")} placeholder="Ex: Financeiro" className="rounded-xl border-slate-200" />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo / Função</Label>
            <Input {...register("job_role")} placeholder="Ex: Analista Sênior" className="rounded-xl border-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</Label>
                <Input {...register("email")} type="email" placeholder="email@exemplo.com" className="rounded-xl border-slate-200" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone / WhatsApp</Label>
                <Input {...register("phone")} placeholder="(00) 00000-0000" className="rounded-xl border-slate-200 font-mono" />
            </div>
        </div>

        {/* Checkbox de Notificações */}
        <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                    type="checkbox" 
                    {...register("receives_notifications")} 
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary/20" 
                />
                <span className="text-xs font-bold text-slate-600 group-hover:text-primary transition-colors">Recebe Alertas de Vencimento e Renovação</span>
            </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl px-6">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="rounded-xl px-10 font-bold shadow-lg shadow-primary/20 h-12">
          {loading ? "Processando..." : (contact?.id ? "Atualizar Contato" : "Confirmar Cadastro")}
        </Button>
      </div>
    </form>
  );
}
