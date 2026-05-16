"use client";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileIcon, 
  Download, 
  Trash2, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: string;
  name: string;
  category: string;
  valid_until: string | null;
  status: 'valid' | 'expiring' | 'expired';
  file_path: string;
}

export function DocumentList({ 
  documents, 
  onDelete, 
  onDownload 
}: { 
  documents: Document[], 
  onDelete: (id: string, path: string) => void,
  onDownload: (path: string) => void
}) {
  
  const getStatusBadge = (doc: Document) => {
    if (!doc.valid_until) return <Badge variant="secondary">Permanente</Badge>;
    
    const expiryDate = new Date(doc.valid_until);
    const today = new Date();
    const warningPeriod = addDays(today, 30);

    if (isBefore(expiryDate, today)) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="size-3" />
          Vencido
        </Badge>
      );
    }

    if (isBefore(expiryDate, warningPeriod)) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1">
          <Clock className="size-3" />
          Vence em breve
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
        <CheckCircle2 className="size-3" />
        Válido
      </Badge>
    );
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="border-slate-100 hover:bg-transparent">
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-4 px-6">Documento</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-4 px-6">Categoria</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-4 px-6">Validade</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-4 px-6">Status</TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 py-4 px-6">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <TableRow key={doc.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                <TableCell className="py-4 px-6 font-bold text-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                      <FileIcon className="size-4" />
                    </div>
                    <span>{doc.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <Badge variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-200 text-slate-500 tracking-tighter shadow-sm">
                    {doc.category}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 px-6">
                  {doc.valid_until ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Calendar className="size-3 text-primary opacity-60" />
                      {format(new Date(doc.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  ) : (
                    <span className="text-slate-300 font-bold uppercase text-[9px] tracking-widest">Permanente</span>
                  )}
                </TableCell>
                <TableCell className="py-4 px-6">{getStatusBadge(doc)}</TableCell>
                <TableCell className="py-4 px-6 text-right space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-8 text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                    onClick={() => onDownload(doc.file_path)}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all border-none"
                    onClick={() => onDelete(doc.id, doc.file_path)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-48 text-center p-0">
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                   <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                      <FileIcon className="size-8" />
                   </div>
                   <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum documento anexado ainda</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
