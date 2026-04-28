import React, { useState } from 'react';
import { X, FileText, CheckSquare, Square, BrainCircuit, Download, Loader2 } from 'lucide-react';

export interface ExportSelections {
  includeAiAnalysis: boolean;
  includeKpis: boolean;
  includeEvolution: boolean;
  includeWaterfall: boolean;
  includeDonut: boolean;
  includeTable: boolean;
}

interface DreExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selections: ExportSelections) => void;
  isExporting: boolean;
  isAiAnalyzing: boolean;
}

export function DreExportModal({ isOpen, onClose, onExport, isExporting, isAiAnalyzing }: DreExportModalProps) {
  const [selections, setSelections] = useState<ExportSelections>({
    includeAiAnalysis: true,
    includeKpis: true,
    includeEvolution: true,
    includeWaterfall: true,
    includeDonut: true,
    includeTable: true,
  });

  if (!isOpen) return null;

  const toggleSelection = (key: keyof ExportSelections) => {
    setSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    onExport(selections);
  };

  const isAnySelected = Object.values(selections).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 leading-tight">Configurar Relatório PDF</h3>
              <p className="text-xs text-slate-500 font-medium">Selecione os módulos para impressão</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isExporting || isAiAnalyzing}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-5">
            O sistema irá compilar os dados do período e da empresa selecionados, gerando um documento vetorizado de alta qualidade.
          </p>

          <div className="space-y-3">
            {/* AI Module */}
            <div 
              onClick={() => toggleSelection('includeAiAnalysis')}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                selections.includeAiAnalysis ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className={selections.includeAiAnalysis ? 'text-amber-500' : 'text-slate-300'}>
                {selections.includeAiAnalysis ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Análise Executiva BrisinhAI <BrainCircuit size={16} className="text-amber-500" />
                </p>
                <p className="text-xs text-slate-500">Inteligência Artificial redige os principais pontos focais de gestão financeira baseados nos resultados do período.</p>
              </div>
            </div>

            {/* Other Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selections.includeKpis ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={selections.includeKpis ? 'text-indigo-600' : 'text-slate-300'}>
                  {selections.includeKpis ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className="text-sm font-semibold text-slate-700">Resumo KPIs</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selections.includeTable ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={selections.includeTable ? 'text-indigo-600' : 'text-slate-300'}>
                  {selections.includeTable ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className="text-sm font-semibold text-slate-700">Tabela DRE Nativa</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selections.includeEvolution ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={selections.includeEvolution ? 'text-indigo-600' : 'text-slate-300'}>
                  {selections.includeEvolution ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className="text-sm font-semibold text-slate-700">Gráfico de Evolução</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selections.includeWaterfall ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={selections.includeWaterfall ? 'text-indigo-600' : 'text-slate-300'}>
                  {selections.includeWaterfall ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className="text-sm font-semibold text-slate-700">Gráfico Waterfall</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selections.includeDonut ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className={selections.includeDonut ? 'text-indigo-600' : 'text-slate-300'}>
                  {selections.includeDonut ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>
                <span className="text-sm font-semibold text-slate-700">Composição (Donut)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting || isAiAnalyzing}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleExport}
            disabled={!isAnySelected || isExporting || isAiAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 min-w-[160px] justify-center"
          >
            {isAiAnalyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analisando IA...</>
            ) : isExporting ? (
              <><Loader2 size={16} className="animate-spin" /> Gerando PDF...</>
            ) : (
              <><Download size={16} /> Gerar Relatório</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
