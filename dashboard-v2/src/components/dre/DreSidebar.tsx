import React from 'react';
import Image from 'next/image';
import { UploadCloud, Filter, XCircle } from 'lucide-react';
import { DreFilters, DreMetadata } from '@/types/dre';

interface DreSidebarProps {
  metadata: DreMetadata | null;
  filters: DreFilters;
  onFilterChange: (filters: DreFilters) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  fileName: string | null;
}

export function DreSidebar({ 
  metadata, 
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
    onFilterChange({
      empresas: [],
      periodos: [],
      projetos: [],
      categorias: []
    });
  };

  const toggleFilter = (key: keyof DreFilters, value: string) => {
    const current = filters[key];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    
    onFilterChange({ ...filters, [key]: updated });
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
                  const opts = Array.from(e.target.selectedOptions, option => option.value);
                  onFilterChange({ ...filters, empresas: opts });
                }}
              >
                {metadata.empresas.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Segure Ctrl/Cmd para múltipla seleção</p>
            </div>

            {/* Projeto */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Projeto</label>
              <select 
                multiple
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.projetos}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, option => option.value);
                  onFilterChange({ ...filters, projetos: opts });
                }}
              >
                {metadata.projetos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Segure Ctrl/Cmd para múltipla seleção</p>
            </div>
            
            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Categoria</label>
              <select 
                multiple
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2 h-32 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                value={filters.categorias}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, option => option.value);
                  onFilterChange({ ...filters, categorias: opts });
                }}
              >
                {metadata.categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Segure Ctrl/Cmd para múltipla seleção</p>
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
