"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Banknote, 
  FileText,
  Mail,
  Globe,
  QrCode,
  Download
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

export default function PublicCompanyPage() {
  const { id } = useParams();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublicData() {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          branding:company_branding(*),
          addresses:company_addresses(*),
          contacts:company_contacts(*),
          bank_data:company_bank_data(*)
        `)
        .eq("id", id)
        .single();

      if (!error && data) {
        setCompany(data);
      }
      setLoading(false);
    }

    fetchPublicData();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando perfil público...</div>;
  if (!company) return <div className="flex h-screen items-center justify-center">Empresa não encontrada ou link expirado.</div>;

  const branding = company.branding?.[0] || {};
  const primaryColor = branding.primary_color || "#000000";

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header com Branding Dinâmico */}
      <header className="w-full bg-white border-b shadow-sm" style={{ borderTop: `6px solid ${primaryColor}` }}>
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center gap-6">
          <div 
            className="flex h-24 w-24 items-center justify-center rounded-xl border-2 shadow-sm bg-white"
            style={{ borderColor: `${primaryColor}20` }}
          >
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={company.trade_name} className="h-full w-full object-contain p-2" />
            ) : (
              <Building2 className="size-10" style={{ color: primaryColor }} />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{company.trade_name || company.legal_name}</h1>
            <p className="text-muted-foreground font-medium">{company.tax_id}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">Verificado</Badge>
                <Badge variant="outline" className="capitalize">{company.status}</Badge>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
             <div className="bg-white p-2 rounded-lg border shadow-sm">
                <QRCodeSVG value={window.location.href} size={80} />
             </div>
             <span className="text-[10px] uppercase font-bold text-muted-foreground">Digital Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 grid gap-8 md:grid-cols-3">
        {/* Coluna Esquerda: Info Principal */}
        <div className="md:col-span-2 space-y-8">
            {/* Institucional */}
            <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-muted/50 py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="size-4" style={{ color: primaryColor }} />
                        Dados Institucionais
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                    <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Razão Social</Label>
                        <p className="font-medium text-sm">{company.legal_name}</p>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Regime Tributário</Label>
                        <p className="font-medium text-sm">{company.tax_regime || "Simples Nacional"}</p>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Inscrição Estadual</Label>
                        <p className="font-medium text-sm">{company.state_registration || "-"}</p>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">CNAE Principal</Label>
                        <p className="font-medium text-sm">{company.cnae || "-"}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Endereços */}
            <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-muted/50 py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="size-4" style={{ color: primaryColor }} />
                        Endereço
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {company.addresses?.map((addr: any) => (
                        <div key={addr.id} className="text-sm">
                            <p className="font-medium">{addr.street}, {addr.number} {addr.complement && `- ${addr.complement}`}</p>
                            <p className="text-muted-foreground">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                            <p className="text-muted-foreground">{addr.zip_code}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Dados Bancários */}
            <Card className="border-none shadow-sm">
                <CardHeader className="border-b bg-muted/50 py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Banknote className="size-4" style={{ color: primaryColor }} />
                        Dados para Pagamento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {company.bank_data?.map((bank: any) => (
                        <div key={bank.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-muted/20 border-l-4" style={{ borderLeftColor: primaryColor }}>
                           <div className="space-y-1">
                                <p className="font-bold">{bank.bank_name}</p>
                                <p className="text-xs text-muted-foreground">Ag. {bank.agency} • Conta {bank.account}</p>
                           </div>
                           {bank.pix_key && (
                               <div className="text-right">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Chave PIX ({bank.pix_type})</Label>
                                    <p className="font-mono text-sm select-all">{bank.pix_key}</p>
                               </div>
                           )}
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        {/* Coluna Direita: Contato e Ações */}
        <div className="space-y-8">
            <Card className="border-none shadow-sm overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />
                <CardHeader>
                    <CardTitle className="text-lg">Contactar</CardTitle>
                    <CardDescription>Canais oficiais de atendimento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start gap-3" asChild>
                        <a href={`mailto:${company.contacts?.[0]?.email || 'financeiro@empresa.com'}`}>
                            <Mail className="size-4" />
                            E-mail Financeiro
                        </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3">
                        <Phone className="size-4" />
                        (11) 99999-9999
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3">
                        <Globe className="size-4" />
                        Website Oficial
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden" style={{ backgroundColor: primaryColor }}>
                <CardHeader>
                    <CardTitle className="text-lg">Exportação</CardTitle>
                    <CardDescription className="text-primary-foreground/70">Baixe o PDF oficial desta ficha.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="secondary" className="w-full gap-2">
                        <Download className="size-4" />
                        Download PDF
                    </Button>
                </CardContent>
            </Card>
        </div>
      </main>

      <footer className="text-center py-10 opacity-40">
           <p className="text-xs">Gerado por Corporate Profile Hub • © 2026</p>
      </footer>
    </div>
  );
}

function Label({ className, children }: { className?: string, children: React.ReactNode }) {
    return <span className={`block font-semibold ${className}`}>{children}</span>;
}
