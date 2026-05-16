"use client";

import { useState, useEffect } from "react";
import { 
    Plus, 
    Search, 
    Building2, 
    FileText, 
    Users, 
    CheckCircle2, 
    Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { CompanyCard } from "@/modules/companies/components/company-card";
import { useOrg } from "@/hooks/use-org";
import { StatCard } from "@/components/ui/stat-card";
import { motion, AnimatePresence } from "framer-motion";
import { CompanyDetailsModal } from "@/modules/companies/components/company-details-modal";

export default function CompaniesPage() {
  const { currentOrg, isLoading: orgLoading } = useOrg();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Drawer state
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  async function fetchCompanies() {
    if (!currentOrg) return;

    const { data, error } = await supabase
      .from("companies")
      .select(`
        *,
        branding:company_branding(*),
        address:company_addresses(*),
        contacts:company_contacts(*)
      `)
      .eq("organization_id", currentOrg.id)
      .order("legal_name");

    if (error) {
      console.error("CompaniesPage: Error fetching companies:", error);
    }

    if (data) {
      const normalizedData = data.map(company => ({
        ...company,
        branding: Array.isArray(company.branding) ? company.branding[0] : company.branding
      }));
      setCompanies(normalizedData);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!orgLoading) {
      fetchCompanies();
    }
  }, [currentOrg, orgLoading]);

  const handleCompanyClick = (company: any) => {
    console.log("🍊 [DEBUG] Card clicado:", company.legal_name, "ID:", company.id);
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const filteredCompanies = companies.filter(c => 
    c.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tax_id?.includes(searchTerm)
  );

  if (orgLoading || loading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="theme-cockpit min-h-screen bg-background transition-colors duration-500">
      <div className="p-8 max-w-[1600px] mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-slate-900">
              Corporate <span className="text-ember">Profile Hub</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Gestão centralizada de fichas cadastrais, documentos e contatos estratégicos do grupo.
            </p>
          </div>
          
          <Button 
            className="rounded-2xl px-8 h-12 font-bold bg-ember hover:scale-105 transition-all shadow-lg shadow-orange-500/20 text-white border-none"
            onClick={() => {
              setSelectedCompany({ id: "new", legal_name: "", tax_id: "", organization_id: currentOrg?.id });
              setIsDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-5 w-5" /> Nova Empresa
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total de Empresas" 
            value={companies.length.toString()} 
            icon={Building2}
            color="primary"
          />
          <StatCard 
            title="Documentos" 
            value="0" 
            icon={FileText}
            color="info"
          />
          <StatCard 
            title="Contatos" 
            value="0" 
            icon={Users}
            color="warning"
          />
          <StatCard 
            title="Status Ativo" 
            value="100%" 
            icon={CheckCircle2}
            color="success"
          />
        </div>

        {/* Filters and Search */}
        <div className="relative group max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-orange-500" />
          <Input
            placeholder="Buscar empresa, CNPJ ou nome fantasia..."
            className="pl-10 bg-white border-slate-200 text-slate-900 rounded-xl focus-visible:ring-orange-500/20 focus-visible:border-orange-500/40 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Companies Grid */}
        {filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
            <div className="bg-orange-500/10 text-orange-500 p-4 rounded-full">
              <Search size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white font-heading">Nenhuma empresa encontrada</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Não encontramos resultados para "{searchTerm}". Tente outro termo ou limpe os filtros.
              </p>
            </div>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="rounded-xl border-white/10 text-white">
              Limpar Busca
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredCompanies.map((company, index) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  layout
                >
                  <CompanyCard 
                    company={company} 
                    onClick={() => handleCompanyClick(company)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Cockpit Lateral */}
        <CompanyDetailsModal
            company={selectedCompany}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onUpdate={(updatedCompany) => {
              fetchCompanies().then(() => {
                if (updatedCompany) {
                  setSelectedCompany(updatedCompany);
                }
              });
            }}
        />
      </div>
    </div>
  );
}
