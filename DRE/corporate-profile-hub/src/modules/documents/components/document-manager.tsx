"use client";

import { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { DocumentList } from "./document-list";
import { DocumentUpload } from "./document-upload-modal";
import { supabase } from "@/lib/supabase/client";
import { FileText, Loader2 } from "lucide-react";

export function DocumentManager({ companyId }: { companyId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    if (!companyId || companyId === "new") {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("company_documents")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (companyId && companyId !== "new") {
      fetchDocuments();
    } else {
      setDocuments([]);
      setLoading(false);
    }
  }, [companyId]);

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;

    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('company-documents')
      .remove([path]);

    if (storageError) {
        alert("Erro ao excluir arquivo do storage");
        return;
    }

    // 2. Delete from Database
    const { error: dbError } = await supabase
      .from("company_documents")
      .delete()
      .eq("id", id);

    if (!dbError) {
      fetchDocuments();
    }
  };

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .createSignedUrl(path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
        alert("Erro ao gerar link de download");
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Documentos e Anexos
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Repositório central de documentos legais e fiscais.
          </CardDescription>
        </div>
        <DocumentUpload companyId={companyId} onSuccess={fetchDocuments} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-8 animate-spin" />
            <span>Carregando repositório...</span>
          </div>
        ) : (
          <DocumentList 
            documents={documents} 
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        )}
      </CardContent>
    </Card>
  );
}
