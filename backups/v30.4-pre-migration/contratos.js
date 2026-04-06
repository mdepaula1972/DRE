/**
 * DASHBOARD DE CONTRATOS - MAR BRASIL v26.7
 * CASCADE & DYNAMIC VISION: Filtros em Cascata e Seleção Faturado/Líquido
 */

const state = {
    dados: [],
    filtered: [],
    charts: {},
    filters: { contrato: [], empresa: [], status: [], ciclo: [] }
};

const CONFIG = {
    MESES_ORDEM: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    COLORS: {
        prime: '#F2911B',
        success: '#2ecc71',
        danger: '#e74c3c',
        info: '#3498db',
        warning: '#f1c40f',
        neutral: '#95a5a6',
        charts: ['#F2911B', '#3498db', '#9b59b6', '#2ecc71', '#e74c3c', '#f1c40f']
    }
};

// --- 1. CARREGAMENTO E TRATAMENTO DE ENCODING ---

window.addEventListener('DOMContentLoaded', initData);

async function initData() {
    showLoading(true);
    try {
        const response = await fetch('Consolidado Faturamento.csv');
        if (!response.ok) throw new Error("Arquivo não encontrado.");

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);

        const results = Papa.parse(text, {
            header: true,
            skipEmptyLines: 'greedy'
        });

        console.log("CSV Results v25.1:", results);

        state.dados = results.data.map((d, index) => {
            const row = { valorFaturado: 0, valorLiquido: 0, impostos: 0 };
            Object.keys(d).forEach(key => {
                const rawKey = key.trim();
                const cleanKey = rawKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                let val = d[rawKey];
                if (typeof val === 'string') val = val.trim();

                if (cleanKey === 'faturado' || cleanKey === 'valor faturado') row.valorFaturado = parseCurrency(val);
                else if (cleanKey === 'liquido' || cleanKey === 'valor liquido') row.valorLiquido = parseCurrency(val);
                else if (cleanKey === 'impostos' || cleanKey === 'imposto') row.impostos = parseCurrency(val);

                if (cleanKey.includes('previs')) row.dataPrevisao = val;
                if (cleanKey.includes('emiss')) row.dataEmissao = val;
                if (cleanKey.includes('status')) row.Status = val;
                if (cleanKey.includes('contrato')) row.Contrato = val;
                if (cleanKey.includes('empresa')) row.Empresa = val;
                if (cleanKey.includes('ciclo')) row.Ciclo = val;
            });
            // Fallback
            if (row.impostos === 0) {
                const ik = Object.keys(d).find(k => k.toLowerCase().includes('imposto'));
                if (ik) row.impostos = parseCurrency(d[ik]);
            }
            row.analiseAtraso = calcularAtraso(row.dataPrevisao, row.Status);
            return row;
        });

        window.FULL_CSV_DATA = state.dados;
        if (window.updateBrisinhAIContext) window.updateBrisinhAIContext();

        initFilters();
        updateDashboard();
    } catch (err) {
        console.error("Erro v22:", err);
        const statusEl = document.getElementById('lastUpdate');
        if (statusEl) statusEl.innerHTML = "❌ Erro ao ler Consolidado Faturamento.csv";
    } finally {
        showLoading(false);
    }
}

function calcularAtraso(dataPrev, status) {
    if (status && status.toLowerCase() === 'pago') return { texto: 'Pago', classe: 'status-pago' };
    if (!dataPrev || dataPrev === '-' || dataPrev.trim() === '') return { texto: 'Pendente', classe: 'status-neutral' };
    try {
        const partes = dataPrev.split('/');
        if (partes.length !== 3) return { texto: 'Pendente', classe: 'status-neutral' };
        const prev = new Date(partes[2], partes[1] - 1, partes[0]);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        prev.setHours(0, 0, 0, 0);
        const diffTime = hoje.getTime() - prev.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) return { texto: `Atraso: ${diffDays}d`, classe: 'status-pendente', dias: diffDays };
        else return { texto: 'A Vencer', classe: 'status-info' };
    } catch (e) {
        return { texto: 'Pendente', classe: 'status-neutral' };
    }
}

// --- 2. FILTROS EM CASCATA ---

