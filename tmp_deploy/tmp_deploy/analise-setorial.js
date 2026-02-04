// Análise Setorial - Mar Brasil
// Version: 1.4.0 - Visual Premium, TreeView 3 Níveis, KPIs de Equipe
// Last Update: 08/01/2026 - 14:15

const CONFIG = {
    VERSION: "27.0",
    COLORS: {
        primary: '#F2911B', secondary: '#262223', success: '#2ecc71',
        danger: '#e74c3c', info: '#3498db', light: '#F2F2F2',
        charts: [
            '#F2911B', '#262223', '#00477A', '#e74c3c', '#2ecc71',
            '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c'
        ]
    },
    RATEIO: { SETOR: 'Administrativo', EQ_KEY: 'equipe' },
    MESES: {
        'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
        'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
    }
};

let state = {
    rawData: [],
    processedData: [],
    filteredData: [],
    periodCols: [],
    equipeData: {},
    charts: {}
};

Chart.register(ChartDataLabels);

// ========================================
// 1. DATA PROCESSING
// ========================================

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading(true);
    safeSetText('fileStatus', `Carregando ${file.name}...`);

    const reader = new FileReader();
    reader.onload = function (e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);

        let encoding = 'iso-8859-1';
        // Detect UTF-8 BOM (EF BB BF)
        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
            encoding = 'utf-8';
        }

        const decoder = new TextDecoder(encoding);
        const text = decoder.decode(arrayBuffer);

        Papa.parse(text, {
            header: true,
            skipEmptyLines: 'greedy',
            complete: (results) => {
                processData(results);
                showLoading(false);
            },
            error: (err) => {
                handleError(err.message);
                showLoading(false);
            }
        });
    };
    reader.readAsArrayBuffer(file);
}

function processData(results) {
    // Expose data for BrisinhAI
    window.FULL_CSV_DATA = results.data;
    if (window.updateBrisinhAIContext) window.updateBrisinhAIContext();

    try {
        if (!results.data.length) throw new Error("CSV vazio");

        const headers = Object.keys(results.data[0]);
        state.periodCols = headers
            .filter(h => h.trim().match(/^(\d{2}|[a-zA-Z]{3})\/\d{2}$/))
            .sort((a, b) => parseDate(a) - parseDate(b));

        if (!state.periodCols.length) throw new Error("Colunas de mês não encontradas");

        state.rawData = results.data.map(row => {
            const clean = {};
            Object.keys(row).forEach(k => clean[k.trim()] = row[k]);

            const desc = clean['Despesas'] || clean['Descrição'] || clean['Descricao'] || 'Item';
            const setor = clean['Setor']?.trim() || 'Outros';
            const cat = clean['Categoria']?.trim() || 'Geral';

            const obj = {
                Setor: setor, Categoria: cat, Descricao: desc,
                _isAdm: setor === CONFIG.RATEIO.SETOR,
                _isEquipe: cat.toLowerCase().includes(CONFIG.RATEIO.EQ_KEY)
            };
            state.periodCols.forEach(p => obj[p] = parseCurrency(clean[p]));
            return obj;
        }).filter(r => r.Setor && r.Categoria);

        extractEquipeData();
        aplicarRateio();
        initFilters();
        updateDashboard();

        showLoading(false);
        safeSetText('fileStatus', `✓ ${state.processedData.length} registros`);
        safeSetText('lastUpdate', `Atualizado: ${new Date().toLocaleTimeString()}`);

    } catch (err) { handleError(err.message); }
}

function extractEquipeData() {
    state.equipeMap = {}; // { Setor: { mes: qtd } }
    state.rawData.filter(r => r._isEquipe).forEach(r => {
        if (!state.equipeMap[r.Setor]) state.equipeMap[r.Setor] = {};
        state.periodCols.forEach(p => {
            state.equipeMap[r.Setor][p] = (state.equipeMap[r.Setor][p] || 0) + r[p];
        });
    });
}

