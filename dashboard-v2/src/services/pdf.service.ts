import { jsPDF } from "jspdf";
import { TIMBRADO_B64 } from "../lib/timbrado_base64";
import { Employee } from "../types/loans";
import { supabase } from "@/lib/supabase";

export class PDFService {
  static async promptWitness(isTestMode: boolean): Promise<string | null> {
    const wantWitness = window.confirm("Deseja inserir uma testemunha neste termo?");
    if (!wantWitness) return null;

    try {
      const table = isTestMode ? 'employees_test' : 'employees';
      const { data: emps } = await supabase.from(table).select('full_name, responsible_name').order('full_name');
      
      const list = Array.from(new Set((emps || []).map((e: any) => e.responsible_name || e.full_name).filter(Boolean).map((s: string) => s.trim()))).sort();

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'witness-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const modal = document.createElement('div');
        modal.style.backgroundColor = '#ffffff';
        modal.style.padding = '24px';
        modal.style.borderRadius = '16px';
        modal.style.width = '420px';
        modal.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        modal.style.fontFamily = 'system-ui, -apple-system, sans-serif';

        modal.innerHTML = `
          <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Inserir Testemunha</h3>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.5;">Selecione um colaborador da lista ou preencha manualmente o nome da testemunha.</p>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Preenchimento Manual</label>
            <input type="text" id="witness-manual-input" placeholder="Digite o nome completo" style="width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 10px; outline: none; box-sizing: border-box; transition: border-color 0.2s;" />
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Ou Selecione da Lista</label>
            <select id="witness-select" style="width: 100%; padding: 10px 14px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 10px; outline: none; background: #ffffff; box-sizing: border-box;">
              <option value="">-- Escolha um colaborador --</option>
              ${list.map(name => `<option value="${name}">${name}</option>`).join('')}
            </select>
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="witness-cancel-btn" style="padding: 10px 20px; font-size: 14px; font-weight: 600; color: #64748b; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s;">Cancelar</button>
            <button id="witness-confirm-btn" style="padding: 10px 20px; font-size: 14px; font-weight: 600; color: #ffffff; background: #059669; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s;">Confirmar</button>
          </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const manualInput = overlay.querySelector('#witness-manual-input') as HTMLInputElement;
        const selectEl = overlay.querySelector('#witness-select') as HTMLSelectElement;
        const cancelBtn = overlay.querySelector('#witness-cancel-btn') as HTMLButtonElement;
        const confirmBtn = overlay.querySelector('#witness-confirm-btn') as HTMLButtonElement;

        manualInput.addEventListener('input', () => {
          if (manualInput.value.trim() !== '') {
            selectEl.value = '';
          }
        });

        selectEl.addEventListener('change', () => {
          if (selectEl.value !== '') {
            manualInput.value = '';
          }
        });

        cancelBtn.addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(null);
        });

        confirmBtn.addEventListener('click', () => {
          let selectedName = manualInput.value.trim();
          if (!selectedName && selectEl.value) {
            selectedName = selectEl.value;
          }
          document.body.removeChild(overlay);
          resolve(selectedName || null);
        });
      });
    } catch (e) {
      console.error("Erro ao processar testemunhas:", e);
      return null;
    }
  }

  static async generateDebtTermPDF(loanData: any, emp: any, isTestMode: boolean = false) {
    const amount = loanData.amount || loanData.value || 0;
    
    if (!loanData || !amount) {
      alert("Este colaborador não possui empréstimo registrado para gerar o termo.");
      return;
    }

    const witnessName = await PDFService.promptWitness(isTestMode);

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

      // Lógica Robusta de Datas
      const rawCycle = loanData.start_cycle || loanData.startDate || "";
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

      let refMonthName = "---";
      let refYear = today.getFullYear();
      let firstPaymentFormatted = "10/--/----";

      console.log("[PDFService] Dados Recebidos:", { loanData, rawCycle });

      if (rawCycle) {
        try {
          const parts = rawCycle.split('T')[0].split('-');
          const y = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          
          if (!isNaN(y) && !isNaN(m)) {
            refYear = y;
            refMonthName = monthNames[m - 1] || "---";

            // Primeira Parcela = Ciclo + 1 Mês (Sempre dia 10)
            const nextM = m === 12 ? 1 : m + 1;
            const nextY = m === 12 ? y + 1 : y;
            firstPaymentFormatted = `10/${String(nextM).padStart(2, '0')}/${nextY}`;
          }
        } catch (e) {
          console.error("Erro no parse da data do ciclo", e);
        }
      }

      const reqDate = loanData.request_date || loanData.requestDate || loanData.created_at || today.toISOString();
      
      const corpoTexto = `DEVEDOR: ${fullEmpDetails.employment_type === 'PJ' ? fullEmpDetails.corporate_name : fullEmpDetails.full_name}, ${fullEmpDetails.employment_type === 'PJ' ? 'pessoa jurídica de direito privado' : 'pessoa física'}, inscrito no ${fullEmpDetails.pj_type || 'CPF'} sob o n.º ${fullEmpDetails.document_id || ''}, estabelecido na ${fullAddress}, neste ato representada por ${fullEmpDetails.responsible_name || fullEmpDetails.full_name}, inscrito no CPF sob o n.º ${fullEmpDetails.responsible_cpf || fullEmpDetails.document_id || ''} e RG n.º ${fullEmpDetails.responsible_rg || fullEmpDetails.document_rg || '---'}.

CREDOR: MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 02.233.923/0001-19, com sede em Rua Tupi, nº 782, Vila Tupi, Praia Grande - SP, neste ato representada por sua sócia administradora, a Sra. Priscilla Coelho Monteiro, brasileira, casada, empresária, inscrita no CPF sob n.º 320.421.118-56.

As partes acima qualificadas, por este instrumento particular e na melhor forma de direito, confessam e assumem como líquida e certa a dívida a seguir descrita, sujeitando-se às cláusulas e condições que se seguem:

CLÁUSULA PRIMEIRA – DO OBJETO DA DÍVIDA
1.1. O(A) DEVEDOR(A) confessa e declara dever ao(à) CREDOR(A) a importância líquida, certa e exigível de ${fmt(reqAmount)}, referente ao empréstimo concedido pela MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA. ao(à) DEVEDOR(A) em ${formatDate(reqDate)}.

CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO
2.1. O valor confessado na Cláusula Primeira será quitado pelo(a) DEVEDOR(A) por meio de descontos nas futuras notas fiscais de prestação de serviços emitidas à MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., em ${reqInstallments} parcelas mensais e sucessivas, no valor de ${fmt(installmentValue)} cada uma, no dia 10 de cada mês, a partir de ${firstPaymentFormatted}.

2.2. O ciclo de referência desta confissão é ${refMonthName} de ${refYear}. Os descontos serão aplicados automaticamente pela CREDORA no momento do processamento das notas fiscais, e o valor líquido a ser pago ao(à) DEVEDOR(A) será o resultado da nota fiscal menos o valor da parcela do empréstimo.

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
      if (witnessName) {
        doc.text(witnessName, margin + 10, cursorY + 4);
      }
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
