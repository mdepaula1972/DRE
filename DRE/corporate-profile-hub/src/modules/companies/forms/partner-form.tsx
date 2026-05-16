"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Building2, 
  Percent, 
  ShieldCheck, 
  ShieldAlert,
  Save,
  X,
  UserPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { maskCPF, maskCNPJ } from "@/lib/masks";
import { FeedbackBadge } from "@/components/ui/feedback-badge";
import { SmartContactPicker } from "../components/smart-contact-picker";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

const partnerSchema = z.object({
  name: z.string().min(1, "Nome/Razão Social é obrigatório"),
  tax_id: z.string().min(11, "Documento inválido"),
  participation_percentage: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  role: z.string().min(1, "Cargo/Função é obrigatória"),
  is_administrator: z.boolean().default(false),
});

type PartnerValues = z.infer<typeof partnerSchema>;

interface PartnerFormProps {
  companyId: string;
  partner?: any;
  maxAllowed: number; // Porcentagem restante disponível
  onSuccess: () => void;
  onCancel: () => void;
}

export function PartnerForm({ companyId, partner, maxAllowed, onSuccess, onCancel }: PartnerFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(partner?.employee_id || null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<PartnerValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: partner?.name || "",
      tax_id: partner?.tax_id || "",
      participation_percentage: partner?.participation_percentage || 0,
      role: partner?.role || "Sócio",
      is_administrator: partner?.is_administrator || false,
    },
  });

  // Inteligência de Máscara (Detecta CPF ou CNPJ)
  const taxIdValue = watch("tax_id");
  useEffect(() => {
    if (taxIdValue) {
      const clean = taxIdValue.replace(/\D/g, "");
      if (clean.length <= 11) {
        setValue("tax_id", maskCPF(taxIdValue));
      } else {
        setValue("tax_id", maskCNPJ(taxIdValue));
      }
    }
  }, [taxIdValue, setValue]);

  const handlePartnerSelect = (emp: any | null) => {
    if (emp) {
      setSelectedEmployeeId(emp.id);
      setValue("name", emp.responsible_name || emp.full_name);
      if (emp.tax_id) setValue("tax_id", emp.tax_id);
    } else {
      setSelectedEmployeeId(null);
    }
  };

  const onSubmit = async (values: PartnerValues) => {
    // Validação Extra: Não ultrapassar o capital restante
    const currentVal = partner?.participation_percentage || 0;
    if (values.participation_percentage > (maxAllowed + currentVal)) {
      alert(`Erro: Esta cota de ${values.participation_percentage}% ultrapassa o capital social restante (${maxAllowed + currentVal}% disponível).`);
      return;
    }

    setLoading(true);
    
    try {
        const partnerData = { 
            ...values, 
            company_id: companyId,
            employee_id: selectedEmployeeId,
            contact_types: ["Sócio"]
        };

        console.log("🍊 [DEBUG] Tentando salvar Sócio:", partnerData);

        if (!partner?.id) {
            const { error } = await supabase.from("company_contacts").insert(partnerData);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("company_contacts").update(partnerData).eq("id", partner.id);
            if (error) throw error;
        }

        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onSuccess();
        }, 1500);
    } catch (error: any) {
        console.error("🍊 [DEBUG] Erro FATAL no Supabase:", error);
        alert("Erro ao salvar sócio: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <form 
        onSubmit={handleSubmit(
            onSubmit, 
            (errors) => console.log("🍊 [DEBUG] Erros de Validação:", errors)
        )} 
        className="space-y-8"
    >
      <div className="grid gap-6">
        
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome / Razão Social (Sócio)</Label>
            {selectedEmployeeId && (
                <div className="flex justify-end mb-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[9px] uppercase px-2 py-0">
                        <UserCheck className="size-3 mr-1" /> Funcionário Vinculado
                    </Badge>
                </div>
            )}
            
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <SmartContactPicker 
                        defaultValue={field.value}
                        onSelect={(emp) => {
                            handlePartnerSelect(emp);
                            field.onChange(emp?.responsible_name || emp?.full_name || "");
                        }}
                        onChange={field.onChange}
                    />
                )}
            />
            {errors.name && <p className="text-xs text-destructive font-medium mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF / CNPJ</Label>
            <Input {...register("tax_id")} placeholder="000.000.000-00" className="rounded-xl border-slate-200 font-mono" />
            {errors.tax_id && <p className="text-xs text-destructive font-medium">{errors.tax_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Participação Societária (%)</Label>
            <div className="relative">
                <Input 
                    {...register("participation_percentage")} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    className="rounded-xl border-slate-200 font-black text-xl h-12 pr-12" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Máximo disponível: <span className="text-primary">{(maxAllowed + (partner?.participation_percentage || 0)).toFixed(2)}%</span>
            </p>
            {errors.participation_percentage && <p className="text-xs text-destructive font-medium">{errors.participation_percentage.message}</p>}
          </div>
        </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo Societário</Label>
            <Controller
                name="role"
                control={control}
                render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="rounded-xl border-slate-200 font-bold bg-slate-50/50">
                            <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Sócio-Administrador">Sócio-Administrador</SelectItem>
                            <SelectItem value="Sócio Quotista">Sócio Quotista</SelectItem>
                            <SelectItem value="Sócio Majoritário">Sócio Majoritário</SelectItem>
                            <SelectItem value="Titular">Titular (Eireli/MEI)</SelectItem>
                            <SelectItem value="Diretor">Diretor</SelectItem>
                            <SelectItem value="Procurador">Procurador</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            />
            {errors.role && <p className="text-xs text-destructive font-medium mt-1">{errors.role.message}</p>}
        </div>

        {/* Sócio Administrador - Custom Toggle */}
        <div 
          onClick={() => setValue("is_administrator", !watch("is_administrator"))}
          className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl transition-all hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-start gap-4">
            <div className={`mt-1 size-10 rounded-2xl flex items-center justify-center transition-colors ${watch("is_administrator") ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"}`}>
                <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
                <Label className="text-sm font-black text-slate-800 cursor-pointer block leading-none">
                    Poderes Administrativos
                </Label>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                    Este sócio possui poderes legais de administração
                </p>
            </div>
          </div>
          
          <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${watch("is_administrator") ? "bg-emerald-500" : "bg-slate-200"}`}>
            <motion.div 
                className="absolute top-1 left-1 size-4 bg-white rounded-full shadow-sm"
                animate={{ x: watch("is_administrator") ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
        <FeedbackBadge show={showSuccess} />
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl px-6 h-12">
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          onClick={() => console.log("🍊 [DEBUG] Clique no botão salvar detectado!")}
          className="rounded-xl px-12 font-bold shadow-lg shadow-primary/20 h-12 bg-primary hover:bg-primary/90"
        >
          {loading ? "Gravando..." : (partner?.id ? "Atualizar Sócio" : "Vincular Sócio")}
        </Button>
      </div>
    </form>
  );
}
