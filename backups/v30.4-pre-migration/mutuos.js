/**
 * Mútuos & Dividendos JS - CSI MAR BRASIL
 */
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let state = {
    registros: [],
    filtros: {
        dataInicio: '',
        dataFim: '',
        tipo: ''
    }
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
});

async function init() {
    console.log("Mútuos & Dividendos v28.0 carregado.");
    updateVersionDisplay();
    await loadRegistros();
}

function updateVersionDisplay() {
    const el = document.getElementById('appVersionDisplay');
    if (el && window.APP_VERSION) el.textContent = `v${window.APP_VERSION} Supabase`;
}

async function loadRegistros() {
    try {
        let query = db.from('mutuos_dividendos').select('*').eq('ativo', true).order('data_registro', { ascending: false });

        if (state.filtros.dataInicio) query = query.gte('data_registro', state.filtros.dataInicio);
        if (state.filtros.dataFim) query = query.lte('data_registro', state.filtros.dataFim);
        if (state.filtros.tipo) query = query.eq('tipo', state.filtros.tipo);

        const { data, error } = await query;
        if (error) throw error;

        state.registros = data || [];
        renderTable();
        updateKPIs();
    } catch (e) {
        console.error("Erro ao carregar registros:", e);
    }
}

function renderTable() {
    const tbody = document.getElementById('mutuosTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.registros.forEach(reg => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i class="bi bi-circle-fill" style="font-size: 8px; color: ${reg.tipo === 'Mútuo' ? '#3498db' : '#9b59b6'}"></i></td>
            <td><span class="type-badge ${reg.tipo === 'Mútuo' ? 'type-mutuo' : 'type-dividendo'}">${reg.tipo}</span></td>
            <td class="fw-bold">${reg.beneficiario}</td>
            <td>${formatDate(reg.data_registro)}</td>
            <td class="text-primary fw-bold">${formatCurrency(reg.valor)}</td>
            <td class="small opacity-75">${reg.banco_origem || '-'}</td>
            <td class="small opacity-75">${reg.banco_destino || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-light border-0" onclick="editRegistro('${reg.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteRegistro('${reg.id}')"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateKPIs() {
    const total = state.registros.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    const totalMutuos = state.registros.filter(r => r.tipo === 'Mútuo').reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);
    const totalDividendos = state.registros.filter(r => r.tipo === 'Dividendo').reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);

    document.getElementById('kpiTotalGeral').textContent = formatCurrency(total);
    document.getElementById('kpiTotalMutuos').textContent = formatCurrency(totalMutuos);
    document.getElementById('kpiTotalDividendos').textContent = formatCurrency(totalDividendos);
}

function setupEventListeners() {
    const form = document.getElementById('formMutuo');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await saveRegistro();
        };
    }

    document.getElementById('btnAplicarFiltros').onclick = async () => {
        state.filtros.dataInicio = document.getElementById('filterDataInicio').value;
        state.filtros.dataFim = document.getElementById('filterDataFim').value;
        state.filtros.tipo = document.getElementById('filterTipo').value;
        await loadRegistros();
    };

    document.getElementById('btnLimparFiltros').onclick = async () => {
        document.getElementById('filterDataInicio').value = '';
        document.getElementById('filterDataFim').value = '';
        document.getElementById('filterTipo').value = '';
        state.filtros = { dataInicio: '', dataFim: '', tipo: '' };
        await loadRegistros();
    };
}

async function saveRegistro() {
    const id = document.getElementById('mutuoId').value;
    const payload = {
        tipo: document.getElementById('inputTipo').value,
        beneficiario: document.getElementById('inputBeneficiario').value,
        data_registro: document.getElementById('inputData').value,
        valor: parseFloat(document.getElementById('inputValor').value) || 0,
        banco_origem: document.getElementById('inputOrigem').value,
        banco_destino: document.getElementById('inputDestino').value,
        observacoes: document.getElementById('inputObservacoes').value,
        ativo: true
    };

    try {
        let res;
        if (id) {
            res = await db.from('mutuos_dividendos').update(payload).eq('id', id);
        } else {
            res = await db.from('mutuos_dividendos').insert([payload]);
        }

        if (res.error) throw res.error;

        bootstrap.Modal.getInstance(document.getElementById('modalLancamento')).hide();
        document.getElementById('formMutuo').reset();
        document.getElementById('mutuoId').value = '';
        await loadRegistros();
        alert("✅ Registro salvo com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar registro.");
    }
}

