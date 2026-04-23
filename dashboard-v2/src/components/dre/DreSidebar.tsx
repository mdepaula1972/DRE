import React, { useMemo } from 'react';
import Image from 'next/image';
import { UploadCloud, Filter, XCircle } from 'lucide-react';
import { DreFilters, DreMetadata, DreRow } from '@/types/dre';

interface DreSidebarProps {
  metadata: DreMetadata | null;
  rawData: DreRow[];
  filters: DreFilters;
  onFilterChange: (filters: DreFilters) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  fileName: string | null;
}

export function DreSidebar({ 
  metadata, 
  rawData,
  filters, 
  onFilterChange, 
  onFileUpload, 
  isUploading,
  fileName
}: DreSidebarProps) {
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleClearFilters = () => {
    onFilterChange({ empresas: [], periodos: [], projetos: [], categorias: [] });
  };

  // ── Cascading Filter Options ──────────────────────────────────────────────
  // Periods: always all (no dependency)
  const availablePeriods = metadata?.periodos ?? [];

  // Empresas: always all
  const availableEmpresas = metadata?.empresas ?? [];

  // Filter raw rows by selected empresas + periodos
  const rowsAfterEmpresaPeriodo = useMemo(() => {
    if (!rawData.length || !metadata) return rawData;
    return rawData.filter(row => {
      const empresaOk = filters.empresas.length === 0 || filters.empresas.includes(row.Empresa);
      if (!empresaOk) return false;
      if (filters.periodos.length === 0) return true;
      // Row has any value in any of the selected period columns
      const periodCols = Object.keys(metadata.mapaMeses).filter(col => {
        const mes = metadata.mapaMeses[col];
        const ano = col.split('/')[1]?.trim();
        return filters.periodos.includes(`${mes}/${ano}`);
      });
      return periodCols.some(col => {
        const v = parseFloat((row[col] as string)?.toString().replace(',', '.') || '0');
        return !isNaN(v) && v !== 0;
      });
    });
  }, [rawData, filters.empresas, filters.periodos, metadata]);

  // Available projects = unique Projeto from rows after empresa+periodo filter
  const availableProjetos = useMemo(() =>
    Array.from(new Set(rowsAfterEmpresaPeriodo.map(r => r.Projeto).filter(Boolean))).sort() as string[]
  , [rowsAfterEmpresaPeriodo]);

  // Filter rows further by selected projetos
  const rowsAfterProjeto = useMemo(() => {
    if (filters.projetos.length === 0) return rowsAfterEmpresaPeriodo;
    return rowsAfterEmpresaPeriodo.filter(r => filters.projetos.includes(r.Projeto));
  }, [rowsAfterEmpresaPeriodo, filters.projetos]);

  // Available categories = unique Categoria from rows after empresa+periodo+projeto filter
  const availableCategorias = useMemo(() =>
    Array.from(new Set(rowsAfterProjeto.map(r => r.Categoria).filter(Boolean))).sort() as string[]
  , [rowsAfterProjeto]);

  // Auto-clean stale selections when options shrink
  const handleEmpresaChange = (opts: string[]) => {
    const newProjetos = filters.projetos.filter(p => {
      // Keep only projects still valid in new empresa set
      const tempRows = rawData.filter(r => opts.length === 0 || opts.includes(r.Empresa));
      return tempRows.some(r => r.Projeto === p);
    });
    const newCategorias = filters.categorias.filter(c => {
      const tempRows = rawData.filter(r => opts.length === 0 || opts.includes(r.Empresa));
      return tempRows.some(r => r.Categoria === c);
    });
    onFilterChange({ ...filters, empresas: opts, projetos: newProjetos, categorias: newCategorias });
  };

  const handleProjetoChange = (opts: string[]) => {
    const newCategorias = filters.categorias.filter(c =>
      rowsAfterEmpresaPeriodo.filter(r => opts.length === 0 || opts.includes(r.Projeto)).some(r => r.Categoria === c)
    );
    onFilterChange({ ...filters, projetos: opts, categorias: newCategorias });
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] p-5 flex flex-col rounded-2xl shadow-xl">
      {/* Logo Area (Monetization / White-label) */}
      <div className="mb-8 flex flex-col items-center justify-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
        {/* Usando o logo nativo da pasta public da Mar Brasil */}
        <div className="relative w-32 h-12 mb-2">
          <Image 
            src="/mar-brasil-logo.png" 
            alt="Logo Empresa" 
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="flex flex-col text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">DRE Analítico V1</span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UploadCloud size={16} className="text-amber-500" />
          Ingestão de Dados
        </h3>
        
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer hover:bg-slate-800 transition-colors group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud size={28} className="text-slate-500 mb-2 group-hover:text-amber-500 transition-colors" />
            <p className="mb-1 text-sm text-slate-400 group-hover:text-slate-300">
              <span className="font-semibold">Clique para enviar</span> ou arraste
            </p>
            <p className="text-xs text-slate-500">CSV apenas</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        {fileName && (
          <div className="mt-3 text-xs text-amber-400 bg-amber-400/10 p-2 rounded-lg text-center break-words">
            {isUploading ? "Processando..." : `Carregado: ${fileName}`}
          </div>
        )}
      </div>

      <hr className="border-slate-800 mb-8" />

      {/* Filters Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Filter size={16} className="text-amber-500" />
            Filtros
          </h3>
          <button 
            onClick={handleClearFilters}
            className="text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <XCircle size={12} /> Limpar
          </button>
        </div>

        {!metadata ? (
          <div className="text-sm text-slate-500 text-center py-10">
            Carregue um arquivo para habilitar os filtros.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Periodos */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Período</label>
              <select 
                multiple 
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.periodos}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, option => option.value);
                  onFilterChange({ ...filters, periodos: opts });
                }}
              >
                {metadata.periodos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Segure Ctrl/Cmd para múltipla seleção</p>
            </div>

            {/* Empresa */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Empresa</label>
              <select 
                multiple
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.empresas}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, o => o.value);
                  handleEmpresaChange(opts);
                }}
              >
                {availableEmpresas.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Segure Ctrl/Cmd para múltipla seleção</p>
            </div>

            {/* Projeto */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Projeto
                {(filters.empresas.length > 0 || filters.periodos.length > 0) && (
                  <span className="ml-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wide">filtrado</span>
                )}
              </label>
              <select 
                multiple
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.projetos}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, o => o.value);
                  handleProjetoChange(opts);
                }}
              >
                {availableProjetos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">{availableProjetos.length} projeto(s) disponível(eis)</p>
            </div>
            
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Categoria
                {(filters.empresas.length > 0 || filters.periodos.length > 0 || filters.projetos.length > 0) && (
                  <span className="ml-1.5 text-amber-500 text-[9px] font-bold uppercase tracking-wide">filtrado</span>
                )}
              </label>
              <select 
                multiple
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.categorias}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, o => o.value);
                  onFilterChange({ ...filters, categorias: opts });
                }}
              >
                {availableCategorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">{availableCategorias.length} categoria(s) disponível(eis)</p>
            </div>

            {/* Botão Limpar Filtros Destaque */}
            {(filters.empresas.length > 0 || filters.periodos.length > 0 || filters.projetos.length > 0 || filters.categorias.length > 0) && (
              <button
                onClick={handleClearFilters}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-semibold py-3 px-4 rounded-xl mt-8 transition-colors flex items-center justify-center gap-2 border border-slate-700/50 hover:border-slate-600 group"
              >
                <XCircle size={16} className="text-amber-500 group-hover:text-amber-400" />
                Limpar Todos os Filtros
              </button>
            )}

          </div>
        )}
      </div>
    </aside>
  );
}
