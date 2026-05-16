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
import { useState, useCallback } from "react";
import { useOrg } from "@/hooks/use-org";
import { useDropzone } from "react-dropzone";
import { CloudUpload, Loader2, Image as ImageIcon, X } from "lucide-react";

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida (HEX)"),
  secondary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida (HEX)").optional(),
  accent_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida (HEX)").optional(),
  logo_url: z.string().optional(),
  visual_style: z.string().optional(),
});

type BrandingValues = z.infer<typeof brandingSchema>;

import { FeedbackBadge } from "@/components/ui/feedback-badge";

export function BrandingForm({ 
  company, 
  onUpdate 
}: { 
  company: any, 
  onUpdate?: (updated?: any) => void 
}) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { currentOrg } = useOrg();
  
  const branding = company.branding || {}; 

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primary_color: branding.primary_color || "#F2911B",
      secondary_color: branding.secondary_color || "#262223",
      accent_color: branding.accent_color || "#F2911B",
      logo_url: branding.logo_url || "",
      visual_style: branding.visual_style || "institutional",
    },
  });

  const primaryColor = watch("primary_color");
  const logoUrl = watch("logo_url");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !currentOrg) return;
    
    setUploading(true);
    const file = acceptedFiles[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${company.id}-${Date.now()}.${fileExt}`;
    const filePath = `logos/${currentOrg.id}/${fileName}`;

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('company-branding')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-branding')
        .getPublicUrl(filePath);

      // 3. Update Form State
      setValue("logo_url", publicUrl);
      
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      alert("Erro ao subir logotipo: " + error.message);
    } finally {
      setUploading(false);
    }
  }, [currentOrg, company.id, setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const onSubmit = async (values: BrandingValues) => {
    setLoading(true);
    
    // Garantir que temos um ID válido e não "new" antes de tentar salvar
    if (company.id === 'new') {
      alert("Por favor, primeiro salve os dados institucionais da empresa.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("company_branding")
      .upsert({ 
        ...values, 
        company_id: company.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });

    if (error) {
      console.error("Error saving branding:", error);
      alert("Erro ao salvar: " + error.message);
    } else {
        // Mostrar feedback de sucesso
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        if (onUpdate) onUpdate();
    }

    setLoading(false);
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Identidade Visual</CardTitle>
        <CardDescription>
          Personalize a marca da empresa e como ela aparece no Cockpit.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logotipo da Empresa</Label>
                
                <div 
                  {...getRootProps()} 
                  className={`
                    relative rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 gap-3 cursor-pointer
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50/50'}
                    ${logoUrl ? 'border-slate-100 bg-slate-50/20' : ''}
                  `}
                >
                  <input {...getInputProps()} />
                  
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Enviando...</span>
                    </div>
                  ) : logoUrl ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group/logo">
                        <img 
                          src={logoUrl} 
                          alt="Company Logo" 
                          className="h-20 w-20 object-contain rounded-lg bg-white p-2 shadow-sm" 
                        />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue("logo_url", "");
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover/logo:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Clique ou arraste para trocar</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-full bg-slate-100 text-slate-400 group-hover:text-primary transition-colors">
                        <CloudUpload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-600">Arraste o logotipo aqui</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase">PNG, JPG ou SVG (Max. 2MB)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor Primária (HEX)</Label>
                  <div className="flex gap-3">
                      <Input id="primary_color" {...register("primary_color")} className="font-mono rounded-xl" />
                      <div 
                          className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm shrink-0" 
                          style={{ backgroundColor: primaryColor }}
                      />
                  </div>
                  {errors.primary_color && <p className="text-xs text-destructive">{errors.primary_color.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor Secundária</Label>
                    <Input id="secondary_color" {...register("secondary_color")} className="font-mono rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent_color" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cor Destaque</Label>
                    <Input id="accent_color" {...register("accent_color")} className="font-mono rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section - Modern Cockpit style */}
            <div className="flex flex-col items-center justify-center space-y-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview em Tempo Real</span>
                
                <div 
                    className="w-full max-w-[260px] rounded-2xl shadow-2xl shadow-slate-200/50 bg-white overflow-hidden transition-all duration-300"
                    style={{ borderTop: `4px solid ${primaryColor}` }}
                >
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div 
                            className="p-3 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100" 
                          >
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo Preview" className="h-10 w-10 object-contain" />
                            ) : (
                              <ImageIcon className="h-10 w-10 text-slate-200" />
                            )}
                          </div>
                          <div className="h-5 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2 mt-2">
                          <div className="h-4 w-40 bg-slate-900/10 rounded" />
                          <div className="h-2.5 w-full bg-slate-900/5 rounded" />
                        </div>
                        <div 
                          className="h-10 w-full rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest mt-2"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Visualizar Perfil
                        </div>
                    </div>
                </div>
                
                <div className="text-center max-w-[240px]">
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
                    As alterações de identidade visual refletem instantaneamente no cockpit e na ficha cadastral compartilhada.
                  </p>
                </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
            <FeedbackBadge show={showSuccess} />
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="rounded-xl px-10 font-bold shadow-lg shadow-primary/20 h-11"
            >
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