window.editRegistro = function (id) {
    const reg = state.registros.find(r => r.id === id);
    if (!reg) return;

    document.getElementById('mutuoId').value = reg.id;
    document.getElementById('inputTipo').value = reg.tipo;
    document.getElementById('inputBeneficiario').value = reg.beneficiario;
    document.getElementById('inputData').value = reg.data_registro;
    document.getElementById('inputValor').value = reg.valor;
    document.getElementById('inputOrigem').value = reg.banco_origem || '';
    document.getElementById('inputDestino').value = reg.banco_destino || '';
    document.getElementById('inputObservacoes').value = reg.observacoes || '';

    new bootstrap.Modal(document.getElementById('modalLancamento')).show();
};

window.deleteRegistro = async function (id) {
    if (!confirm("Tem certeza que deseja remover este registro?")) return;

    try {
        const { error } = await db.from('mutuos_dividendos').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        await loadRegistros();
    } catch (e) {
        console.error("Erro ao deletar:", e);
        alert("Erro ao deletar registro.");
    }
};

// --- GERAÇÃO DE PDF ---
window.openTermoModal = function () {
    // Pré-setar a data de hoje
    document.getElementById('termoData').valueAsDate = new Date();
    new bootstrap.Modal(document.getElementById('modalTermo')).show();
};

