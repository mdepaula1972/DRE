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
import { useState } from "react";

const bankSchema = z.object({
  bank_name: z.string().min(1, "Banco é obrigatório"),
  bank_code: z.string().optional(),
  agency: z.string().min(1, "Agência é obrigatória"),
  account: z.string().min(1, "Conta é obrigatória"),
  account_type: z.string().optional(),
  pix_key: z.string().optional(),
  pix_type: z.string().optional(),
});

type BankValues = z.infer<typeof bankSchema>;

export function BankDataForm({ company, onUpdate }: { company: any, onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);
  const bank = company.bank_data?.[0] || {};

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bank_name: bank.bank_name || "",
      bank_code: bank.bank_code || "",
      agency: bank.agency || "",
      account: bank.account || "",
      account_type: bank.account_type || "",
      pix_key: bank.pix_key || "",
      pix_type: bank.pix_type || "",
    },
  });

  const onSubmit = async (values: BankValues) => {
    setLoading(true);
    
    if (!bank.id) {
        await supabase
          .from("company_bank_data")
          .insert({ ...values, company_id: company.id });
    } else {
        await supabase
          .from("company_bank_data")
          .update(values)
          .eq("id", bank.id);
    }

    if (onUpdate) onUpdate();
    setLoading(false);
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Dados Bancários</CardTitle>
        <CardDescription>
          Contas bancárias principais para operações financeiras.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Banco</Label>
              <Input {...register("bank_name")} placeholder="Ex: Itaú, Bradesco..." className="rounded-xl border-slate-200 focus:border-primary/50 font-medium" />
              {errors.bank_name && <p className="text-xs text-destructive">{errors.bank_name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Código (COMPE)</Label>
              <Input {...register("bank_code")} placeholder="Ex: 341, 237..." className="rounded-xl border-slate-200 focus:border-primary/50 font-mono" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agência</Label>
              <Input {...register("agency")} className="rounded-xl border-slate-200 focus:border-primary/50" />
              {errors.agency && <p className="text-xs text-destructive">{errors.agency.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conta</Label>
              <Input {...register("account")} className="rounded-xl border-slate-200 focus:border-primary/50" />
              {errors.account && <p className="text-xs text-destructive">{errors.account.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Conta</Label>
              <Input {...register("account_type")} placeholder="Corrente, Poupança..." className="rounded-xl border-slate-200 focus:border-primary/50" />
            </div>

            <div className="md:col-span-2 pt-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary shrink-0">Chave PIX</span>
                    <div className="h-px w-full bg-slate-100" />
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Chave</Label>
              <Input {...register("pix_type")} placeholder="CNPJ, E-mail, Celular..." className="rounded-xl border-slate-200 focus:border-primary/50" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chave PIX</Label>
              <Input {...register("pix_key")} className="rounded-xl border-slate-200 focus:border-primary/50 font-mono" />
            </div>
          </div>
          <div className="flex justify-end pt-6 border-t border-slate-100">
            <Button 
                type="submit" 
                disabled={loading}
                className="rounded-xl px-10 font-bold shadow-lg shadow-primary/20 h-11"
            >
              {loading ? "Salvando..." : "Salvar Dados Bancários"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