function aplicarRateio() {
    state.processedData = [];
    // Copiar Normais
    state.rawData.filter(r => !r._isAdm && !r._isEquipe).forEach(r => {
        state.processedData.push({ ...r, _origin: 'Proprio' });
    });
    // Ratear Adm
    const linhasAdm = state.rawData.filter(r => r._isAdm && !r._isEquipe);

    linhasAdm.forEach(admRow => {
        state.periodCols.forEach(mes => {
            const valorAdm = admRow[mes];
            if (!valorAdm) return;

            let totalPessoas = 0;
            const alvos = Object.keys(state.equipeMap).filter(s => s !== CONFIG.RATEIO.SETOR);
            alvos.forEach(s => totalPessoas += (state.equipeMap[s][mes] || 0));

            if (totalPessoas === 0) return;

            alvos.forEach(dest => {
                const pessoas = state.equipeMap[dest][mes] || 0;
                if (!pessoas) return;

                const parte = valorAdm * (pessoas / totalPessoas);

                // Procurar linha de rateio existente
                let row = state.processedData.find(r =>
                    r.Setor === dest &&
                    r.Categoria === admRow.Categoria &&
                    r.Descricao === `${admRow.Descricao} (R)`
                );

                if (!row) {
                    row = {
                        Setor: dest, Categoria: admRow.Categoria,
                        Descricao: `${admRow.Descricao} (R)`,
                        _origin: 'Rateado', _isAdm: false, _isEquipe: false
                    };
                    state.periodCols.forEach(p => row[p] = 0);
                    state.processedData.push(row);
                }
                row[mes] += parte;
            });
        });
    });
}

// ========================================
// 2. UI & FILTERS
// ========================================

function initFilters() {
    const setores = new Set(state.processedData.map(r => r.Setor));
    const categorias = new Set(state.processedData.map(r => r.Categoria));
    populateSelect('filterSetor', [...setores].sort());
    populateSelect('filterCategoria', [...categorias].sort());

    const pSelect = document.getElementById('filterPeriodo');
    if (pSelect) {
        pSelect.innerHTML = '';
        state.periodCols.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p; pSelect.appendChild(opt);
        });
    }
}

function updateDashboard() {
    const selP = getSelectedValues('filterPeriodo');
    const selS = getSelectedValues('filterSetor');
    const selC = getSelectedValues('filterCategoria');

    const periods = selP.length ? selP.sort((a, b) => parseDate(a) - parseDate(b)) : state.periodCols;

    state.filteredData = state.processedData.filter(r => {
        if (selS.length && !selS.includes(r.Setor)) return false;
        if (selC.length && !selC.includes(r.Categoria)) return false;
        return true;
    });

    updateKPIs(periods);
    updateCharts(periods);
    updateTable(periods);
}

// ========================================
// 3. KPIs
// ========================================

function updateKPIs(periods) {
    const data = state.filteredData;
    const totalDesp = sumData(data, periods);
    const mediaMensal = totalDesp / (periods.length || 1);

    // --- KPIs Financeiros ---
    const financialCards = [
        { title: 'Total Despesas', val: formatBRL(totalDesp), icon: 'bi-cash-stack', color: 'danger', sub: 'Total acumulado' },
        { title: 'Média Mensal', val: formatBRL(mediaMensal), icon: 'bi-calendar3', color: 'info', sub: 'Média por período' },
        { title: 'Setores', val: new Set(data.map(r => r.Setor)).size, icon: 'bi-building', color: 'primary', sub: 'Setores ativos' },
        { title: 'Categorias', val: new Set(data.map(r => r.Categoria)).size, icon: 'bi-tags', color: 'success', sub: 'Categorias de despesa' }
    ];
    renderCards('kpiRowFinancial', financialCards);

    // --- KPIs de Equipe (Credenciados) ---
    // Calcular média de credenciados no período selecionado
    let totalCredenciados = 0;
    let countCredenciados = 0;

    // Filtro setores selecionados
    const setoresAtivos = new Set(data.map(r => r.Setor));

    periods.forEach(p => {
        setoresAtivos.forEach(s => {
            if (state.equipeMap[s]) {
                totalCredenciados += (state.equipeMap[s][p] || 0);
                countCredenciados++;
            }
        });
    });

    // Média de pessoas no período
    const avgCredenciados = countCredenciados > 0 ? Math.round(totalCredenciados / periods.length) : 0;
    // Custo por Credenciado (Total Despesas / Total Credenciados Acumulados ou média? Vamos usar média mensal / média pessoas)

    const custoPorCredenciado = avgCredenciados > 0 ? (mediaMensal / avgCredenciados) : 0;

    const peopleCards = [
        { title: 'Credenciados (Média)', val: avgCredenciados, icon: 'bi-people', color: 'warning', sub: 'Média no período' },
        { title: 'Custo / Credenciado', val: formatBRL(custoPorCredenciado), icon: 'bi-person-bounding-box', color: 'secondary', sub: 'Custo médio mensal' }
    ];
    renderCards('kpiRowPeople', peopleCards);
}