window.generateTermoPDF = async function () {
    const { jsPDF } = window.jspdf;
    const dataContrato = document.getElementById('termoData').value;

    if (!dataContrato) {
        alert("A data do contrato é obrigatória!");
        return;
    }

    // Filtra apenas mútuos
    const mutuos = state.registros.filter(r => r.tipo === 'Mútuo');
    if (mutuos.length === 0) {
        alert("Nenhum lançamento de Mútuo encontrado no período filtrado.");
        return;
    }

    const totalValor = mutuos.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0);

    // Formatar datas
    const dataFormatada = formatDateFull(dataContrato);
    const vencimentoDate = new Date(dataContrato);
    vencimentoDate.setFullYear(vencimentoDate.getFullYear() + 1);
    const vencimentoFormatado = formatDateFull(vencimentoDate.toISOString().split('T')[0]);

    try {
        const timbrado = window.TIMBRADO_B64;
        if (!timbrado) {
            alert("Erro ao carregar o papel timbrado. Verifique se timbrado_b64.js foi carregado corretamente.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = 210;
        const marginLeft = 20;
        const marginRight = 20;
        const contentWidth = pageWidth - marginLeft - marginRight;
        let y = 55; // Início após o cabeçalho do timbrado

        const addPage = () => {
            doc.addPage();
            doc.addImage(timbrado, 'JPEG', 0, 0, 210, 297);
            y = 40;
        };

        const checkPage = (need) => { if (y + need > 270) addPage(); };

        doc.addImage(timbrado, 'JPEG', 0, 0, 210, 297);

        // Título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("CONTRATO DE MÚTUO", pageWidth / 2, y, { align: "center" });
        y += 12;

        // Partes
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const partes = `Pelo presente instrumento particular, de um lado MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº. 02.233.923/0001-19, com sede à Rua Tupi, 782 – andar 1, Vila Tupi – Praia Grande - SP CEP: 11703-260, neste ato representada por seu sócio administrador, a Sra. PRISCILLA COELHO MONTEIRO, inscrita no CPF sob o nº. 320.421.118-56, doravante simplesmente denominada MUTUANTE; e do outro

CONECTIUS DO BRASIL EIRELI, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob nº. 05.559.293/0001-65, com sede à Rua Tupi, nº 782, Andar 1, bairro Vila Tupi, Praia Grande/SP, CEP: 11.703-200, neste ato representada por seu sócio administrador, o Sr. DAUREN ZILLETI MONTEIRO, inscrito no CPF sob o nº. 269.606.618-38, doravante simplesmente denominada MUTUÁRIA;

Têm entre si justo e contratado as cláusulas e condições abaixo enumeradas:`;

        const splitPartes = doc.splitTextToSize(partes, contentWidth);
        doc.text(splitPartes, marginLeft, y);
        y += splitPartes.length * 4.5 + 5;

        // Cláusula Primeira
        checkPage(40);
        doc.setFont("helvetica", "bold");
        doc.text("Cláusula Primeira –", marginLeft, y);
        doc.setFont("helvetica", "normal");
        const clausula1 = ` A MUTUANTE efetuará empréstimo à MUTUÁRIA no valor de ${formatCurrency(totalValor)} (${valorPorExtenso(totalValor)}), com pagamentos realizados conforme tabela abaixo, a ser depositada na conta de titularidade da MUTUÁRIA, na Fit Bank – Banco 450 – Agência 0001, conta corrente 8629997361-1, chave pix.omiecash@marbr.com.br, com prazo de devolução de até 01 ano (um ano) a contar a partir da data de assinatura deste contrato:`;
        const splitC1 = doc.splitTextToSize(clausula1, contentWidth - 35);
        doc.text(splitC1, marginLeft + 35, y);
        y += splitC1.length * 4.5 + 8;

        // Tabela de Lançamentos
        checkPage(30);
        doc.setFillColor(240, 240, 240);
        doc.rect(marginLeft, y, contentWidth, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("DATA", marginLeft + 5, y + 5);
        doc.text("VALOR", marginLeft + contentWidth - 40, y + 5);
        y += 10;

        doc.setFont("helvetica", "normal");
        mutuos.forEach(m => {
            checkPage(8);
            doc.text(formatDate(m.data_registro), marginLeft + 5, y);
            doc.text(formatCurrency(m.valor), marginLeft + contentWidth - 40, y);
            y += 6;
        });

        // Total
        doc.setFont("helvetica", "bold");
        doc.setFillColor(200, 200, 200);
        doc.rect(marginLeft, y - 2, contentWidth, 7, 'F');
        doc.text("TOTAL", marginLeft + 5, y + 3);
        doc.text(formatCurrency(totalValor), marginLeft + contentWidth - 40, y + 3);
        y += 15;

        // Demais Cláusulas
        checkPage(50);
        const clausulas = [
            `Cláusula Segunda: Para pagamento, a MUTUÁRIA entregará à MUTUANTE uma nota promissória que constará o valor do empréstimo, a taxa de juros e a data de vencimento da obrigação.`,
            `Cláusula Terceira – Se a MUTUÁRIA deixar de pagar no prazo sem informar a MUTUANTE, a MUTUANTE poderá levar a protesto e/ou notificar a MUTUÁRIA para que, no prazo de 60 (sessenta) dias, purge a mora acrescida de juros moratórios de 0,5% (cinco décimos de percentual) ao mês ou fração de mês desde a data do vencimento até o efetivo pagamento, sob pena de ação de execução judicial ou rescisão deste contrato por inadimplência.`,
            `Cláusula Quarta – As partes elegem o foro da Comarca de Praia Grande - SP, como o único competente para dirimir qualquer procedimento que porventura venha envolver futura discussão sobre o presente contrato, quer de natureza extrajudicial, ou judicial, em detrimento de qualquer outro porventura mais privilegiado.`
        ];

        clausulas.forEach(c => {
            checkPage(25);
            const split = doc.splitTextToSize(c, contentWidth);
            doc.setFont("helvetica", "normal");
            doc.text(split, marginLeft, y);
            y += split.length * 4.5 + 5;
        });

        // Fechamento
        checkPage(20);
        const fechamento = `E assim, estando justas e contratadas, as partes firmam o presente instrumento na presença de duas testemunhas, em 02 (duas) vias de igual teor e forma, para que produza os seus efeitos legais.`;
        const splitFech = doc.splitTextToSize(fechamento, contentWidth);
        doc.text(splitFech, marginLeft, y);
        y += splitFech.length * 4.5 + 10;

        doc.text(`Praia Grande/SP, ${dataFormatada}.`, marginLeft, y);
        y += 25;

        // Assinaturas
        checkPage(50);
        doc.setFont("helvetica", "bold");
        doc.text("_______________________________________", marginLeft, y);
        doc.text("_______________________________________", marginLeft + 100, y);
        y += 5;
        doc.setFontSize(9);
        doc.text("MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA", marginLeft, y);
        doc.text("CONECTIUS DO BRASIL EIRELI", marginLeft + 100, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.text("Mutuante", marginLeft, y);
        doc.text("Mutuária", marginLeft + 100, y);
        y += 20;

        // Testemunhas
        doc.text("Testemunhas:", marginLeft, y);
        y += 8;
        doc.text("Nome: _______________________________   CPF: ___________________", marginLeft, y);
        y += 8;
        doc.text("Nome: _______________________________   CPF: ___________________", marginLeft, y);
        y += 15;

        // --- NOTA PROMISSÓRIA ---
        addPage();
        y = 55;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("NOTA PROMISSÓRIA", pageWidth / 2, y, { align: "center" });
        y += 15;

        doc.setFontSize(11);
        doc.text(`Vencimento: ${vencimentoFormatado}`, marginLeft, y);
        y += 8;
        doc.text(`Valor: ${formatCurrency(totalValor)} (${valorPorExtenso(totalValor)})`, marginLeft, y);
        y += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const notaTexto = `No dia ${vencimentoFormatado} pagarei por esta única via de nota promissória na praça de Praia Grande/SP à MAR BRASIL SERVIÇOS E LOCAÇÕES ou a sua ordem a quantia de ${formatCurrency(totalValor)} (${valorPorExtenso(totalValor)}) em moeda corrente deste país.`;
        const splitNota = doc.splitTextToSize(notaTexto, contentWidth);
        doc.text(splitNota, marginLeft, y);
        y += splitNota.length * 4.5 + 15;

        doc.text(`Praia Grande - SP, ${dataFormatada}.`, marginLeft, y);
        y += 20;

        doc.setFont("helvetica", "bold");
        doc.text("CONECTIUS DO BRASIL EIRELI", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text("CNPJ nº 05.559.293/0001-65", marginLeft, y);
        y += 5;
        doc.text("AV. PRES. KENNEDY, nº. 5251, sala 32", marginLeft, y);
        y += 5;
        doc.text("Bairro Vila Tupy, CEP 11703-200", marginLeft, y);
        y += 5;
        doc.text("Praia Grande/SP", marginLeft, y);
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Dauren Zilleti Monteiro", marginLeft, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text("Administrador", marginLeft, y);

        // Salvar
        doc.save(`Contrato_Mutuo_${dataContrato}.pdf`);
        bootstrap.Modal.getInstance(document.getElementById('modalTermo')).hide();
        // onload fechamento removido

    } catch (e) {
        console.error("Erro no PDF:", e);
        alert("Erro ao gerar o PDF.");
    }
};

// --- UTILS ---
function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateFull(dateStr) {
    if (!dateStr) return "-";
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
}

function valorPorExtenso(valor) {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const extenso = (n) => {
        if (n === 0) return 'zero';
        if (n < 20) return unidades[n];
        if (n < 100) return dezenas[Math.floor(n / 10)] + (n % 10 ? ' e ' + unidades[n % 10] : '');
        if (n === 100) return 'cem';
        if (n < 1000) return centenas[Math.floor(n / 100)] + (n % 100 ? ' e ' + extenso(n % 100) : '');
        if (n < 2000) return 'mil' + (n % 1000 ? ' ' + extenso(n % 1000) : '');
        if (n < 1000000) return extenso(Math.floor(n / 1000)) + ' mil' + (n % 1000 ? ' ' + extenso(n % 1000) : '');
        if (n < 2000000) return 'um milhão' + (n % 1000000 ? ' ' + extenso(n % 1000000) : '');
        return extenso(Math.floor(n / 1000000)) + ' milhões' + (n % 1000000 ? ' ' + extenso(n % 1000000) : '');
    };

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    let resultado = extenso(inteiro) + (inteiro === 1 ? ' real' : ' reais');
    if (centavos > 0) {
        resultado += ' e ' + extenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    }
    return resultado;
}