function initFilters() {
    refreshFilterOptions();

    // Listeners para Cascata
    const fEmp = document.getElementById('filterEmpresa');
    const fCon = document.getElementById('filterContrato');
    const fCic = document.getElementById('filterCiclo');
    const fSta = document.getElementById('filterStatus');
    const vSel = document.getElementById('viewSelector');

    fEmp.addEventListener('change', () => { updateCascade('empresa'); updateDashboard(); });
    fCon.addEventListener('change', () => { updateCascade('contrato'); updateDashboard(); });
    fCic.addEventListener('change', () => { updateDashboard(); });
    fSta.addEventListener('change', () => { updateDashboard(); });

    // Visão seletiva removida na v25.0
    /*
    if (vSel) {
        vSel.addEventListener('change', (e) => {
            state.viewType = e.target.value;
            updateDashboard();
        });
    }
    */

    // Sticky Scroll Effect
    window.addEventListener('scroll', () => {
        const kpiRow = document.getElementById('kpiRow1');
        if (kpiRow) {
            if (window.scrollY > 100) kpiRow.classList.add('scrolled');
            else kpiRow.classList.remove('scrolled');
        }
    });

    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) {
        btnClear.onclick = () => {
            document.querySelectorAll('select').forEach(s => {
                if (s.id !== 'viewSelector') s.value = '';
            });
            refreshFilterOptions();
            updateDashboard();
        };
    }
}

function refreshFilterOptions() {
    const empresas = [...new Set(state.dados.map(d => d.Empresa))].sort().filter(Boolean);
    const contratos = [...new Set(state.dados.map(d => d.Contrato))].sort().filter(Boolean);
    const ciclos = [...new Set(state.dados.map(d => d.Ciclo))].sort((a, b) => sortCiclo(a, b)).filter(Boolean);
    const status = [...new Set(state.dados.map(d => d.Status))].sort().filter(Boolean);

    populateSelect('filterEmpresa', empresas);
    populateSelect('filterContrato', contratos);
    populateSelect('filterCiclo', ciclos);
    populateSelect('filterStatus', status);
}

function updateCascade(source) {
    const selEmp = getSelectedValues('filterEmpresa');
    const selCon = getSelectedValues('filterContrato');

    let subset = [...state.dados];

    if (source === 'empresa' && selEmp.length > 0) {
        subset = subset.filter(d => selEmp.includes(d.Empresa));
        const newContratos = [...new Set(subset.map(d => d.Contrato))].sort().filter(Boolean);
        updateSelectOptions('filterContrato', newContratos, selCon);
    }

    if (source === 'contrato' && selCon.length > 0) {
        // Se escolheu contrato, opcionalmente filtrar empresa se não houver selecionada
        if (selEmp.length === 0) {
            subset = subset.filter(d => selCon.includes(d.Contrato));
            const newEmpresas = [...new Set(subset.map(d => d.Empresa))].sort().filter(Boolean);
            updateSelectOptions('filterEmpresa', newEmpresas, selEmp);
        }
    }
}

function updateSelectOptions(id, newList, currentSelection) {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = '';
    newList.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        if (currentSelection.includes(item)) opt.selected = true;
        s.appendChild(opt);
    });
}

function updateDashboard() {
    const selCon = getSelectedValues('filterContrato');
    const selEmp = getSelectedValues('filterEmpresa');
    const selSta = getSelectedValues('filterStatus');
    const selCic = getSelectedValues('filterCiclo');

    state.filtered = state.dados.filter(d => {
        if (selCon.length && !selCon.includes(d.Contrato)) return false;
        if (selEmp.length && !selEmp.includes(d.Empresa)) return false;
        if (selSta.length && !selSta.includes(d.Status)) return false;
        if (selCic.length && !selCic.includes(d.Ciclo)) return false;
        return true;
    });

    renderAll();
}

function renderAll() {
    renderKPIs();
    renderCharts();
    renderMatrix();
}

function renderKPIs() {
    const totalFat = state.filtered.reduce((acc, d) => acc + d.valorFaturado, 0);
    const totalLiq = state.filtered.reduce((acc, d) => acc + d.valorLiquido, 0);
    const totalImp = state.filtered.reduce((acc, d) => acc + d.impostos, 0);
    const atrasados = state.filtered.filter(d => d.analiseAtraso.classe === 'status-pendente').length;

    setText('valTotalFaturado', formatBRL(totalFat));
    setText('valTotalRecebido', formatBRL(totalLiq));
    setText('valTotalComissao', formatBRL(totalImp));
    setText('valComissaoPendente', atrasados);
}

// --- 3. MATRIZ DINÂMICA (Faturado vs Líquido) ---