function renderCards(containerId, cards) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = cards.map(c => `
        <div class="col-md-${12 / cards.length}"> <!-- Ajusta largura -->
            <div class="metric-card card-${c.color} h-100">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="icon-box"><i class="bi ${c.icon}"></i></div>
                </div>
                <div class="title text-muted mb-1">${c.title}</div>
                <div class="value mb-1">${c.val}</div>
                <div class="small text-muted opacity-75">${c.sub}</div>
            </div>
        </div>
    `).join('');
}


// ========================================
// 4. CHARTS
// ========================================

function updateCharts(periods) {
    const data = state.filteredData;

    // Main Chart (Stacked Time)
    const setores = [...new Set(data.map(r => r.Setor))];
    const setorTotals = {};
    const setorSeries = {};

    setores.forEach(s => {
        setorTotals[s] = 0;
        setorSeries[s] = periods.map(p => {
            const v = sumData(data.filter(r => r.Setor === s), [p]);
            setorTotals[s] += v;
            return v;
        });
    });
    const sortedSetores = setores.sort((a, b) => setorTotals[b] - setorTotals[a]);

    renderChart('mainChart', 'bar', {
        labels: periods,
        datasets: sortedSetores.map((s, i) => ({
            label: s, data: setorSeries[s],
            backgroundColor: CONFIG.COLORS.charts[i % CONFIG.COLORS.charts.length],
            datalabels: { align: 'center', anchor: 'center', color: 'white', formatter: v => v > 0 ? formatK(v) : '', display: 'auto' }
        })),
        options: { scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => formatK(v) } } } }
    });

    // Top 10
    const catTotals = {};
    data.forEach(r => {
        const v = sumData([r], periods);
        catTotals[r.Categoria] = (catTotals[r.Categoria] || 0) + v;
    });
    const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    renderChart('topCategoriesChart', 'bar', {
        labels: topCats.map(c => c[0]),
        datasets: [{
            label: 'Total', data: topCats.map(c => c[1]),
            backgroundColor: CONFIG.COLORS.charts,
            datalabels: { anchor: 'end', align: 'end', color: '#555', formatter: v => formatBRL(v, false) }
        }],
        options: { indexAxis: 'y', scales: { x: { display: false }, y: { grid: { display: false } } } }
    });

    // Variation
    if (periods.length > 1) {
        const totals = periods.map(p => sumData(data, [p]));
        const vars = []; const lbls = [];
        for (let i = 1; i < periods.length; i++) {
            const prev = totals[i - 1]; const curr = totals[i];
            vars.push(prev > 0 ? ((curr - prev) / prev) * 100 : 0);
            lbls.push(`${periods[i - 1]} → ${periods[i]}`);
        }
        renderChart('variationChart', 'bar', {
            labels: lbls,
            datasets: [{
                label: 'Var %', data: vars,
                backgroundColor: vars.map(v => v >= 0 ? CONFIG.COLORS.danger : CONFIG.COLORS.success),
                datalabels: { anchor: 'end', align: 'end', formatter: v => v.toFixed(0) + '%' }
            }]
        });
    }

    // Pie
    renderChart('pieChart', 'pie', {
        labels: sortedSetores,
        datasets: [{
            data: sortedSetores.map(s => setorTotals[s]),
            backgroundColor: CONFIG.COLORS.charts,
            datalabels: {
                color: '#fff',
                font: { weight: 'bold' },
                formatter: (value, ctx) => {
                    let sum = ctx.chart._metasets[ctx.datasetIndex].total;
                    let percentage = (value * 100 / sum).toFixed(0) + "%";
                    return percentage;
                }
            }
        }]
    });

    // Line
    renderChart('lineChart', 'line', {
        labels: periods,
        datasets: sortedSetores.map((s, i) => ({
            label: s, data: setorSeries[s],
            borderColor: CONFIG.COLORS.charts[i % CONFIG.COLORS.charts.length],
            fill: false, tension: 0.3, datalabels: { display: false }
        }))
    });
}

