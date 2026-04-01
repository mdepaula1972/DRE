import { jsPDF } from "jspdf";
import { TIMBRADO_B64 } from "../lib/timbrado_base64";
import { Employee } from "../types/loans";
import { supabase } from "@/lib/supabase";

export class PDFService {
  static async generateDebtTermPDF(loanData: any, emp: any, isTestMode: boolean = false) {
    const amount = loanData.amount || loanData.value || 0;
    
    if (!loanData || !amount) {
      alert("Este colaborador não possui empréstimo registrado para gerar o termo.");
      return;
    }

    let fullEmpDetails = { ...emp };
    try {
        const table = isTestMode ? 'employees_test' : 'employees';
        const empId = loanData.employee_id || emp.id;
        if (empId) {
            const { data } = await supabase.from(table).select('*').eq('id', empId).single();
            if (data) {
                fullEmpDetails = { ...fullEmpDetails, ...data };
            }
        }
    } catch(err) {
        console.warn("Aviso ao resgatar detalhes da pessoa", err);
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    
    const reqAmount = parseFloat(String(amount).replace(',', '.')) || 0;
    const reqInstallments = parseInt(loanData.installments) || 1;
    const installmentValue = reqAmount / reqInstallments;

    const fullAddress = `${fullEmpDetails.street || ''}, ${fullEmpDetails.number || ''}, ${fullEmpDetails.neighborhood || ''}, ${fullEmpDetails.city || ''} - ${fullEmpDetails.state || ''}, CEP: ${fullEmpDetails.zip_code || ''}`.replace(/^(, )+|undefined/g, '').trim();

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dStr: string) => {
        if (!dStr) return '---';
        const [y, m, d] = dStr.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    };

    try {
      const timbrado = TIMBRADO_B64;
      if (!timbrado) throw new Error("Base64 do timbrado não carregado.");

      const addPageWithTimbrado = () => {
        doc.addImage(timbrado, 'JPEG', 0, 0, 210, 297);
      };

      addPageWithTimbrado();

      const margin = 20;
      const pageWidth = 210;
      const contentWidth = pageWidth - (margin * 2) - 10;
      let cursorY = 35;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("TERMO DE CONFISSÃO DE DÍVIDA", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 15;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const addJustifiedText = (text: string) => {
        const paragraphs = text.split('\n');
        for (const p of paragraphs) {
          if (!p.trim()) {
            cursorY += 5;
            continue;
          }
          const lines = doc.splitTextToSize(p, contentWidth);
          lines.forEach((line: string, index: number) => {
            if (cursorY > 260) {
              doc.addPage();
              addPageWithTimbrado();
              cursorY = 55;
            }
            if (index === lines.length - 1) {
              doc.text(line, margin, cursorY);
            } else {
              doc.text(line, margin, cursorY, { align: 'justify', maxWidth: contentWidth });
            }
            cursorY += 6;
          });
          cursorY += 2;
        }
      };

      const rawCycle = loanData.start_cycle || loanData.startDate || today.toISOString();
      const startCycleMonth = rawCycle.length <= 7 ? rawCycle + '-10' : rawCycle;
      const reqDate = loanData.request_date || loanData.requestDate || loanData.created_at || today.toISOString();
      
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      
      const corpoTexto = `DEVEDOR: ${fullEmpDetails.employment_type === 'PJ' ? fullEmpDetails.corporate_name : fullEmpDetails.full_name}, ${fullEmpDetails.employment_type === 'PJ' ? 'pessoa jurídica de direito privado' : 'pessoa física'}, inscrito no ${fullEmpDetails.pj_type || 'CPF'} sob o n.º ${fullEmpDetails.document_id || ''}, estabelecido na ${fullAddress}, neste ato representada por ${fullEmpDetails.responsible_name || fullEmpDetails.full_name}, inscrito no CPF sob o n.º ${fullEmpDetails.responsible_cpf || fullEmpDetails.document_id || ''} e RG n.º ${fullEmpDetails.responsible_rg || fullEmpDetails.document_rg || '---'}.

CREDOR: MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 02.233.923/0001-19, com sede em Rua Tupi, nº 782, Vila Tupi, Praia Grande - SP, neste ato representada por sua sócia administradora, a Sra. Priscilla Coelho Monteiro, brasileira, casada, empresária, inscrita no CPF sob n.º 320.421.118-56.

As partes acima qualificadas, por este instrumento particular e na melhor forma de direito, confessam e assumem como líquida e certa a dívida a seguir descrita, sujeitando-se às cláusulas e condições que se seguem:

CLÁUSULA PRIMEIRA – DO OBJETO DA DÍVIDA
1.1. O(A) DEVEDOR(A) confessa e declara dever ao(à) CREDOR(A) a importância líquida, certa e exigível de ${fmt(reqAmount)}, referente ao empréstimo concedido pela MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA. ao(à) DEVEDOR(A) em ${formatDate(reqDate)}.

CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO
2.1. O valor confessado na Cláusula Primeira será quitado pelo(a) DEVEDOR(A) por meio de descontos nas futuras notas fiscais de prestação de serviços emitidas à MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., em ${reqInstallments} parcelas mensais e sucessivas, no valor de ${fmt(installmentValue)} cada uma, no dia 10 de cada mês, a partir de ${formatDate(startCycleMonth)}.

2.2. O ciclo de referência desta confissão é ${monthNames[today.getMonth()]} de ${today.getFullYear()}. Os descontos serão aplicados automaticamente pela CREDORA no momento do processamento das notas fiscais, e o valor líquido a ser pago ao(à) DEVEDOR(A) será o resultado da nota fiscal menos o valor da parcela do empréstimo.

CLÁUSULA TERCEIRA – DA INADIMPLÊNCIA
3.1. O não pagamento de qualquer parcela na data estipulada, implicará no vencimento antecipado de todo o saldo devedor, que se tornará imediatamente exigível pela CREDORA.
3.2. Em caso de inadimplência, sobre o saldo devedor vencido e não pago incidirão: a) Multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso ou sobre o saldo devedor em caso de vencimento antecipado. b) Juros de mora de 1% (um por cento) ao mês, calculados pro rata die. c) Correção monetária pelo IGP-M ou outro índice que o substitua.
3.3. A CREDORA se reserva o direito de promover a execução judicial deste Termo, que é título executivo extrajudicial.
3.4. A eventual tolerância não implicará em novação ou transação.
3.5. O valor solicitado está vinculado exclusivamente à prestação do serviço. Com o término desta, as parcelas restantes serão automaticamente consideradas vencidas.

CLÁUSULA QUARTA – DA QUITAÇÃO ANTECIPADA
4.1. O(A) DEVEDOR(A) poderá solicitar a quitação antecipada total ou parcial do empréstimo a qualquer momento.

CLÁUSULA QUINTA – DAS DISPOSIÇÕES GERAIS
5.1. As partes declaram ter lido e compreendido todas as cláusulas deste Termo.
5.2. Fica eleito o foro da comarca de Praia Grande - SP para dirimir quaisquer dúvidas.`;

      addJustifiedText(corpoTexto);

      cursorY += 10;
      if (cursorY > 230) {
        doc.addPage();
        addPageWithTimbrado();
        cursorY = 55;
      }

      const signatureDate = reqDate ? new Date(reqDate + 'T12:00:00') : today;
      const signatureDay = signatureDate.getDate();
      const signatureMonth = monthNames[signatureDate.getMonth()];
      const signatureYear = signatureDate.getFullYear();

      doc.text(`Praia Grande - SP, ${signatureDay} de ${signatureMonth} de ${signatureYear}.`, margin, cursorY);

      cursorY += 25;

      doc.line(margin, cursorY, margin + 75, cursorY);
      doc.line(margin + 95, cursorY, margin + 170, cursorY);

      doc.setFontSize(8);
      doc.text("DEVEDOR(A)", margin, cursorY + 4);
      const debtorName = fullEmpDetails.employment_type === 'PJ' ? fullEmpDetails.corporate_name || '' : fullEmpDetails.full_name || '';
      doc.text(debtorName, margin, cursorY + 8);
      doc.text(`Rep: ${fullEmpDetails.responsible_name || fullEmpDetails.full_name || ''}`, margin, cursorY + 12);
      doc.text(`CNPJ/CPF: ${fullEmpDetails.document_id || ''}`, margin, cursorY + 16);

      doc.text("CREDORA", margin + 95, cursorY + 4);
      doc.text("MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA", margin + 95, cursorY + 8);
      doc.text("Rep: Priscilla Coelho Monteiro", margin + 95, cursorY + 12);
      doc.text("CNPJ: 02.233.923/0001-19", margin + 95, cursorY + 16);

      cursorY += 30;
      doc.setFontSize(10);
      doc.text("TESTEMUNHAS:", margin, cursorY);
      cursorY += 15;

      doc.line(margin, cursorY, margin + 75, cursorY);
      doc.line(margin + 95, cursorY, margin + 170, cursorY);
      doc.setFontSize(8);
      doc.text("Nome:", margin, cursorY + 4);
      doc.text("CPF:", margin, cursorY + 8);
      doc.text("Nome:", margin + 95, cursorY + 4);
      doc.text("CPF:", margin + 95, cursorY + 8);

      const safeName = (fullEmpDetails.full_name || 'Desconhecido').replace(/\s+/g, '_');
      doc.save(`Termo_Divida_${safeName}_${Date.now()}.pdf`);

    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      alert("Erro ao gerar PDF interno.");
    }
  }
}
