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
import { useRouter } from "next/navigation";
import { useOrg } from "@/hooks/use-org";

const newCompanySchema = z.object({
  legal_name: z.string().min(1, "Razão Social é obrigatória"),
  tax_id: z.string().min(14, "CNPJ inválido (mínimo 14 caracteres)"),
  slug: z.string().min(3, "Slug deve ter pelo menos 3 caracteres"),
});

type NewCompanyValues = z.infer<typeof newCompanySchema>;

export function NewCompanyForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { currentOrg } = useOrg();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<NewCompanyValues>({
    resolver: zodResolver(newCompanySchema),
  });

  const handleLegalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("slug", val.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, ""));
  };

  const onSubmit = async (values: NewCompanyValues) => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);

    try {
      // Create Company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          ...values,
          organization_id: currentOrg.id,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Initialize Branding
      await supabase
        .from("company_branding")
        .insert({
          company_id: company.id,
          primary_color: "#000000",
        });

      router.push(`/companies/${company.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Nova Empresa</CardTitle>
        <CardDescription>
          Inicie o cadastro de uma nova empresa no hub corporativo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Razão Social</Label>
            <Input 
                id="legal_name" 
                placeholder="Ex: Mar Brasil Serviços Marítimos Ltda" 
                {...register("legal_name")} 
                onChange={(e) => {
                    handleLegalNameChange(e);
                    register("legal_name").onChange(e);
                }}
            />
            {errors.legal_name && <p className="text-xs text-destructive">{errors.legal_name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tax_id">CNPJ</Label>
            <Input id="tax_id" placeholder="00.000.000/0000-00" {...register("tax_id")} />
            {errors.tax_id && <p className="text-xs text-destructive">{errors.tax_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Link Único (Slug)</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted p-2 rounded border">
                <span>hub.corp/public/</span>
                <input 
                    className="bg-transparent border-none outline-none text-foreground font-medium flex-1"
                    {...register("slug")} 
                />
            </div>
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded">
                {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => router.back()} type="button">
                Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Empresa"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