function renderMatrix() {
    const tbody = document.getElementById('matrixBody');
    const theadRow = document.getElementById('matrixHeader');
    if (!tbody || !theadRow) return;

    // REVERSO: Mais recente na esquerda
    const ciclos = [...new Set(state.filtered.map(d => d.Ciclo))].sort((a, b) => sortCiclo(a, b)).filter(Boolean).reverse();

    // Header Principal
    let headerHtml = `<th class="contract-cell" rowspan="2" style="background: #1a1a1a !important; color: #fff !important; border-bottom: 2px solid var(--primary-color) !important;">Contrato / Empresa</th>`;
    ciclos.forEach((c, idx) => {
        // Estética degradê premium: do mais forte (recente) para o mais suave (antigo)
        // Usamos HSL para um controle mais fino da saturação/brilho
        const hue = 33; // Tom de laranja da Mar Brasil
        const sat = 85;
        const light = Math.min(45, 25 + (idx * 5)); // Escurece conforme index aumenta para manter contraste
        const alpha = Math.max(0.2, 1 - (idx * 0.15));

        const bgStyle = `style="background: linear-gradient(180deg, rgba(242, 145, 27, ${alpha}) 0%, rgba(242, 145, 27, ${alpha * 0.7}) 100%) !important; color: #fff !important; border-bottom: 2px solid rgba(255,255,255,0.1) !important;"`;
        headerHtml += `<th colspan="3" class="text-center border-start" ${bgStyle}>${c}</th>`;
    });
    headerHtml += `<th colspan="3" class="text-center border-start fw-bold text-warning" style="background: rgba(242, 145, 27, 0.1) !important; border-bottom: 2px solid var(--primary-color) !important;">TOTAL GERAL</th>`;
    theadRow.innerHTML = headerHtml;

    // Sub-header (Sub-colunas)
    let subHeader = document.getElementById('matrixSubHeader');
    if (!subHeader) {
        subHeader = document.createElement('tr');
        subHeader.id = 'matrixSubHeader';
        theadRow.parentNode.appendChild(subHeader);
    }
    let subHtml = '';
    ciclos.forEach(() => {
        subHtml += `<th class="val-cell-mini border-start">Bruto</th><th class="val-cell-mini">Líq.</th><th class="val-cell-mini">Imp.</th>`;
    });
    subHtml += `<th class="val-cell-mini border-start text-warning">Bruto</th><th class="val-cell-mini text-warning">Líq.</th><th class="val-cell-mini text-warning">Imp.</th>`;
    subHeader.innerHTML = subHtml;

    const matrix = {};
    state.filtered.forEach(d => {
        const key = d.Contrato || 'Sem Nome';
        if (!matrix[key]) matrix[key] = { empresa: d.Empresa, vals: {} };
        if (!matrix[key].vals[d.Ciclo]) matrix[key].vals[d.Ciclo] = { faturado: 0, liquido: 0, impostos: 0 };

        matrix[key].vals[d.Ciclo].faturado += Number(d.valorFaturado || 0);
        matrix[key].vals[d.Ciclo].liquido += Number(d.valorLiquido || 0);
        matrix[key].vals[d.Ciclo].impostos += Number(d.impostos || 0);
    });

    tbody.innerHTML = '';

    // Linha de TOTAIS (No Topo)
    const totalsRow = document.createElement('tr');
    totalsRow.style.background = 'rgba(242, 145, 27, 0.1)';
    totalsRow.classList.add('fw-bold');
    let totalsHtml = `<td class="contract-cell text-warning">TOTAIS DO PERÍODO</td>`;
    let grandFat = 0, grandLiq = 0, grandImp = 0;

    ciclos.forEach((c, idx) => {
        const cycleData = state.filtered.filter(d => d.Ciclo === c);
        const fat = cycleData.reduce((acc, d) => acc + d.valorFaturado, 0);
        const liq = cycleData.reduce((acc, d) => acc + d.valorLiquido, 0);
        const imp = cycleData.reduce((acc, d) => acc + d.impostos, 0);

        grandFat += fat; grandLiq += liq; grandImp += imp;

        const alpha = Math.max(0.05, 0.4 - (idx * 0.05));
        const bgStyle = `style="background: rgba(242, 145, 27, ${alpha}) !important; border-bottom: 2px solid rgba(242, 145, 27, 0.2) !important;"`;

        totalsHtml += `
            <td class="val-cell-mini border-start text-warning" ${bgStyle}>${formatBRL(fat)}</td>
            <td class="val-cell-mini text-warning" ${bgStyle}>${formatBRL(liq)}</td>
            <td class="val-cell-mini text-warning" ${bgStyle}>${formatBRL(imp)}</td>
        `;
    });

    totalsHtml += `
        <td class="val-cell-mini border-start fw-800 text-warning bg-primary-subtle">${formatBRL(grandFat)}</td>
        <td class="val-cell-mini fw-800 text-warning bg-primary-subtle">${formatBRL(grandLiq)}</td>
        <td class="val-cell-mini fw-800 text-warning bg-primary-subtle">${formatBRL(grandImp)}</td>
    `;
    totalsRow.innerHTML = totalsHtml;
    tbody.appendChild(totalsRow);

    // Linhas de Contrato
    Object.keys(matrix).sort().forEach(cont => {
        const tr = document.createElement('tr');
        let rowFat = 0, rowLiq = 0, rowImp = 0;
        let html = `<td class="contract-cell">${cont}<br><small class="text-white-50">${matrix[cont].empresa}</small></td>`;

        ciclos.forEach(c => {
            const v = matrix[cont].vals[c] || { faturado: 0, liquido: 0, impostos: 0 };
            rowFat += (v.faturado || 0);
            rowLiq += (v.liquido || 0);
            rowImp += (v.impostos || 0);

            html += `
                <td class="val-cell-mini border-start privacy-mask">${v.faturado !== 0 ? formatBRL(v.faturado) : '-'}</td>
                <td class="val-cell-mini privacy-mask text-info">${v.liquido !== 0 ? formatBRL(v.liquido) : '-'}</td>
                <td class="val-cell-mini privacy-mask" style="color: #adb5bd !important;">${v.impostos !== 0 ? formatBRL(v.impostos) : '-'}</td>
            `;
        });

        html += `
            <td class="val-cell-mini border-start privacy-mask fw-bold text-warning">${formatBRL(rowFat)}</td>
            <td class="val-cell-mini privacy-mask fw-bold text-info">${formatBRL(rowLiq)}</td>
            <td class="val-cell-mini privacy-mask fw-bold" style="color: #adb5bd !important;">${formatBRL(rowImp)}</td>
        `;
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
    console.log("Matrix Renderizada v26.2. Amostra matrix keys:", Object.keys(matrix).slice(0, 3));
}

function renderCharts() {
    const ciclos = [...new Set(state.filtered.map(d => d.Ciclo))].sort((a, b) => sortCiclo(a, b)).filter(Boolean);

    // Dados para o gráfico triplo (Evolução Cronológica)
    const dataFat = ciclos.map(c => state.filtered.filter(d => d.Ciclo === c).reduce((a, b) => a + b.valorFaturado, 0));
    const dataLiq = ciclos.map(c => state.filtered.filter(d => d.Ciclo === c).reduce((a, b) => a + b.valorLiquido, 0));
    const dataImp = ciclos.map(c => state.filtered.filter(d => d.Ciclo === c).reduce((a, b) => a + b.impostos, 0));

    renderChart('evolutionChart', 'bar', {
        labels: ciclos,
        datasets: [
            { label: 'Valor Faturado', data: dataFat, backgroundColor: CONFIG.COLORS.prime },
            { label: 'Valor Líquido', data: dataLiq, backgroundColor: CONFIG.COLORS.info },
            { label: 'Impostos', data: dataImp, backgroundColor: CONFIG.COLORS.neutral }
        ]
    });

    // Share por Empresa (Faturado por padrão na v25.0)
    const emps = [...new Set(state.filtered.map(d => d.Empresa))];
    const dataEmp = emps.map(e => state.filtered.filter(d => d.Empresa === e).reduce((a, b) => a + b.valorFaturado, 0));

    renderChart('contractCompareChart', 'doughnut', {
        labels: emps,
        datasets: [{ data: dataEmp, backgroundColor: CONFIG.COLORS.charts }]
    });
}

// --- UTILS ---

function sortCiclo(a, b) {
    if (!a || !b) return 0;
    const map = {
        "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6, "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6, "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
    };

    // Abreviações em inglês comuns em CSVs
    const mapEN = { "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12 };

    const [mA, aA] = a.toLowerCase().split('-');
    const [mB, aB] = b.toLowerCase().split('-');

    if (aA !== aB) return parseInt(aA) - parseInt(aB); // Ordem Cronológica (Antigo primeiro)

    const valA = map[mA] || mapEN[mA] || 0;
    const valB = map[mB] || mapEN[mB] || 0;

    return valA - valB; // Ordem Cronológica (Antigo primeiro)
}

function parseCurrency(val) {
    if (val === undefined || val === null || val === '-' || val === '') return 0;
    if (typeof val === 'number') return val;

    let s = val.toString().replace('R$', '').trim();
    if (!s) return 0;

    // Lógica robusta para detectar formato BR (1.234,56) vs US (1,234.56)
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma > lastDot) {
        // Formato Brasileiro: vírgula é decimal
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Formato Americano: ponto é decimal, vírgula é milhar
        s = s.replace(/,/g, '');
    } else if (lastComma !== -1) {
        // Apenas vírgula: 1234,56
        s = s.replace(',', '.');
    }
    // Apenas ponto: 1234.56 (ParseFloat nativo lida bem)

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}

function formatBRL(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function populateSelect(id, list) {
    const s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = '';
    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item; opt.textContent = item;
        s.appendChild(opt);
    });
}

function getSelectedValues(id) {
    const s = document.getElementById(id);
    return s ? Array.from(s.selectedOptions).map(o => o.value) : [];
}

function renderChart(id, type, data, options = {}) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (state.charts[id]) state.charts[id].destroy();
    const ctx = canvas.getContext('2d');
    state.charts[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#888', font: { family: 'Outfit' } } } },
            scales: type !== 'doughnut' ? {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                x: { ticks: { color: '#888' } }
            } : {},
            ...options
        }
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('d-none', !show);
}