function renderChart(id, type, config) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(ctx, {
        type: type, data: { labels: config.labels, datasets: config.datasets },
        options: { responsive: true, plugins: { legend: { display: type !== 'bar' || config.datasets.length > 1 } }, ...config.options }
    });
}

// ========================================
// 4. TABELA - TREE VIEW 3 NÍVEIS
// Setor -> Categoria -> Item
// ========================================

function updateTable(periods) {
    const tbody = document.querySelector('#dataTable tbody');
    const thead = document.querySelector('#dataTable thead');
    if (!tbody) return;

    let headHTML = `<tr><th>Setor / Categoria / Item</th>`; // Coluna unificada
    periods.forEach(p => headHTML += `<th class="text-end">${p}</th>`);
    headHTML += `<th class="text-end">Média</th><th class="text-end">Total</th></tr>`;
    thead.innerHTML = headHTML;

    // Construir árvore: Setor -> Categoria -> Rows
    const tree = {};
    state.filteredData.forEach(r => {
        if (!tree[r.Setor]) tree[r.Setor] = {};
        if (!tree[r.Setor][r.Categoria]) tree[r.Setor][r.Categoria] = [];
        tree[r.Setor][r.Categoria].push(r);
    });

    let html = '';
    const sortedSetores = Object.keys(tree).sort();

    sortedSetores.forEach((setor, sIdx) => {
        const cats = tree[setor];
        const setorId = `s-${sIdx}`;

        // Calcular totais do Setor
        const setorTotals = periods.map(p =>
            Object.values(cats).flat().reduce((acc, r) => acc + (r[p] || 0), 0)
        );
        const setorSum = setorTotals.reduce((a, b) => a + b, 0);

        // NÍVEL 1: SETOR
        html += `
        <tr class="table-secondary fw-bold">
            <td>
                <button class="btn btn-sm btn-link text-dark p-0 me-2 text-decoration-none" 
                    onclick="toggleRow('${setorId}')" id="btn-${setorId}">
                    <i class="bi bi-plus-square-fill"></i>
                </button>
                ${setor}
            </td>
            ${setorTotals.map(v => `<td class="text-end">${formatBRL(v)}</td>`).join('')}
            <td class="text-end text-info">${formatBRL(setorSum / periods.length)}</td>
            <td class="text-end">${formatBRL(setorSum)}</td>
        </tr>`;

        // Container oculto do Setor
        // Truque: adicionar rows filhas com classe identificadora que começa oculta

        Object.keys(cats).sort().forEach((cat, cIdx) => {
            const rows = cats[cat];
            const catId = `${setorId}-c-${cIdx}`;

            const catTotals = periods.map(p => rows.reduce((acc, r) => acc + (r[p] || 0), 0));
            const catSum = catTotals.reduce((a, b) => a + b, 0);

            // NÍVEL 2: CATEGORIA (Oculto por padrão, classe parent-s-X)
            html += `
            <tr class="collapse parent-${setorId} bg-white fw-semibold" style="display:none">
                <td class="ps-4">
                    <button class="btn btn-sm btn-link text-secondary p-0 me-2 text-decoration-none" 
                        onclick="toggleRow('${catId}')" id="btn-${catId}">
                        <i class="bi bi-plus-square"></i>
                    </button>
                    ${cat}
                </td>
                ${catTotals.map(v => `<td class="text-end">${formatBRL(v)}</td>`).join('')}
                <td class="text-end text-muted">${formatBRL(catSum / periods.length)}</td>
                <td class="text-end text-muted">${formatBRL(catSum)}</td>
            </tr>`;

            // NÍVEL 3: ITENS (Oculto por padrão, classe parent-s-X-c-Y)
            // Agrupar itens por descrição
            const itemMap = {};
            rows.forEach(r => {
                if (!itemMap[r.Descricao]) itemMap[r.Descricao] = periods.reduce((o, p) => ({ ...o, [p]: 0 }), {});
                periods.forEach(p => itemMap[r.Descricao][p] += r[p]);
            });

            Object.entries(itemMap).forEach(([desc, vals]) => {
                const itemTotal = periods.reduce((a, p) => a + vals[p], 0);

                html += `
                <tr class="collapse parent-${catId} bg-light text-muted small" style="display:none">
                    <td class="ps-5">└ ${desc}</td>
                     ${periods.map(p => `<td class="text-end">${formatBRL(vals[p])}</td>`).join('')}
                    <td class="text-end">${formatBRL(itemTotal / periods.length)}</td>
                    <td class="text-end">${formatBRL(itemTotal)}</td>
                </tr>`;
            });
        });
    });

    tbody.innerHTML = html;
}

