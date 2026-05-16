"use client";

import { useOrg } from "@/hooks/use-org";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { CompanyTabsHub } from "@/modules/companies/components/company-tabs-hub";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Share2, Printer, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { currentOrg } = useOrg();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("companies")
      .select(`
        *,
        branding:company_branding(*)
      `)
      .eq("id", id)
      .single();

    if (!error && data) {
      setCompany(data);
    } else {
        // router.push("/");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const brandColor = company?.branding?.[0]?.primary_color || "#000000";

  return (
    <div className="space-y-6">
      {/* Header com Branding */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div 
            className="flex h-16 w-16 items-center justify-center rounded-lg border text-xl font-bold"
            style={{ backgroundColor: `${brandColor}10`, color: brandColor, borderColor: `${brandColor}30` }}
          >
            {company?.branding?.[0]?.logo_url ? (
                <img src={company.branding[0].logo_url} alt={company.trade_name} className="h-full w-full object-contain p-2" />
            ) : (
                (company?.trade_name || company?.legal_name || "??").substring(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {company?.trade_name || company?.legal_name}
              </h2>
              <Badge variant={company?.status === "active" ? "secondary" : "outline"}>
                {company?.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{company?.tax_id} • {company?.legal_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="size-4" />
            QR Code
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="size-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
             <Link href={`/public/${id}`} target="_blank">
                <Share2 className="size-4" />
                Link Público
             </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Hub */}
      <CompanyTabsHub company={company} onUpdate={fetchCompany} />
    </div>
  );
}
