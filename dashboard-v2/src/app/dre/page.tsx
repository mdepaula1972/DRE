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
import { DreFilters, DreMetadata, DreCalculatedResult, DreRow, DreSimulationParams } from '@/types/dre';

export default function DrePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState<Record<string, number>>({});
  const [modalSourceRows, setModalSourceRows] = useState<Record<string, DreRow[]>>({});
  
  // Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simParams, setSimParams] = useState<DreSimulationParams>({
    revenueMultiplier: 1.0,
    costsMultiplier: 1.0,
    expensesMultiplier: 1.0
  });

  const [rawData, setRawData] = useState<DreRow[]>([]);
  const [metadata, setMetadata] = useState<DreMetadata | null>(null);
  const [filters, setFilters] = useState<DreFilters>({
    empresas: [],
    periodos: [],
    projetos: [],
    categorias: []
  });

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
    if (rawData.length === 0 || !metadata) return null;
    return DreService.calculate(rawData, metadata, filters);
  }, [rawData, metadata, filters]);

  // Simulated Calculation
  const results: DreCalculatedResult | null = useMemo(() => {
    if (!originalResults) return null;
    if (simParams.revenueMultiplier === 1 && simParams.costsMultiplier === 1 && simParams.expensesMultiplier === 1) {
      return originalResults;
    }
    return DreService.calculate(rawData, metadata, filters, simParams);
  }, [rawData, metadata, filters, simParams, originalResults]);

  // Alertas Inteligentes
  const alerts = useMemo(() => {
    if (!results) return [];
    return DreAlertsService.generateAlerts(results);
  }, [results]);

  const handleExportPDF = () => {
    window.print();
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
        filters={filters}
        onFilterChange={handleFilterChange}
        onFileUpload={handleFileUpload}
        isUploading={isUploading}
        fileName={fileName}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <DreHeader 
              lastUpdate={lastUpdate}
              onExportPDF={handleExportPDF}
              onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
              isPrivacyMode={isPrivacyMode}
              onToggleSimulator={() => setIsSimulatorOpen(!isSimulatorOpen)}
            />

            <div className="space-y-8">
              {/* Simulador */}
              <DreSimulator 
                isOpen={isSimulatorOpen}
                params={simParams}
                onChange={setSimParams}
                onReset={() => setSimParams({ revenueMultiplier: 1, costsMultiplier: 1, expensesMultiplier: 1 })}
                originalResults={originalResults}
                simulatedFcl={results?.kpis.fcl || 0}
              />

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

              {/* Tabela de Operação */}
              {results && (
                <DreTable 
                  results={results} 
                  isPrivacyMode={isPrivacyMode} 
                  onRowClick={handleOpenDetails}
                />
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
      </div>

      <DreDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        mensalData={modalData}
        sourceRows={modalSourceRows}
        isPrivacyMode={isPrivacyMode}
      />
    </main>
  );
}