// Função global para expandir/recolher
window.toggleRow = function (id) {
    const children = document.querySelectorAll(`.parent-${id}`);
    const btnIcon = document.querySelector(`#btn-${id} i`);

    let isHidden = true;
    children.forEach(row => {
        if (row.style.display === 'none') {
            row.style.display = 'table-row';
            isHidden = false;
        } else {
            row.style.display = 'none';
            // Se fechou uma categoria, fecha os itens dela também
            if (row.id && row.id.includes(id)) { // recursive close logic simplified
                // na verdade, se fechar Setor, fecha Categoria. Precisamos fechar Itens tb?
                // Para simplificar: apenas toggle direto. O estado do filho mantém ou reseta? Reseta é melhor.
                const grandChildren = document.querySelectorAll(`.parent-${row.id}`); // row id is useless here?
                // Complexidade árvore manual..
                // Melhor abordagem: se abrir, mostra. Se fechar, esconde.
                // E se fechar o pai, esconde os netos.
            }
            isHidden = true;
        }
    });

    // Se fechar o Setor, esconder todas as sub-categorias E itens dele
    if (isHidden) {
        // Encontra elementos que dependem deste ID (sub-niveis)
        // Como o ID é estruturado (s-1 -> s-1-c-0), podemos fazer query
        const allDescendants = document.querySelectorAll(`[class*="parent-${id}"]`);
        allDescendants.forEach(d => {
            d.style.display = 'none';
            // Resetar ícones
            // (Difícil sem ID reverso, mas visualmente resolve o principal)
        });
    }

    // Toggle Icon
    if (btnIcon) {
        if (isHidden) {
            btnIcon.classList.remove('bi-dash-square', 'bi-dash-square-fill');
            btnIcon.classList.add(id.includes('-') ? 'bi-plus-square' : 'bi-plus-square-fill'); // Fill for level 1
        } else {
            btnIcon.classList.remove('bi-plus-square', 'bi-plus-square-fill');
            btnIcon.classList.add(id.includes('-') ? 'bi-dash-square' : 'bi-dash-square-fill');
        }
    }
};

// ========================================
// HELPERS
// ========================================

