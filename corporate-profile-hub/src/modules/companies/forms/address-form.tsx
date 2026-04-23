"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { maskCEP } from "@/lib/masks";
import { Loader2, MapPin } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const addressSchema = z.object({
  type: z.string().min(1, "Tipo é obrigatório"),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "UF é obrigatória"),
  zip_code: z.string().min(8, "CEP inválido"),
});

type AddressValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  companyId: string;
  address?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddressForm({ companyId, address, onSuccess, onCancel }: AddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: address?.type || "Matriz",
      street: address?.street || "",
      number: address?.number || "",
      complement: address?.complement || "",
      neighborhood: address?.neighborhood || "",
      city: address?.city || "",
      state: address?.state || "",
      zip_code: address?.zip_code || "",
    },
  });

  // Watch CEP for masking and autocomplete
  const zipCodeValue = watch("zip_code");
  
  useEffect(() => {
    if (zipCodeValue) {
        const masked = maskCEP(zipCodeValue);
        setValue("zip_code", masked);

        // Se o CEP tiver 9 caracteres (00000-000), busca na API
        const rawCep = zipCodeValue.replace(/\D/g, "");
        if (rawCep.length === 8) {
            handleFetchAddress(rawCep);
        }
    }
  }, [zipCodeValue, setValue]);

  const handleFetchAddress = async (cep: string) => {
    setFetchingCep(true);
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            console.warn("CEP não encontrado");
            return;
        }

        // Preencher campos automaticamente
        if (data.logradouro) setValue("street", data.logradouro);
        if (data.bairro) setValue("neighborhood", data.bairro);
        if (data.localidade) setValue("city", data.localidade);
        if (data.uf) setValue("state", data.uf);
        
    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
    } finally {
        setFetchingCep(false);
    }
  };

  const onSubmit = async (values: AddressValues) => {
    setLoading(true);
    
    try {
        const addressData = { 
            ...values, 
            company_id: companyId 
        };

        if (!address?.id) {
            const { error } = await supabase
              .from("company_addresses")
              .insert(addressData);
            if (error) throw error;
        } else {
            const { error } = await supabase
              .from("company_addresses")
              .update(addressData)
              .eq("id", address.id);
            if (error) throw error;
        }

        onSuccess();
    } catch (error: any) {
        console.error("AddressForm: Error saving address:", error);
        alert("Erro ao salvar endereço: " + (error.message || "Erro desconhecido"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6">
          {/* Tipo de Endereço */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Localidade</Label>
            <Select value={watch("type")} onValueChange={(val) => setValue("type", val)}>
              <SelectTrigger className="rounded-xl border-slate-200 font-bold bg-slate-50/50">
                  <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="Matriz">Matriz / Sede Principal</SelectItem>
                  <SelectItem value="Filial">Unidade / Filial</SelectItem>
                  <SelectItem value="Operacional">Base Operacional</SelectItem>
                  <SelectItem value="Cobrança">Endereço de Cobrança</SelectItem>
                  <SelectItem value="Entrega">Logística / Entrega</SelectItem>
                  <SelectItem value="Outros">Outros / Correspondência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CEP em destaque no topo */}
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CEP (Inicie por aqui)</Label>
              <div className="relative">
                <Input 
                    {...register("zip_code")} 
                    placeholder="00000-000"
                    className="rounded-xl border-slate-200 focus:border-primary/50 font-mono text-lg h-12" 
                />
                {fetchingCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-primary size-5" />
                    </div>
                )}
              </div>
              {errors.zip_code && <p className="text-xs text-destructive">{errors.zip_code.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logradouro / Rua</Label>
              <Input {...register("street")} placeholder="Aguardando CEP..." className="rounded-xl border-slate-200 focus:border-primary/50 font-medium" />
              {errors.street && <p className="text-xs text-destructive">{errors.street.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número</Label>
              <Input {...register("number")} className="rounded-xl border-slate-200 focus:border-primary/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complemento</Label>
              <Input {...register("complement")} className="rounded-xl border-slate-200 focus:border-primary/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bairro</Label>
              <Input {...register("neighborhood")} className="rounded-xl border-slate-200 focus:border-primary/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade</Label>
              <Input {...register("city")} className="rounded-xl border-slate-200 focus:border-primary/50" />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
            
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado (UF)</Label>
              <Input {...register("state")} maxLength={2} className="rounded-xl border-slate-200 focus:border-primary/50 uppercase font-bold" />
              {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl px-6">
              Cancelar
            </Button>
            <Button 
                type="submit" 
                disabled={loading || fetchingCep}
                className="rounded-xl px-10 font-bold shadow-lg shadow-primary/20 h-11 transition-all active:scale-95"
            >
              {loading ? "Salvando..." : (address?.id ? "Atualizar Endereço" : "Confirmar Cadastro")}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
