"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileIcon, 
  X, 
  Plus, 
  CloudUpload,
  AlertCircle,
  Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/hooks/use-org";

export function DocumentUpload({ 
  companyId, 
  onSuccess 
}: { 
  companyId: string, 
  onSuccess: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Cartão CNPJ");
  const [validUntil, setValidUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentOrg } = useOrg();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false
  });

  const handleUpload = async () => {
    if (!file || !currentOrg) return;
    setLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentOrg.id}/${companyId}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Register in Database
      const { error: dbError } = await supabase
        .from('company_documents')
        .insert({
          company_id: companyId,
          category,
          name: file.name,
          file_path: filePath,
          content_type: file.type,
          size_bytes: file.size,
          valid_until: validUntil || null,
        });

      if (dbError) throw dbError;

      setOpen(false);
      setFile(null);
      setValidUntil("");
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Erro ao fazer upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" />
          Anexar Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>
            Arraste um PDF ou imagem para vincular a esta empresa.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
              ${file ? 'bg-muted/30 border-primary/50' : 'hover:bg-muted/10'}
            `}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center text-center">
                <FileIcon className="size-10 text-primary mb-2" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 gap-1 h-7 text-xs" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="size-3" />
                  Remover
                </Button>
              </div>
            ) : (
              <>
                <CloudUpload className="size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">
                  {isDragActive ? "Solte o arquivo aqui" : "Clique ou arraste o arquivo"}
                </p>
                <p className="text-xs text-muted-foreground">PDF, JPG ou PNG (max. 10MB)</p>
              </>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Input 
                id="category" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                placeholder="Ex: Contrato Social, Cartão CNPJ..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="validity">Data de Validade (Opcional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input 
                  id="validity" 
                  type="date" 
                  className="pl-9"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="size-3" />
                O sistema gerará alertas 30 dias antes do vencimento.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Processando..." : "Confirmar Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