function safeSetText(id, txt) { const e = document.getElementById(id); if (e) e.textContent = txt; }
function safeSetQueryText(sel, txt) { const e = document.querySelector(sel); if (e) e.textContent = txt; }
function sumData(rows, periods) { return rows.reduce((a, r) => a + periods.reduce((pa, p) => pa + (r[p] || 0), 0), 0); }
function parseCurrency(v) {
    if (typeof v === 'number') return v;
    let s = String(v || 0).replace(/[R$\s]/g, '').trim();
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    return parseFloat(s) || 0;
}
function parseDate(s) { const [m, y] = s.split('/'); const mo = parseInt(m) || CONFIG.MESES[m.substr(0, 3)] || 0; return new Date(parseInt(y) + 2000, mo - 1, 1).getTime(); }
function formatBRL(v, s = true) { return s ? `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
function formatK(v) { if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (v >= 1e3) return (v / 1e3).toFixed(0) + 'k'; return v.toFixed(0); }
function getSelectedValues(id) { const e = document.getElementById(id); return e ? Array.from(e.selectedOptions).map(o => o.value) : []; }
function populateSelect(id, l) { const e = document.getElementById(id); if (e) { e.innerHTML = ''; l.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; e.appendChild(o) }); } }
function showLoading(b) { document.getElementById('loadingOverlay')?.classList.toggle('d-none', !b); }
function handleError(m) { showLoading(false); alert(m); }

// Função Auto-Load
function tryAutoLoad() {
    const defaultFile = 'dados-analise.csv';
    console.log(`Tentando auto-load (${defaultFile})...`);
    fetch(defaultFile)
        .then(response => {
            if (!response.ok) throw new Error("Arquivo padrão não encontrado");
            return response.text();
        })
        .then(text => {
            console.log("Auto-load sucesso!");
            safeSetText('fileStatus', 'Arquivo padrão carregado automaticamente');
            Papa.parse(text, {
                header: true, skipEmptyLines: true,
                complete: (results) => processData(results),
                error: (err) => handleError(err.message)
            });
        })
        .catch(err => {
            console.warn("Auto-load indisponível ou arquivo não encontrado:", err.message);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    safeSetText('appVersion', CONFIG.VERSION);
    document.getElementById('csvFile')?.addEventListener('change', handleFileUpload);
    ['filterPeriodo', 'filterSetor', 'filterCategoria'].forEach(id => document.getElementById(id)?.addEventListener('change', updateDashboard));
    document.getElementById('btnClearFilters')?.addEventListener('click', () => { document.querySelectorAll('select').forEach(s => s.selectedIndex = -1); updateDashboard() });

    // Iniciar tentativa de auto-load
    tryAutoLoad();
});

// ========================================
// PDF EXPORT FUNCTION (Global)
// ========================================

async function exportToPDF() {
    try {
        const btn = document.getElementById('btnExportPDF');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Gerando...';
        btn.disabled = true;

        document.getElementById('loadingOverlay').classList.remove('d-none');

        // --- Configuration ---
        const PAGE_WIDTH = 800;
        const PAGE_HEIGHT = 1130;
        const PAGE_PADDING = 40;

        // --- Helper: Parse Markdown ---
        function parseMarkdown(text) {
            if (!text) return '';
            let md = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            return md.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(line => `<p style="margin: 0 0 10px 0; line-height: 1.5; text-align: justify;">${line}</p>`)
                .join('');
        }

        // --- AI Analysis ---
        let aiAnalysisText = "";
        if (window.getBrisinhAIAnalysis) {
            aiAnalysisText = await window.getBrisinhAIAnalysis();
        }

        // --- Page Builder ---
        const mainContainer = document.createElement('div');
        Object.assign(mainContainer.style, {
            position: 'absolute', top: '0', left: '-9999px', width: (PAGE_WIDTH + 40) + 'px'
        });
        document.body.appendChild(mainContainer);

        let pages = [];
        let currentPage = createPage();
        pages.push(currentPage);
        mainContainer.appendChild(currentPage);

        function createPage() {
            const div = document.createElement('div');
            Object.assign(div.style, {
                width: PAGE_WIDTH + 'px', height: PAGE_HEIGHT + 'px', backgroundColor: 'white',
                padding: PAGE_PADDING + 'px', boxSizing: 'border-box', position: 'relative',
                fontFamily: "'Outfit', sans-serif", color: '#262223', overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
            });
            return div;
        }

        function addToPage(element) {
            currentPage.appendChild(element);
            const totalHeight = Array.from(currentPage.children).reduce((acc, el) => acc + el.offsetHeight + (parseInt(getComputedStyle(el).marginBottom) || 0), 0);
            if (totalHeight > (PAGE_HEIGHT - (PAGE_PADDING * 2))) {
                currentPage.removeChild(element);
                currentPage = createPage();
                pages.push(currentPage);
                mainContainer.appendChild(currentPage);
                currentPage.appendChild(element);
            }
        }

        // --- Header ---
        const headerDiv = document.createElement('div');
        const periods = getSelectedValues('filterPeriodo').join(', ') || 'Todos';
        headerDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #F2911B; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div id="report-logo-ph"></div>
                    <div>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Análise Setorial</h1>
                        <p style="margin: 5px 0 0; color: #6c757d; font-size: 14px;">Mar Brasil</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: 600; margin:0;">Ref: ${periods}</p>
                    <p style="font-size: 12px; color: #6c757d; margin:5px 0 0;">${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>`;

        // Logo
        try {
            const logo = document.querySelector('.sidebar-header img') || document.querySelector('header img');
            if (logo) {
                const c = document.createElement('canvas');
                c.width = logo.naturalWidth; c.height = logo.naturalHeight;
                c.getContext('2d').drawImage(logo, 0, 0);
                const i = document.createElement('img');
                i.src = c.toDataURL();
                i.style.maxHeight = '40px';
                headerDiv.querySelector('#report-logo-ph').appendChild(i);
            }
        } catch (e) { }
        addToPage(headerDiv);

        // --- AI Analysis ---
        const aiHeader = document.createElement('div');
        aiHeader.innerHTML = `<h3 style="font-size: 16px; margin-bottom: 15px; border-left: 5px solid #F2911B; padding-left: 10px; background:#f8f9fa; padding:10px;">🤖 Análise BrisinhAI</h3>`;
        addToPage(aiHeader);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = parseMarkdown(aiAnalysisText || "Análise indisponível.");
        Array.from(tempDiv.children).forEach(p => {
            p.style.fontSize = "12px"; p.style.lineHeight = "1.5"; p.style.marginBottom = "8px";
            const pWrapper = document.createElement('div');
            pWrapper.appendChild(p.cloneNode(true));
            addToPage(pWrapper);
        });
        const spacer = document.createElement('div');
        spacer.innerHTML = "&nbsp;";
        addToPage(spacer);

        // --- KPIs ---
        const kpiSource1 = document.getElementById('kpiRowFinancial');
        if (kpiSource1) {
            const kpiClone = kpiSource1.cloneNode(true);
            kpiClone.style.zoom = "0.8"; // Scale for print
            kpiClone.style.marginBottom = "30px";
            kpiClone.style.display = 'grid';
            kpiClone.style.gridTemplateColumns = 'repeat(4, 1fr)';
            kpiClone.style.gap = '10px';

            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<h6 style="font-size:14px; font-weight:bold; margin-bottom:10px;">KPIs Financeiros</h6>`;
            wrapper.appendChild(kpiClone);
            addToPage(wrapper);
        }

        // --- Charts ---
        const chartIds = [
            { id: 'mainChart', title: 'Despesas por Setor' },
            { id: 'pieChart', title: 'Composição' },
            { id: 'lineChart', title: 'Evolução' },
            { id: 'topCategoriesChart', title: 'Top Categorias' },
            { id: 'variationChart', title: 'Variação Mensal' }
        ];

        // We group charts 2 per row
        for (let i = 0; i < chartIds.length; i += 2) {
            const chartRow = document.createElement('div');
            chartRow.style.display = 'flex';
            chartRow.style.gap = '20px';
            chartRow.style.marginBottom = '20px';
            chartRow.style.height = '250px'; // Fixed height

            for (let j = i; j < i + 2 && j < chartIds.length; j++) {
                const item = chartIds[j];
                const canvasSource = document.getElementById(item.id);
                if (canvasSource) {
                    const card = document.createElement('div');
                    Object.assign(card.style, { flex: '1', border: '1px solid #ddd', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column' });

                    const title = document.createElement('h6');
                    title.textContent = item.title;
                    title.style.fontSize = '12px'; title.style.fontWeight = 'bold'; title.style.marginBottom = '5px';
                    card.appendChild(title);

                    const c = document.createElement('canvas');
                    c.width = canvasSource.width; c.height = canvasSource.height;
                    c.style.width = '100%'; c.style.height = '100%'; c.style.objectFit = 'contain';
                    c.getContext('2d').drawImage(canvasSource, 0, 0);
                    card.appendChild(c);

                    chartRow.appendChild(card);
                }
            }
            addToPage(chartRow);
        }

        // --- Render PDF ---
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const PDF_W = 210; const PDF_H = 297;

        for (let i = 0; i < pages.length; i++) {
            if (i > 0) doc.addPage();
            await new Promise(r => setTimeout(r, 100));
            const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false });
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PDF_W, PDF_H);
        }

        doc.save(`Analise_Setorial_MarBrasil_${new Date().toISOString().slice(0, 10)}.pdf`);

        document.body.removeChild(mainContainer);
        document.getElementById('loadingOverlay').classList.add('d-none');
        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch (e) {
        console.error(e);
        alert("Erro no PDF: " + e.message);
        document.getElementById('loadingOverlay').classList.add('d-none');
        document.getElementById('btnExportPDF').disabled = false;
        document.getElementById('btnExportPDF').innerHTML = 'Exportar PDF';
    }
}

// Expose globally
window.exportToPDF = exportToPDF;
