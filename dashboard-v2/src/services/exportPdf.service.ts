import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import domtoimage from 'dom-to-image-more';
import { DreCalculatedResult } from '@/types/dre';
import { ExportSelections } from '@/components/dre/DreExportModal';

export class ExportPdfService {
  
  static async buildNativePdf(
    results: DreCalculatedResult,
    selections: ExportSelections,
    empresa: string,
    periodo: string,
    aiText?: string
  ): Promise<void> {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 12;
      const contentWidth = pdfWidth - (margin * 2);
      let currentY = margin;

      const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

      // --- 1. CABEÇALHO ---
      pdf.setFillColor(79, 70, 229); // bg-indigo-600
      pdf.rect(0, 0, pdfWidth, 25, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text('Relatório Executivo Financeiro', margin, 15);
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const dateStr = new Date().toLocaleDateString('pt-BR');
      pdf.text(`Contexto: ${empresa} | Período: ${periodo} | Emitido em: ${dateStr}`, margin, 21);
      
      currentY = 32;

      // --- 2. ANÁLISE DE IA (BrisinhAI) ---
      if (selections.includeAiAnalysis && aiText) {
        pdf.setTextColor(15, 23, 42); // slate-900
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Análise Executiva (BrisinhAI)", margin, currentY);
        currentY += 8;

        pdf.setTextColor(71, 85, 105); // slate-600
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        
        const lines = pdf.splitTextToSize(aiText, contentWidth);
        pdf.text(lines, margin, currentY);
        currentY += (lines.length * 5) + 8;
      }

      // --- 3. RESUMO KPIs ---
      if (selections.includeKpis) {
        if (currentY > 250) { pdf.addPage(); currentY = 20; }
        
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Indicadores Chave (KPIs)", margin, currentY);
        currentY += 10;

        const kpiBoxWidth = (contentWidth - 10) / 3;
        const drawKpi = (title: string, value: string, xPos: number, isPositive?: boolean) => {
          pdf.setDrawColor(226, 232, 240); // slate-200
          pdf.setFillColor(248, 250, 252); // slate-50
          pdf.roundedRect(xPos, currentY, kpiBoxWidth, 20, 2, 2, 'FD');
          
          pdf.setTextColor(100, 116, 139); // slate-500
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(title, xPos + 5, currentY + 7);
          
          if (isPositive === true) pdf.setTextColor(16, 185, 129); // emerald-500
          else if (isPositive === false) pdf.setTextColor(244, 63, 94); // rose-500
          else pdf.setTextColor(15, 23, 42); // slate-900
          
          pdf.setFontSize(12);
          pdf.text(value, xPos + 5, currentY + 16);
        };

        drawKpi("Faturamento", formatCurrency(results.totais['Total Entradas Operacionais'] || 0), margin);
        const lucroLiquido = (results.kpis as any).lucroLiquido || results.kpis.resultado || 0;
        drawKpi("Lucro Líquido", formatCurrency(lucroLiquido), margin + kpiBoxWidth + 5, lucroLiquido >= 0);
        drawKpi("FCL (Caixa Livre)", formatCurrency(results.kpis.fcl || 0), margin + (kpiBoxWidth * 2) + 10, (results.kpis.fcl || 0) >= 0);
        
        currentY += 28;
      }

      // --- 4. GRÁFICOS (Captura do Off-screen DOM) ---
      const addChartToPdf = async (elementId: string) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        if (currentY > 180) { pdf.addPage(); currentY = 20; }
        
        const dataUrl = await domtoimage.toPng(el, { quality: 1, bgcolor: '#ffffff', style: { transform: 'scale(1.5)', transformOrigin: 'top left' } });
        const imgProps = pdf.getImageProperties(dataUrl);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'PNG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 10;
      };

      if (selections.includeEvolution) await addChartToPdf('print-chart-evolution');
      if (selections.includeWaterfall) await addChartToPdf('print-chart-waterfall');
      if (selections.includeDonut) await addChartToPdf('print-chart-donut');

      // --- 5. TABELA DRE NATIVA (Vetorizada com autoTable) ---
      if (selections.includeTable) {
        if (currentY > 230) { pdf.addPage(); currentY = 20; }
        
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Detalhamento Completo (DRE)", margin, currentY);
        currentY += 6;

        const tableCols = ["Categoria", ...results.validColumns, "Total"];
        const tableBody: any[] = [];
        const tableStyles: any[] = []; // Guardar indices de linhas em negrito

        let rowIndex = 0;
        results.estrutura.forEach((item) => {
          if ((item as any).id === 'TOTAL_ENTRADAS_SAIDAS') return; // Pula linha em branco
          
          const isSoma = (item.tipo as any) === 'soma' || (item.tipo as any) === 'fcl' || (item.tipo as any) === 'margem';
          const isGrupo = (item.tipo as any) === 'grupo';
          
          const rowData = [item.titulo];
          let rowTotal = 0;
          
          results.validColumns.forEach(col => {
            const val = results.mensal[item.titulo]?.[col] || 0;
            rowTotal += val;
            if ((item.tipo as any) === 'margem') {
              rowData.push(val.toFixed(1) + '%');
            } else {
              rowData.push(formatCurrency(val).replace('R$', '').trim());
            }
          });
          
          if ((item.tipo as any) === 'margem') rowData.push('');
          else rowData.push(formatCurrency(rowTotal).replace('R$', '').trim());

          tableBody.push(rowData);
          
          if (isSoma || isGrupo) {
            tableStyles.push(rowIndex);
          }
          rowIndex++;
        });

        autoTable(pdf, {
          startY: currentY,
          head: [tableCols],
          body: tableBody,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
          didParseCell: (data) => {
            if (data.section === 'body' && tableStyles.includes(data.row.index)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [241, 245, 249]; // slate-100
            }
            if (data.section === 'body' && data.column.index > 0) {
              data.cell.styles.halign = 'right';
            }
          }
        });
      }

      // 6. Download
      const fileName = `DRE_Executivo_${empresa.substring(0,10)}_${dateStr.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error("Erro ao gerar PDF Nativo:", error);
      throw error;
    }
  }

  // Fallback legada (opcional, mantida para segurança)
  static async generateDashboardPdf(elementId: string, empresa: string, periodo: string): Promise<void> {
    // Apenas redirecionar ou deixar mockado
    throw new Error("Use buildNativePdf para gerar o PDF executivo agora.");
  }
}
