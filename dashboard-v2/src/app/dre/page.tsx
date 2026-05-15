"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { DreSidebar } from '@/components/dre/DreSidebar';
import { DreHeader } from '@/components/dre/DreHeader';
import { DreKpiCards } from '@/components/dre/DreKpiCards';
import { DreCharts } from '@/components/dre/DreCharts';
import { DreTable } from '@/components/dre/DreTable';
import { DreDetailsModal } from '@/components/dre/DreDetailsModal';
import { SmartAlerts } from '@/components/dre/SmartAlerts';
import { DreSimulator } from '@/components/dre/DreSimulator';
import { DreService } from '@/services/dre.service';
import { DreAlertsService } from '@/services/dre-alerts.service';
import { ExportPdfService } from '@/services/exportPdf.service';
import { BrisinhaiService } from '@/services/brisinhai.service';
import { DreFilters, DreMetadata, DreCalculatedResult, DreRow, DreSimulationParams, DreStructureItem, DreTemplateDefinition } from '@/types/dre';
import { DreExportModal, ExportSelections } from '@/components/dre/DreExportModal';
import { DrePrintCharts } from '@/components/dre/DrePrintCharts';
import { TableIcon, ChevronDown, ChevronUp } from 'lucide-react';

export default function DrePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState<Record<string, number>>({});
  const [modalSourceRows, setModalSourceRows] = useState<Record<string, DreRow[]>>({});

  // Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [simParams, setSimParams] = useState<DreSimulationParams>({
    revenueMultiplier: 1.0,
    costsMultiplier: 1.0,
    expensesMultiplier: 1.0
  });

  const [rawData, setRawData] = useState<DreRow[]>([]);
  const [metadata, setMetadata] = useState<DreMetadata | null>(null);
  const [estrutura, setEstrutura] = useState<DreStructureItem[] | null>(null);
  const [filters, setFilters] = useState<DreFilters>({
    empresas: [],
    periodos: [],
    projetos: [],
    categorias: []
  });

  // Load JSON Template on mount
  React.useEffect(() => {
    fetch('/templates/dre-padrao.json')
      .then(res => res.json())
      .then((data: DreTemplateDefinition) => {
        setEstrutura(data.estrutura);
      })
      .catch(err => console.error("Erro ao carregar template DRE:", err));
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      setFileName(file.name);

      // Layer 1: Parse
      const parsed = await DreService.parseCSV(file);

      // Layer 2: Normalize
      const { data, metadata: newMetadata } = DreService.normalizeData(parsed);

      if (data.length === 0) {
        alert("Nenhuma linha válida encontrada no CSV.");
        return;
      }

      setRawData(data);
      setMetadata(newMetadata);

      // Reset filters when a new file is uploaded
      setFilters({
        empresas: [],
        periodos: [],
        projetos: [],
        categorias: []
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error: any) {
      alert("Erro ao processar arquivo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilterChange = useCallback((newFilters: DreFilters) => {
    setFilters(newFilters);
  }, []);

  // Base Calculation (No Simulation)
  const originalResults: DreCalculatedResult | null = useMemo(() => {
    if (rawData.length === 0 || !metadata || !estrutura) return null;
    return DreService.calculate(rawData, metadata, estrutura, filters);
  }, [rawData, metadata, estrutura, filters]);

  // Simulated Calculation
  const results: DreCalculatedResult | null = useMemo(() => {
    if (!originalResults || !estrutura) return null;
    if (simParams.revenueMultiplier === 1 && simParams.costsMultiplier === 1 && simParams.expensesMultiplier === 1) {
      return originalResults;
    }
    return DreService.calculate(rawData, metadata!, estrutura, filters, simParams);
  }, [rawData, metadata, estrutura, filters, simParams, originalResults]);

  // Alertas Inteligentes
  const alerts = useMemo(() => {
    if (!results) return [];
    return DreAlertsService.generateAlerts(results);
  }, [results]);

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async (selections: ExportSelections) => {
    setIsExportingPdf(true);

    let aiText: string | undefined;

    const empresa = filters.empresas.length === 1 ? filters.empresas[0] : (filters.empresas.length > 1 ? "Varias" : "Global");
    const periodo = filters.periodos.length > 0 ? `${filters.periodos[0]}...` : "Completo";

    // Se marcou IA, gerar análise
    if (selections.includeAiAnalysis && results) {
      setIsAiAnalyzing(true);
      try {
        aiText = await BrisinhaiService.analyzeDre(results, empresa, periodo);
      } catch (err) {
        console.error("Erro na IA:", err);
      } finally {
        setIsAiAnalyzing(false);
      }
    }

    try {
      // Chamada para o NOVO gerador nativo
      await ExportPdfService.buildNativePdf(results!, selections, empresa, periodo, aiText);

      setIsExportModalOpen(false);
    } catch (error: any) {
      alert("Falha ao gerar o PDF. Erro: " + (error?.message || String(error)));
      console.error(error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenDetails = (title: string) => {
    if (!results) return;
    const itemData = results.mensal[title] || {};
    const itemSource = results.sourceRows?.[title] || {};
    setModalTitle(title);
    setModalData(itemData);
    setModalSourceRows(itemSource);
    setIsModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixa */}
      <DreSidebar
        metadata={metadata}
        rawData={rawData}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        fileName={fileName}
      />

      {/* Conteúdo Principal + Painel Direito */}
      <div className="flex-1 flex overflow-hidden">

        {/* Coluna Central: Dashboard */}
        <div id="dre-dashboard-content" className={`flex-1 overflow-y-auto p-6 md:p-8 transition-all duration-300 ${isExportingPdf ? 'opacity-50' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <DreHeader
              lastUpdate={lastUpdate}
              onExportPDF={handleOpenExportModal}
              onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
              isPrivacyMode={isPrivacyMode}
              onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
            />

            <div className="space-y-8 mt-8">
              {/* Alertas Inteligentes */}
              <SmartAlerts alerts={alerts} />

              {/* Leitura Rápida */}
              <DreKpiCards
                results={results}
                isPrivacyMode={isPrivacyMode}
                onCardClick={handleOpenDetails}
              />

              {/* Análise Visual (Gráficos) */}
              {results && (
                <DreCharts
                  results={results}
                  isPrivacyMode={isPrivacyMode}
                />
              )}

              {/* Tabela de Operação - Oculta por padrão */}
              {results && (
                <div>
                  <button
                    onClick={() => setShowTable(!showTable)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
                      <TableIcon size={16} className="text-amber-500" />
                      Detalhamento Completo (Tabela DRE)
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
                      {showTable ? <><ChevronUp size={15} /> Ocultar</> : <><ChevronDown size={15} /> Exibir</>}
                    </div>
                  </button>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showTable ? 'max-h-[9999px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                    }`}>
                    <DreTable
                      results={results}
                      isPrivacyMode={isPrivacyMode}
                      onRowClick={handleOpenDetails}
                    />
                  </div>
                </div>
              )}

              {!results && !isUploading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <p className="text-slate-500 font-medium mb-2">Aguardando dados</p>
                  <p className="text-sm text-slate-400">Envie um arquivo CSV pelo menu lateral para visualizar o DRE.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita: Simulador (Side Panel Persistente) */}
        {isSimulatorOpen && (
          <div className="w-full md:w-[450px] flex-shrink-0 border-l border-slate-200 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] h-screen overflow-hidden animate-in slide-in-from-right duration-300 z-40">
            <DreSimulator
              isOpen={isSimulatorOpen}
              onClose={() => setIsSimulatorOpen(false)}
              params={simParams}
              onChange={setSimParams}
              onReset={() => setSimParams({ revenueMultiplier: 1, costsMultiplier: 1, expensesMultiplier: 1 })}
              originalResults={originalResults}
              simulatedFcl={results?.kpis.fcl || 0}
              empresaContext={filters.empresas.length === 1 ? filters.empresas[0] : (filters.empresas.length > 1 ? "Múltiplas" : "Todas as Empresas")}
            />
          </div>
        )}
      </div>

      <DreDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        mensalData={modalData}
        sourceRows={modalSourceRows}
        isPrivacyMode={isPrivacyMode}
      />

      <DreExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleConfirmExport}
        isExporting={isExportingPdf}
        isAiAnalyzing={isAiAnalyzing}
      />

      {/* Off-screen renderer for high-quality PDF charts */}
      {results && (
        <DrePrintCharts
          results={results}
          selections={{
            includeEvolution: true,
            includeWaterfall: true,
            includeDonut: true,
            includeAiAnalysis: false,
            includeKpis: false,
            includeTable: false
          }}
        />
      )}
    </main>
  );
}
