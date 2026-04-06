// Update: 03/12/2025 14:29

// Configuration
const CONFIG = {
    COLORS: {
        primary: '#F2911B',
        secondary: '#262223',
        success: '#2ecc71',
        danger: '#e74c3c',
        info: '#3498db',
        dark: '#262223',
        light: '#F2F2F2',
        accent: '#00477A'
    },
    MESES_ORDEM: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    ESTRUTURA_DRE: [
        { titulo: "Receita Bruta de Vendas", tipo: "linha", categorias: ["Receita Bruta de Vendas"] },
        { titulo: "Receitas Indiretas", tipo: "linha", categorias: ["Receitas Indiretas"] },
        { titulo: "Total Entradas Operacionais", tipo: "card", var: "total_entradas" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Outras Receitas", tipo: "linha", categorias: ["Outras Receitas"] },
        { titulo: "Receitas Financeiras", tipo: "linha", categorias: ["Receitas Financeiras"] },
        { titulo: "Honorários", tipo: "linha", categorias: ["Honorários"] },
        { titulo: "Juros e Devoluções", tipo: "linha", categorias: ["Juros e devoluções"] },
        { titulo: "Recuperação de Despesas Variáveis", tipo: "linha", categorias: ["Recuperação de Despesas Variáveis"] },
        { titulo: "Outras Entradas", tipo: "card", var: "outras_entradas" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Impostos", tipo: "linha", categorias: ["Impostos"] },
        { titulo: "Provisão IRPJ e CSSL Trimestral", tipo: "linha", categorias: ["Provisão - IRPJ e CSSL Trimestral"] },
        { titulo: "Total de Impostos", tipo: "card", var: "total_impostos" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Credenciado Operacional", tipo: "linha", categorias: ["Credenciado Operacional", "Adiantamento - Credenciado Operacional"] },
        { titulo: "Terceirização de Mão de Obra", tipo: "linha", categorias: ["Terceirização de Mão de Obra"] },
        { titulo: "CLTs", tipo: "linha", categorias: ["Despesas com Pessoal"] },
        { titulo: "Custo dos Serviços Prestados", tipo: "linha", categorias: ["Custo dos Serviços Prestados"] },
        { titulo: "Preventiva - B2G", tipo: "linha", categorias: ["Preventiva - B2G", "Manutenção Preventiva"] },
        { titulo: "Corretiva - B2G", tipo: "linha", categorias: ["Corretiva - B2G", "Manutenção Corretiva"] },
        { titulo: "Outros Custos", tipo: "linha", categorias: ["Outros Custos"] },
        { titulo: "Total Custos Operacionais", tipo: "card", var: "total_custos" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Credenciado Administrativo", tipo: "linha", categorias: ["Credenciado Administrativo", "Adiantamento - Credenciado Administrativo"] },
        { titulo: "Credenciado TI", tipo: "linha", categorias: ["Credenciado TI", "Adiantamento - Credenciado TI"] },
        { titulo: "Despesas Administrativas", tipo: "linha", categorias: ["Despesas Administrativas"] },
        { titulo: "Despesas de Vendas e Marketing", tipo: "linha", categorias: ["Despesas de Vendas e Marketing"] },
        { titulo: "Despesas Financeiras", tipo: "linha", categorias: ["Despesas Financeiras"] },
        { titulo: "Outros Tributos", tipo: "linha", categorias: ["Outros Tributos"] },
        { titulo: "Despesas Eventuais", tipo: "linha", categorias: ["Jurídico"] },
        { titulo: "Despesas Variáveis", tipo: "linha", categorias: ["Despesas Variáveis"] },
        { titulo: "Intermediação de Negócios", tipo: "linha", categorias: ["Intermediação de Negócios"] },
        { titulo: "Total Despesas Rateadas", tipo: "card", var: "total_despesas" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Consórcios a contemplar", tipo: "linha", categorias: ["Consórcios - a contemplar"] },
        { titulo: "Serviços", tipo: "linha_calc", formula: "servicos_menos_consorcios", categorias: ["Serviços"] },
        { titulo: "Ativos", tipo: "linha", categorias: ["Ativos"] },
        { titulo: "Total Investimentos", tipo: "card", var: "total_investimentos" },
        { titulo: "", tipo: "divisor" },
        { titulo: "Total Saídas", tipo: "card", var: "total_saidas" },
        { titulo: "Fluxo de Caixa Livre FCL", tipo: "card", var: "fcl" },
        { titulo: "Lucro s/ Receita Operacional", tipo: "card_percentual", var: "perc_lucro" },
        { titulo: "FCL s/ Receita Operacional", tipo: "card_percentual", var: "perc_fcl" },
        { titulo: "Mútuo Entradas", tipo: "card", var: "mutuo_entradas", categorias: ["Mútuo - Entradas"] },
        { titulo: "Mútuo Saídas", tipo: "card", var: "mutuo_saidas", categorias: ["Mútuo - Saídas"] },
        { titulo: "Distribuição de Dividendos", tipo: "card", var: "dividendos", categorias: ["Distribuição de Dividendos", "Dividendos"] },
        // New Metrics Definitions (for calculation purposes, not necessarily DRE rows)
        { titulo: "Pessoal", tipo: "card", var: "pessoal", categorias: ["Despesas com Pessoal", "Credenciado Administrativo", "Adiantamento - Credenciado Administrativo", "Credenciado TI", "Adiantamento - Credenciado TI", "Credenciado Operacional", "Adiantamento - Credenciado Operacional"] },
        { titulo: "Corretiva", tipo: "card", var: "corretiva", categorias: ["Corretiva - B2G", "Manutenção Corretiva"] },
        { titulo: "Preventiva", tipo: "card", var: "preventiva", categorias: ["Preventiva - B2G", "Manutenção Preventiva"] }
    ]
};

// State
let state = {
    rawData: [],
    filteredData: [],
    mapaMeses: {},
    filters: {
        empresas: [],
        periodos: [],  // ← NOVO
        projetos: [],
        categorias: []
    },
    metrics: {},
    dreData: [],
    charts: {
        main: null,
        pie: null
    }
};

// ========================================
// Google Sheets Integration
// ========================================
async function loadFromGoogleSheets() {
    const SHEET_ID = '1z7dsU-jmd51XVgQonqxJKqXqEAlKuLJiI04KJBt9OQQ';
    const SHEET_NAME = 'Dados';

    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

    document.getElementById('loadingOverlay').classList.remove('d-none');
    document.getElementById('fileStatus').textContent = 'Carregando dados do Google Sheets...';

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}. A planilha precisa estar publicada.`);
        }

        const csvText = await response.text();

        if (!csvText || csvText.trim().length === 0) {
            throw new Error('A planilha está vazia.');
        }

        if (csvText.trim().startsWith('<')) {
            throw new Error('A planilha não está publicada corretamente.');
        }

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: processParsedData
        });

    } catch (error) {
        document.getElementById('loadingOverlay').classList.add('d-none');
        alert(`Erro ao carregar Google Sheets:\n\n${error.message}\n\nVeja as instruções abaixo.`);
        console.error('Erro:', error);
    }
}

// ========================================
// Event Listeners
// ========================================
function initEventListeners() {
    // File Upload
    if (document.getElementById('csvFile')) {
        document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    }

    // Filters
    const filterIds = ['filterPeriodo', 'filterEmpresa', 'filterProjeto', 'filterCategoria'];
    filterIds.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', (e) => {
                const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                const filter = filterId.replace('filter', '');
                const key = filter.toLowerCase() + 's';
                state.filters[key] = selectedOptions;

                // Update cascade if needed
                if (typeof updateCascadeFilters === 'function') {
                    updateCascadeFilters(filter);
                }

                applyFilters();
            });
        }
    });

    // Clear Filters
    if (document.getElementById('btnClearFilters')) {
        document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
    }

    // Mobile Sidebar Toggle
    if (document.getElementById('toggleSidebar')) {
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    // Desktop Sidebar Toggle
    if (document.getElementById('sidebarToggle')) {
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const icon = document.querySelector('#sidebarToggle i');

            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');

            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('bi-chevron-left');
                icon.classList.add('bi-chevron-right');
            } else {
                icon.classList.remove('bi-chevron-right');
                icon.classList.add('bi-chevron-left');
            }
        });
    }

    // Export Table
    if (document.getElementById('btnExportTable')) {
        document.getElementById('btnExportTable').addEventListener('click', exportTableToCSV);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initCharts();
});

// Filters with Cascading Support
const filterOrder = ['Periodo', 'Empresa', 'Projeto', 'Categoria'];
filterOrder.forEach(filter => {
    document.getElementById(`filter${filter}`).addEventListener('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
        const key = filter.toLowerCase() + (filter === 'Mes' ? 'es' : 's'); // pluralize
        state.filters[key] = selectedOptions;

        // Update dependent filters (cascade)
        updateCascadeFilters(filter);

        applyFilters();
    });
});

document.getElementById('btnClearFilters').addEventListener('click', clearFilters);
document.getElementById('toggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

// Desktop Sidebar Toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const icon = document.querySelector('#sidebarToggle i');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');

    if (sidebar.classList.contains('collapsed')) {
        icon.classList.remove('bi-chevron-left');
        icon.classList.add('bi-chevron-right');
    } else {
        icon.classList.remove('bi-chevron-right');
        icon.classList.add('bi-chevron-left');
    }
});

document.getElementById('btnExportTable').addEventListener('click', exportTableToCSV);

function initCharts() {
    const ctxMain = document.getElementById('mainChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');

    // Initialize Main Chart (empty)
    state.charts.main = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Initialize Pie Chart (empty)
    state.charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}

// Data Processing
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('loadingOverlay').classList.remove('d-none');
    document.getElementById('fileStatus').textContent = `Carregando: ${file.name}`;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "ISO-8859-1", // Try Latin-1 first as it's common in Brazil
        complete: (results) => {
            if (results.errors.length > 0 && results.data.length === 0) {
                // Retry with UTF-8 if Latin-1 fails badly
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    encoding: "UTF-8",
                    complete: processParsedData
                });
            } else {
                processParsedData(results);
            }
        }
    });
}

function processParsedData(results) {
    let data = results.data;

    // === DEBUG ADICIONAL ===
    console.log('=== DEBUG processParsedData ===');
    console.log('Total de linhas recebidas:', data.length);
    console.log('Primeira linha RAW:', data[0]);
    console.log('Chaves da primeira linha:', Object.keys(data[0] || {}));
    console.log('Erros do Papa Parse:', results.errors);

    // Clean keys and values
    data = data.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim().replace(/["']/g, '');
            if (cleanKey) {
                newRow[cleanKey] = row[key];
            }
        });
        return newRow;
    });

    // Filter invalid rows
    data = data.filter(row =>
        row['Projeto'] && row['Categoria'] &&
        row['Projeto'].trim() !== '' && row['Categoria'].trim() !== ''
    );

    // Normalize text
    data.forEach(row => {
        row['Projeto'] = toTitleCase(row['Projeto']);
        row['Empresa'] = row['Empresa'] ? row['Empresa'].trim() : '';
        row['Categoria'] = row['Categoria'] ? row['Categoria'].trim() : '';
    });

    // === DEBUG APÓS LIMPEZA ===
    console.log('=== DEBUG APÓS LIMPEZA ===');
    console.log('Total de linhas após limpeza:', data.length);
    console.log('Primeira linha após limpeza:', data[0]);
    console.log('Categoria da primeira linha:', data[0].Categoria);
    console.log('Projeto da primeira linha:', data[0].Projeto);
    console.log('Empresa da primeira linha:', data[0].Empresa);
    console.log('Chaves após limpeza:', Object.keys(data[0] || {}));

    state.rawData = data;
    extractMetadata(data);

    // === DEBUG STATE.RAWDATA ===
    console.log('=== DEBUG STATE.RAWDATA ===');
    console.log('Total no state:', state.rawData.length);
    console.log('Primeira linha no state:', state.rawData[0]);
    console.log('Categoria no state:', state.rawData[0]?.Categoria);

    state.rawData = data;
    extractMetadata(data);

    // Initial Filter Application
    applyFilters();

    document.getElementById('loadingOverlay').classList.add('d-none');
    document.getElementById('fileStatus').textContent = `✅ ${data.length} registros carregados`;
    document.getElementById('lastUpdate').textContent = `Atualizado em: ${new Date().toLocaleTimeString()}`;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

function extractMetadata(data) {
    // Extract all month/year columns
    const colunasData = Object.keys(data[0]).filter(k => !['Empresa', 'Projeto', 'Categoria'].includes(k));
    const periodos = [];
    state.mapaMeses = {};

    colunasData.forEach(col => {
        const partes = col.split('/');
        if (partes.length === 2) {
            const mesNome = partes[0].trim();
            const ano = partes[1].trim();
            const mesNormalizado = normalizeMes(mesNome);
            state.mapaMeses[col] = mesNormalizado;
            periodos.push({ col: col, mes: mesNormalizado, ano: ano });
        }
    });

    // Sort periods chronologically
    periodos.sort((a, b) => {
        const yearDiff = a.ano.localeCompare(b.ano);
        if (yearDiff !== 0) return yearDiff;
        return CONFIG.MESES_ORDEM.indexOf(a.mes) - CONFIG.MESES_ORDEM.indexOf(b.mes);
    });

    const periodosFormatados = periodos.map(p => `${p.mes}/${p.ano}`);

    // Populate Filter Options
    populateSelect('filterPeriodo', periodosFormatados);
    populateSelect('filterEmpresa', [...new Set(data.map(d => d.Empresa))].sort());
    populateSelect('filterProjeto', [...new Set(data.map(d => d.Projeto))].sort());

    // Filtro de Categoria usa coluna "Categoria"
    populateSelect('filterCategoria', [...new Set(data.map(d => d.Categoria))].sort());
}

function normalizeMes(mes) {
    return mes.trim().charAt(0).toUpperCase() + mes.trim().slice(1).toLowerCase();
}

function updateCascadeFilters(changedFilter) {
    // Filter order: Periodo → Empresa → Projeto → Categoria
    const filterOrder = ['Periodo', 'Empresa', 'Projeto', 'Categoria'];
    const changedIndex = filterOrder.indexOf(changedFilter);

    if (changedIndex === -1) return;

    const f = state.filters;

    // Now update subsequent filters
    for (let i = changedIndex + 1; i < filterOrder.length; i++) {
        const filterToUpdate = filterOrder[i];
        let options = [];

        // Build filtered dataset considering all previous filters
        let tempData = [...state.rawData];

        // Apply Period filter
        if (f.periodos && f.periodos.length > 0) {
            const validPeriodCols = [];
            Object.keys(state.mapaMeses).forEach(col => {
                const mes = state.mapaMeses[col];
                const ano = col.split('/')[1]?.trim();
                const periodo = `${mes}/${ano}`;
                if (f.periodos.includes(periodo)) {
                    validPeriodCols.push(col);
                }
            });

            tempData = tempData.map(row => ({
                ...row,
                _hasPeriodData: validPeriodCols.some(col => {
                    const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
                    return val !== 0;
                })
            })).filter(row => row._hasPeriodData);
        }

        // Apply Empresa filter
        if (f.empresas && f.empresas.length > 0 && i > filterOrder.indexOf('Empresa')) {
            tempData = tempData.filter(row => f.empresas.includes(row.Empresa));
        }

        // Apply Projeto filter
        if (f.projetos && f.projetos.length > 0 && i > filterOrder.indexOf('Projeto')) {
            tempData = tempData.filter(row => f.projetos.includes(row.Projeto));
        }

        // Get unique options for this filter
        switch (filterToUpdate) {
            case 'Periodo':
                // Extract unique periods that exist
                const periodosSet = new Set();
                Object.keys(state.mapaMeses).forEach(col => {
                    const mes = state.mapaMeses[col];
                    const ano = col.split('/')[1]?.trim();
                    periodosSet.add(`${mes}/${ano}`);
                });
                options = Array.from(periodosSet).sort((a, b) => {
                    const [mesA, anoA] = a.split('/');
                    const [mesB, anoB] = b.split('/');
                    const yearDiff = anoA.localeCompare(anoB);
                    if (yearDiff !== 0) return yearDiff;
                    return CONFIG.MESES_ORDEM.indexOf(mesA) - CONFIG.MESES_ORDEM.indexOf(mesB);
                });
                break;

            case 'Empresa':
                options = [...new Set(tempData.map(d => d.Empresa))].sort();
                break;

            case 'Projeto':
                options = [...new Set(tempData.map(d => d.Projeto))].sort();
                break;

            case 'Categoria':

                options = [...new Set(tempData.map(d => d.Categoria))].sort();
                break;
        }

        // Update the select element
        const filterId = `filter${filterToUpdate}`;
        populateSelect(filterId, options);

        // Reset the selection for this filter
        const filterKey = filterToUpdate.toLowerCase() + (filterToUpdate === 'Mes' ? 'es' : 's');
        state.filters[filterKey] = [];
    }
}
function populateSelect(id, options) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });
}

// Filtering Logic
function applyFilters() {
    let df = [...state.rawData];
    const f = state.filters;

    // 1. Filter by Empresa
    if (f.empresas && f.empresas.length > 0) {
        df = df.filter(row => f.empresas.includes(row.Empresa));
    }

    // 2. Filter by Projeto
    if (f.projetos && f.projetos.length > 0) {
        df = df.filter(row => f.projetos.includes(row.Projeto));
    }

    // 3. Filter by Categoria (usando filtro "categorias")
    if (f.categorias && f.categorias.length > 0) {
        df = df.filter(row => f.categorias.includes(row.Categoria));
    }

    // 4. Filter Columns (Periods)
    const validColumns = getValidColumns(f.periodos);

    // Calculate Totals
    df.forEach(row => {
        let total = 0;
        validColumns.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            if (!isNaN(val)) total += val;
        });
        row.TotalCalculado = total;
    });

    state.filteredData = df;
    state.validColumns = validColumns;

    calculateDRE();
    updateUI();
}

function getValidColumns(periodosFiltro) {
    const allCols = Object.keys(state.mapaMeses);

    if (!periodosFiltro || periodosFiltro.length === 0) {
        return allCols; // No filter, return all
    }

    return allCols.filter(col => {
        const mes = state.mapaMeses[col];
        const ano = col.split('/')[1]?.trim();
        const periodo = `${mes}/${ano}`;
        return periodosFiltro.includes(periodo);
    });
}

// Core Calculation
function calculateDRE() {
    const df = state.filteredData;
    const cols = state.validColumns;

    // Helper to sum values
    const sumByCat = (categorias) => {
        return df
            .filter(row => categorias.includes(row.Categoria))
            .reduce((sum, row) => {
                let rowSum = 0;
                cols.forEach(col => {
                    rowSum += parseFloat(row[col]?.toString().replace(',', '.') || 0);
                });
                return sum + rowSum;
            }, 0);
    };

    const sumByCatAndMonth = (categorias, col) => {
        return df
            .filter(row => categorias.includes(row.Categoria))
            .reduce((sum, row) => sum + parseFloat(row[col]?.toString().replace(',', '.') || 0), 0);
    };

    // Pre-calculate totals by category
    const catTotals = {};
    const catMonthly = {};

    // Usar 'Categoria' como chave principal
    [...new Set(df.map(r => r.Categoria))].forEach(cat => {
        catTotals[cat] = 0;
        catMonthly[cat] = {};
        cols.forEach(c => catMonthly[cat][c] = 0);
    });

    // Sum usando 'Categoria'
    df.forEach(row => {
        const cat = row.Categoria;
        cols.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            catTotals[cat] += val;
            catMonthly[cat][col] += val;
        });
    });

    // Helper para buscar total da categoria ignorando maiúsculas/minúsculas
    const getCatTotal = (targetCat) => {
        if (!targetCat) return 0;
        const exact = catTotals[targetCat];
        if (exact !== undefined) return exact;

        // Tenta encontrar ignorando maiúsculas/minúsculas e espaços
        const key = Object.keys(catTotals).find(k => k.trim().toLowerCase() === targetCat.trim().toLowerCase());
        return key ? catTotals[key] : 0;
    };

    const getCatMonthly = (targetCat, col) => {
        if (!targetCat) return 0;
        const exact = catMonthly[targetCat]?.[col];
        if (exact !== undefined) return exact;

        const key = Object.keys(catMonthly).find(k => k.trim().toLowerCase() === targetCat.trim().toLowerCase());
        return key ? (catMonthly[key][col] || 0) : 0;
    };
    // DEBUG: Log unique categories and specific totals
    console.log("=== DEBUG: Categorias Encontradas ===");
    console.log("Todas as categorias:", Object.keys(catTotals).sort());
    console.log("\n--- Buscando Preventiva e Corretiva ---");
    console.log("Total para 'Corretiva - B2G':", catTotals["Corretiva - B2G"]);
    console.log("Total para 'Preventiva - B2G':", catTotals["Preventiva - B2G"]);
    console.log("Total para 'Manutenção Corretiva':", catTotals["Manutenção Corretiva"]);
    console.log("Total para 'Manutenção Preventiva':", catTotals["Manutenção Preventiva"]);
    console.log("=====================================\n");

    // --- DRE Structure Calculation ---
    const valoresTotal = {};
    const valoresMensal = {};

    // Special logic for "Serviços" formula
    const servicosBaseTotal = getCatTotal('Serviços');
    const consorciosTotal = getCatTotal('Consórcios - a contemplar');

    CONFIG.ESTRUTURA_DRE.forEach(item => {
        if (item.tipo === 'linha') {
            // Soma categorias usando a função inteligente getCatTotal
            let total = 0;
            item.categorias.forEach(cat => total += getCatTotal(cat));
            valoresTotal[item.titulo] = total;

            valoresMensal[item.titulo] = {};
            cols.forEach(col => {
                let mesTotal = 0;
                item.categorias.forEach(cat => mesTotal += getCatMonthly(cat, col));
                valoresMensal[item.titulo][col] = mesTotal;
            });

        } else if (item.tipo === 'linha_calc') {
            if (item.formula === 'servicos_menos_consorcios') {
                // Aplicar regra: só subtrai se Serviços >= Consórcios, senão = 0
                let totalServicosAjustado = 0;
                if (servicosBaseTotal >= consorciosTotal) {
                    totalServicosAjustado = servicosBaseTotal - consorciosTotal;
                }
                valoresTotal[item.titulo] = totalServicosAjustado;

                valoresMensal[item.titulo] = {};
                cols.forEach(col => {
                    const s = getCatMonthly('Serviços', col);
                    const c = getCatMonthly('Consórcios - a contemplar', col);

                    // Aplicar mesma regra por mês
                    let servicosAjustadoMes = 0;
                    if (s >= c) {
                        servicosAjustadoMes = s - c;
                    }
                    valoresMensal[item.titulo][col] = servicosAjustadoMes;
                });
            }
        }
    });

    // --- Aggregators (Totais) ---
    const getVal = (key) => valoresTotal[key] || 0;

    const receitaOperacional = getVal("Receita Bruta de Vendas");
    const receitaIndireta = getVal("Receitas Indiretas");
    const totalEntradas = receitaOperacional + receitaIndireta;

    const outrasEntradas = getVal("Outras Receitas") +
        getVal("Receitas Financeiras") +
        getVal("Honorários") +
        getVal("Juros e Devoluções") +
        getVal("Recuperação de Despesas Variáveis");

    const totalImpostos = getVal("Impostos") + getVal("Provisão IRPJ e CSSL Trimestral");

    const totalCustos = getVal("Credenciado Operacional") + getVal("Terceirização de Mão de Obra") +
        getVal("CLTs") + getVal("Custo dos Serviços Prestados") + getVal("Preventiva - B2G") +
        getVal("Corretiva - B2G") + getVal("Outros Custos");

    const totalDespesas = getVal("Credenciado Administrativo") + getVal("Credenciado TI") +
        getVal("Despesas Administrativas") + getVal("Despesas de Vendas e Marketing") + getVal("Despesas Financeiras") +
        getVal("Outros Tributos") + getVal("Despesas Eventuais") + getVal("Despesas Variáveis") + getVal("Intermediação de Negócios") +
        getVal("Distribuição de Dividendos");

    // Nova regra de cálculo de Investimentos
    const servicosRaw = getVal("Serviços");
    const consorciosRaw = getVal("Consórcios a contemplar");
    const ativosRaw = getVal("Ativos");

    let servicosAjustado = 0;
    if (servicosRaw >= consorciosRaw) {
        servicosAjustado = servicosRaw - consorciosRaw;
    }

    const totalInvestimentos = ativosRaw + consorciosRaw + servicosAjustado;

    const totalSaidas = totalImpostos + totalCustos + totalDespesas + totalInvestimentos;

    const resultado = totalEntradas + getVal("Ativos") + outrasEntradas - totalSaidas;
    const fcl = resultado - getVal("Ativos");

    const percLucro = totalEntradas !== 0 ? (resultado / totalEntradas * 100) : 0;
    const percFcl = totalEntradas !== 0 ? (fcl / totalEntradas * 100) : 0;

    // --- Novas Métricas e KPI Cards ---
    // Helper para somar lista de categorias usando a busca segura (getCatTotal)
    const sumCategories = (list) => list.reduce((acc, cat) => acc + getCatTotal(cat), 0);

    const credenciados = sumCategories([
        "Credenciado Administrativo", "Adiantamento - Credenciado Administrativo",
        "Credenciado TI", "Adiantamento - Credenciado TI",
        "Credenciado Operacional", "Adiantamento - Credenciado Operacional"
    ]);

    const terceirizacao = sumCategories(["Terceirização de Mão de Obra"]);
    const clts = getCatTotal("Despesas com Pessoal");

    // Pessoal Total = CLT + Terceiros + Credenciados
    const pessoal = clts + terceirizacao + credenciados;

    const corretiva = sumCategories(["Corretiva - B2G", "Manutenção Corretiva"]);
    const preventiva = sumCategories(["Preventiva - B2G", "Manutenção Preventiva"]);

    // Calcular Total e Média de Equipamentos
    const totalEquipamentos = getCatTotal("Equipamentos");
    const mediaEquipamentos = cols.length > 0 ? (totalEquipamentos / cols.length) : 0;
    // Store Metrics
    state.metrics = {
        total_entradas: totalEntradas,
        outras_entradas: outrasEntradas,
        total_impostos: totalImpostos,
        total_custos: totalCustos,
        total_despesas: totalDespesas,
        total_investimentos: totalInvestimentos,
        total_saidas: totalSaidas,
        resultado: resultado,
        fcl: fcl,
        perc_lucro: percLucro,
        perc_fcl: percFcl,
        pessoal: pessoal,
        corretiva: corretiva,
        preventiva: preventiva,
        total_equipamentos: totalEquipamentos,
        media_equipamentos: mediaEquipamentos,
        credenciados: credenciados,
        clts: clts,
        terceirizacao: terceirizacao,
        // Percentuais em relação à Receita Operacional
        perc_total_saidas: totalEntradas !== 0 ? (totalSaidas / totalEntradas * 100) : 0,
        perc_resultado: totalEntradas !== 0 ? (resultado / totalEntradas * 100) : 0,
        perc_fcl_receita: totalEntradas !== 0 ? (fcl / totalEntradas * 100) : 0,
        // Percentuais em relação ao Total de Saídas
        perc_custos: totalSaidas !== 0 ? (totalCustos / totalSaidas * 100) : 0,
        perc_despesas: totalSaidas !== 0 ? (totalDespesas / totalSaidas * 100) : 0,
        perc_investimentos: totalSaidas !== 0 ? (totalInvestimentos / totalSaidas * 100) : 0,
        perc_impostos: totalSaidas !== 0 ? (totalImpostos / totalSaidas * 100) : 0,
        perc_pessoal: totalSaidas !== 0 ? (pessoal / totalSaidas * 100) : 0,
        perc_corretiva: totalSaidas !== 0 ? (corretiva / totalSaidas * 100) : 0,
        perc_preventiva: totalSaidas !== 0 ? (preventiva / totalSaidas * 100) : 0,
        // Percentuais em relação à Receita Operacional (para row2)
        perc_custos_receita: totalEntradas !== 0 ? (totalCustos / totalEntradas * 100) : 0,
        perc_despesas_receita: totalEntradas !== 0 ? (totalDespesas / totalEntradas * 100) : 0,
        perc_investimentos_receita: totalEntradas !== 0 ? (totalInvestimentos / totalEntradas * 100) : 0,
        perc_impostos_receita: totalEntradas !== 0 ? (totalImpostos / totalEntradas * 100) : 0,
        perc_pessoal_receita: totalEntradas !== 0 ? (pessoal / totalEntradas * 100) : 0,
        perc_credenciados_receita: totalEntradas !== 0 ? (credenciados / totalEntradas * 100) : 0,
        perc_clts_receita: totalEntradas !== 0 ? (clts / totalEntradas * 100) : 0,
        perc_terceirizacao_receita: totalEntradas !== 0 ? (terceirizacao / totalEntradas * 100) : 0,
        perc_corretiva_receita: totalEntradas !== 0 ? (corretiva / totalEntradas * 100) : 0,
        perc_preventiva_receita: totalEntradas !== 0 ? (preventiva / totalEntradas * 100) : 0,
        // Percentuais em relação ao Pessoal (para Credenciados, CLTs, Terceirização)
        perc_credenciados_pessoal: pessoal !== 0 ? (credenciados / pessoal * 100) : 0,
        perc_clts_pessoal: pessoal !== 0 ? (clts / pessoal * 100) : 0,
        perc_terceirizacao_pessoal: pessoal !== 0 ? (terceirizacao / pessoal * 100) : 0,
        // Detailed for charts
        receita_operacional: receitaOperacional,
        receita_indireta: receitaIndireta,
        perc_credenciados: totalSaidas !== 0 ? (credenciados / totalSaidas * 100) : 0,
        perc_clts: totalSaidas !== 0 ? (clts / totalSaidas * 100) : 0,
        perc_terceirizacao: totalSaidas !== 0 ? (terceirizacao / totalSaidas * 100) : 0,
    };

    // Prepare Table Data
    state.dreData = [];
    CONFIG.ESTRUTURA_DRE.forEach(item => {
        if (item.tipo === 'divisor') {
            state.dreData.push({ type: 'divisor' });
        } else if (['linha', 'linha_calc'].includes(item.type) || ['linha', 'linha_calc'].includes(item.tipo)) {
            const row = {
                descricao: item.titulo,
                type: 'data',
                total: valoresTotal[item.titulo] || 0,
                media: (valoresTotal[item.titulo] || 0) / (cols.length || 1),
                meses: valoresMensal[item.titulo] || {},
                // Calculate Year Totals
                total2024: calculateYearTotal(item.titulo, '2024', valoresMensal),
                total2025: calculateYearTotal(item.titulo, '2025', valoresMensal)
            };
            row.total2425 = row.total2024 + row.total2025;
            state.dreData.push(row);
        }
    });
}

function calculateYearTotal(titulo, year, valoresMensal) {
    let sum = 0;
    const rowValues = valoresMensal[titulo] || {};
    Object.keys(rowValues).forEach(col => {
        // Check if the column name contains the year (e.g., "Jan/24" contains "24")
        // We use the last two digits of the year for matching if the full year isn't present
        const shortYear = year.slice(-2);
        if (col.includes(year) || col.includes('/' + shortYear)) {
            sum += rowValues[col];
        }
    });
    return sum;
}

// UI Updates
function updateUI() {
    updateCards();
    updateCharts();
    updateTable();
}

function updateCards() {
    const m = state.metrics;

    // Row 1 (Main KPIs)
    const row1 = [
        {
            key: 'total_entradas',
            title: 'Receitas Totais',
            icon: 'bi-graph-up-arrow',
            color: 'primary',
            bgColor: 'bg-blue-soft',
            isBreakdown: true,
            isClickable: true,
            breakdown: {
                total: m.total_entradas + m.outras_entradas,
                items: [
                    { label: 'Operacionais', value: m.total_entradas },
                    { label: 'Outras Entradas', value: m.outras_entradas }
                ]
            }
        },

        { key: 'total_saidas', title: 'Total Saídas', icon: 'bi-graph-down-arrow', color: 'danger', bgColor: 'bg-red-soft', percentKey: 'perc_total_saidas', percentRefIcon: 'bi-graph-up-arrow' },
        { key: 'resultado', title: 'Resultado', icon: 'bi-bullseye', color: 'highlight', bgColor: 'bg-yellow-soft', percentKey: 'perc_resultado', percentRefIcon: 'bi-graph-up-arrow' },
        { key: 'fcl', title: 'FCL', icon: 'bi-wallet2', color: 'success', bgColor: 'bg-green-soft', percentKey: 'perc_fcl_receita', percentRefIcon: 'bi-graph-up-arrow' }
    ];

    renderCards('kpiRow1', row1, m, 3);

    // Row 2 (Secondary KPIs + New Metrics)
    const row2 = [
        { key: 'total_custos', title: 'Custos Operacionais', icon: 'bi-gear', color: 'info', percentKey: 'perc_custos', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_custos_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'total_despesas', title: 'Despesas Rateadas', icon: 'bi-calculator', color: 'info', percentKey: 'perc_despesas', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_despesas_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'total_investimentos', title: 'Investimentos', icon: 'bi-piggy-bank', color: 'info', percentKey: 'perc_investimentos', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_investimentos_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'total_impostos', title: 'Impostos', icon: 'bi-bank', color: 'danger', percentKey: 'perc_impostos', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_impostos_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'total_equipamentos', title: 'Total Equipamentos', icon: 'bi-pc-display-horizontal', color: 'success', isInteger: true },
        { key: 'media_equipamentos', title: 'Média Equipamentos', icon: 'bi-pc-display', color: 'success', isInteger: true },
        // New Cards
        { key: 'pessoal', title: 'Pessoal', icon: 'bi-people', color: 'info', percentKey: 'perc_pessoal', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_pessoal_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'credenciados', title: 'Credenciados', icon: 'bi-person-badge', color: 'primary', percentKey: 'perc_credenciados', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_credenciados_receita', percentRefIcon2: 'bi-graph-up-arrow', percentKey3: 'perc_credenciados_pessoal', percentRefIcon3: 'bi-people' },
        { key: 'clts', title: 'CLTs', icon: 'bi-person-vcard', color: 'success', percentKey: 'perc_clts', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_clts_receita', percentRefIcon2: 'bi-graph-up-arrow', percentKey3: 'perc_clts_pessoal', percentRefIcon3: 'bi-people' },
        { key: 'terceirizacao', title: 'Terceirização', icon: 'bi-people-fill', color: 'warning', percentKey: 'perc_terceirizacao', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_terceirizacao_receita', percentRefIcon2: 'bi-graph-up-arrow', percentKey3: 'perc_terceirizacao_pessoal', percentRefIcon3: 'bi-people' },
        { key: 'corretiva', title: 'Corretiva', icon: 'bi-tools', color: 'danger', percentKey: 'perc_corretiva', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_corretiva_receita', percentRefIcon2: 'bi-graph-up-arrow' },
        { key: 'preventiva', title: 'Preventiva', icon: 'bi-shield-check', color: 'success', percentKey: 'perc_preventiva', percentRefIcon: 'bi-graph-down-arrow', percentKey2: 'perc_preventiva_receita', percentRefIcon2: 'bi-graph-up-arrow' }
    ];

    // Adjust column size for row 2 to fit more cards (e.g., col-lg-2 for 6 cards per row)
    // We have 12 cards now in row 2. 2 per row on mobile, 4 or 6 on desktop.
    renderCards('kpiRow2', row2, m, 2);
}

function renderCards(containerId, cards, metrics, colSize) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    cards.forEach(card => {
        const val = metrics[card.key] || 0;
        let formattedVal;
        if (card.isPercent) {
            formattedVal = val.toFixed(2) + '%';
        } else if (card.isInteger) {
            formattedVal = Math.abs(Math.round(val)).toLocaleString('pt-BR');
        } else {
            formattedVal = formatCurrency(val);
        }

        const colClass = `col-6 col-md-4 col-lg-${colSize}`;
        const cardClass = card.color === 'highlight' ? 'card-highlight' : `card-${card.color}`;
        const bgClass = card.bgColor || '';

        // Adicionar percentuais se existirem
        let percentHtml = '';
        let percents = [];

        if (card.percentKey && metrics[card.percentKey] !== undefined) {
            const percentVal = metrics[card.percentKey];
            const refIcon = card.percentRefIcon ? `<i class="bi ${card.percentRefIcon}"></i>` : '';
            const refClass = card.percentRefIcon === 'bi-graph-up-arrow' ? 'percent-ref-receitas' : 'percent-ref-saidas';
            percents.push(`<div class="card-percent ${refClass}">${refIcon}${percentVal.toFixed(1)}%</div>`);
        }

        if (card.percentKey2 && metrics[card.percentKey2] !== undefined) {
            const percentVal2 = metrics[card.percentKey2];
            const refIcon2 = card.percentRefIcon2 ? `<i class="bi ${card.percentRefIcon2}"></i>` : '';
            const refClass2 = card.percentRefIcon2 === 'bi-graph-up-arrow' ? 'percent-ref-receitas' : 'percent-ref-saidas';
            percents.push(`<div class="card-percent ${refClass2}">${refIcon2}${percentVal2.toFixed(1)}%</div>`);
        }

        if (card.percentKey3 && metrics[card.percentKey3] !== undefined) {
            const percentVal3 = metrics[card.percentKey3];
            const refIcon3 = card.percentRefIcon3 ? `<i class="bi ${card.percentRefIcon3}"></i>` : '';
            percents.push(`<div class="card-percent percent-ref-pessoal">${refIcon3}${percentVal3.toFixed(1)}%</div>`);
        }

        if (percents.length > 0) {
            percentHtml = `<div class="card-percents-container">${percents.join('')}</div>`;
        }

        // Definir comportamento de clique
        const clickableClass = card.key === 'total_equipamentos' ? 'card-clickable' : '';
        const clickHandler = card.key === 'total_equipamentos'
            ? 'onclick="openPorMaquinaModal()"'
            : `onclick="showCardDetails('${card.key}', '${card.title}')"`;

        // Declarar html uma única vez
        let html;

        // Verificar se é card com breakdown
        if (card.isBreakdown && card.breakdown) {
            // Definir se é clicável
            const breakdownClickClass = card.isClickable ? 'card-clickable' : '';
            const breakdownClickHandler = card.isClickable ? `onclick="showCardDetails('${card.key}', '${card.title}')"` : '';

            html = `
                <div class="${colClass}">
                    <div class="metric-card ${cardClass} ${bgClass} ${breakdownClickClass}" ${breakdownClickHandler}>
                        <div class="icon-box">
                            <i class="bi ${card.icon}"></i>
                        </div>
                        <div class="title">${card.title}</div>
                        <div class="value" style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem;">
                            ${formatCurrency(card.breakdown.total)}
                        </div>
                        <div class="breakdown-container">
                            ${card.breakdown.items.map(item => `
                                <div class="breakdown-item">
                                    <span class="breakdown-label">${item.label}</span>
                                    <span class="breakdown-value">${formatCurrency(item.value)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
    `;
        } else {
            // Card normal
            html = `
                <div class="${colClass}">
                    <div class="metric-card ${cardClass} ${bgClass} ${clickableClass}" ${clickHandler}>
                        <div class="icon-box">
                            <i class="bi ${card.icon}"></i>
                        </div>
                        <div class="title">${card.title}</div>
                        <div class="value">${formattedVal}</div>
                        ${percentHtml}
                    </div>
                </div>
            `;
        }

        container.insertAdjacentHTML('beforeend', html);
    }); // Fecha o forEach
} // Fecha a função renderCards


function updateCharts() {
    const ctxMain = document.getElementById('mainChart').getContext('2d');
    const ctxPie = document.getElementById('pieChart').getContext('2d');

    // Prepare Data for Main Chart (Monthly)
    const labels = state.validColumns.map(c => {
        // c is already "Mes/Ano" format from the CSV headers usually, or we ensure it is
        // The CSV headers are like "jan/24", "fev/24".
        // Let's capitalize them properly: "Jan/24"
        const [mes, ano] = c.split('/');
        return `${mes.charAt(0).toUpperCase() + mes.slice(1)}/${ano}`;
    });

    // Helper: Pegar valor de uma linha específica
    const getRowValue = (descricao, col) => {
        const row = state.dreData.find(r => r.type === 'data' && r.descricao === descricao);
        return row ? (row.meses[col] || 0) : 0;
    };

    // 1. Receitas Operacionais (Monthly)
    const monthlyReceitas = labels.map((_, i) => {
        const col = state.validColumns[i];
        return getRowValue('Receita Bruta de Vendas', col) + getRowValue('Receitas Indiretas', col);
    });

    // 2. Saídas (Monthly)
    const monthlySaidas = labels.map((_, i) => {
        const col = state.validColumns[i];
        let total = 0;

        // Impostos
        total += getRowValue('Impostos', col);
        total += getRowValue('Provisão IRPJ e CSSL Trimestral', col);

        // Custos
        total += getRowValue('Credenciado Operacional', col);
        total += getRowValue('Terceirização de Mão de Obra', col);
        total += getRowValue('CLTs', col);
        total += getRowValue('Custo dos Serviços Prestados', col);
        total += getRowValue('Preventiva - B2G', col);
        total += getRowValue('Corretiva - B2G', col);
        total += getRowValue('Outros Custos', col);

        // Despesas
        total += getRowValue('Credenciado Administrativo', col);
        total += getRowValue('Credenciado TI', col);
        total += getRowValue('Despesas Administrativas', col);
        total += getRowValue('Despesas de Vendas e Marketing', col);
        total += getRowValue('Despesas Financeiras', col);
        total += getRowValue('Outros Tributos', col);
        total += getRowValue('Despesas Eventuais', col);
        total += getRowValue('Despesas Variáveis', col);
        total += getRowValue('Intermediação de Negócios', col);

        // Investimentos
        total += getRowValue('Consórcios a contemplar', col);
        total += getRowValue('Serviços', col);
        total += getRowValue('Ativos', col);

        return total;
    });

    // 3. Resultado (Monthly) = MESMA LÓGICA DOS CARDS
    const monthlyResult = labels.map((_, i) => {
        const col = state.validColumns[i];

        // Total Entradas
        const totalEntradas = monthlyReceitas[i];

        // Outras Entradas
        const outrasEntradas = getRowValue('Outras Receitas', col) +
            getRowValue('Receitas Financeiras', col) +
            getRowValue('Honorários', col) +
            getRowValue('Juros e Devoluções', col);

        // Ativos
        const ativos = getRowValue('Ativos', col);

        // Total Saídas
        const totalSaidas = monthlySaidas[i];

        // Resultado = totalEntradas + ativos + outrasEntradas - totalSaidas
        return totalEntradas + ativos + outrasEntradas - totalSaidas;
    });

    // 4. FCL (Monthly) = Resultado - Ativos
    const monthlyFCL = labels.map((_, i) => {
        const col = state.validColumns[i];
        const resultado = monthlyResult[i];
        const ativos = getRowValue('Ativos', col);
        return resultado - ativos;
    });

    // Tooltip Callback for Percentage Change
    const tooltipCallback = {
        label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
                label += ': ';
            }
            if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
            }

            const dataIndex = context.dataIndex;
            if (dataIndex > 0) {
                const current = context.parsed.y;
                const prev = context.dataset.data[dataIndex - 1];

                if (prev !== 0) {
                    const change = ((current - prev) / Math.abs(prev)) * 100;
                    const icon = change >= 0 ? '▲' : '▼';
                    label += ` (${icon} ${Math.abs(change).toFixed(1)}%)`;
                }
            }
            return label;
        }
    };

    if (state.charts.main) state.charts.main.destroy();
    state.charts.main = new Chart(ctxMain, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas Operacionais',
                    data: monthlyReceitas,
                    backgroundColor: CONFIG.COLORS.primary,
                    borderRadius: 4,
                    order: 3
                },
                {
                    label: 'Saídas',
                    data: monthlySaidas,
                    backgroundColor: CONFIG.COLORS.danger,
                    borderRadius: 4,
                    order: 4
                },
                {
                    label: 'Resultado',
                    data: monthlyResult,
                    type: 'line',
                    borderColor: CONFIG.COLORS.secondary,
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: CONFIG.COLORS.secondary,
                    order: 1
                },
                {
                    label: 'FCL',
                    data: monthlyFCL,
                    type: 'line',
                    borderColor: CONFIG.COLORS.success,
                    borderWidth: 2,
                    tension: 0.4,
                    pointBackgroundColor: CONFIG.COLORS.success,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: tooltipCallback
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [2, 4] }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Pie Chart
    const m = state.metrics;
    if (state.charts.pie) state.charts.pie.destroy();

    const pieData = [m.total_custos, m.total_despesas, m.total_impostos, m.total_investimentos];
    const pieTotal = pieData.reduce((a, b) => a + b, 0);

    state.charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Custos', 'Despesas', 'Impostos', 'Investimentos'],
            datasets: [{
                data: pieData,
                backgroundColor: [CONFIG.COLORS.info, CONFIG.COLORS.secondary, CONFIG.COLORS.danger, CONFIG.COLORS.success],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.parsed;
                            const percentage = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) + '%' : '0%';
                            return `${context.label}: ${formatCurrency(value)} (${percentage})`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function updateTable() {
    const thead = document.querySelector('#dreTable thead');
    const tbody = document.querySelector('#dreTable tbody');

    // Identify 2024 and 2025 columns
    const cols2024 = state.validColumns.filter(c => c.includes('24'));
    const cols2025 = state.validColumns.filter(c => c.includes('25'));

    // Sort columns chronologically (assuming they are already sorted by input, but let's be safe if needed, though input order is usually chronological)
    // For now, we trust state.validColumns order.

    // Headers
    let headerHTML = '<tr><th style="min-width: 250px;">Descrição</th>';

    // Add 2024 columns
    cols2024.forEach(col => {
        headerHTML += `<th class="text-end">${col}</th>`;
    });
    // Add Total 2024
    if (cols2024.length > 0) {
        headerHTML += `<th class="text-end table-warning">Total 2024</th>`;
    }

    // Add 2025 columns
    cols2025.forEach(col => {
        headerHTML += `<th class="text-end">${col}</th>`;
    });
    // Add Total 2025
    if (cols2025.length > 0) {
        headerHTML += `<th class="text-end table-warning">Total 2025</th>`;
    }

    headerHTML += '<th class="text-end table-secondary text-white">Total 24/25</th>';
    headerHTML += '<th class="text-end bg-light">Média</th>';
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // Body
    let bodyHTML = '';
    state.dreData.forEach(row => {
        if (row.type === 'divisor') {
            // Calculate colspan dynamically
            let colSpan = 1 + cols2024.length + (cols2024.length > 0 ? 1 : 0) + cols2025.length + (cols2025.length > 0 ? 1 : 0) + 2;
            bodyHTML += `<tr><td colspan="${colSpan}" class="p-0"><hr class="my-0 border-secondary opacity-25"></td></tr>`;
        } else {
            bodyHTML += `<tr>`;
            bodyHTML += `<td class="fw-medium">${row.descricao}</td>`;

            // 2024 Values
            cols2024.forEach(col => {
                bodyHTML += `<td class="text-end">${formatCurrency(row.meses[col] || 0)}</td>`;
            });
            // Total 2024
            if (cols2024.length > 0) {
                bodyHTML += `<td class="text-end table-warning fw-bold">${formatCurrency(row.total2024)}</td>`;
            }

            // 2025 Values
            cols2025.forEach(col => {
                bodyHTML += `<td class="text-end">${formatCurrency(row.meses[col] || 0)}</td>`;
            });
            // Total 2025
            if (cols2025.length > 0) {
                bodyHTML += `<td class="text-end table-warning fw-bold">${formatCurrency(row.total2025)}</td>`;
            }

            // Total 24/25 & Media
            bodyHTML += `<td class="text-end table-secondary text-white fw-bold">${formatCurrency(row.total2425)}</td>`;
            bodyHTML += `<td class="text-end text-muted bg-light">${formatCurrency(row.media)}</td>`;
            bodyHTML += `</tr>`;
        }
    });
    tbody.innerHTML = bodyHTML;
}

// Utils
function formatCurrency(value) {
    if (value === undefined || value === null) return 'R$ 0';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function clearFilters() {
    document.querySelectorAll('select').forEach(select => select.value = '');
    state.filters = { empresas: [], periodos: [], projetos: [], categorias: [] };
    applyFilters();
}

function showCardDetails(key, title) {
    const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
    document.getElementById('modalTitle').textContent = title;

    let total = state.metrics[key] || 0;
    // Correção: Para Receitas Totais, somar Operacionais + Outras Entradas no total do modal
    if (key === 'total_entradas') {
        total += (state.metrics.outras_entradas || 0);
    }

    document.getElementById('modalTotalValue').textContent = formatCurrency(total);
    document.getElementById('modalAvgValue').textContent = formatCurrency(total / (state.validColumns.length || 1));

    // Logic to find contributing categories
    let contributingCategories = [];

    // We need to look at CONFIG.ESTRUTURA_DRE to find which categories map to this metric
    // Or if it's a direct aggregate like 'total_custos', we find the lines that sum up to it.

    // Map metric keys to DRE Line Titles or Categories
    const metricMap = {
        'total_entradas': ['Receita Bruta de Vendas', 'Receitas Indiretas', 'Outras Receitas', 'Receitas Financeiras', 'Honorários', 'Juros e devoluções', 'Recuperação de Despesas Variáveis'],
        'outras_entradas': ['Outras Receitas', 'Receitas Financeiras', 'Honorários', 'Juros e devoluções'],
        'total_impostos': ['Impostos', 'Provisão - IRPJ e CSSL Trimestral'],
        'total_custos': ['Credenciado Operacional', 'Adiantamento - Credenciado Operacional', 'Terceirização de Mão de Obra', 'Despesas com Pessoal', 'Custo dos Serviços Prestados', 'Preventiva - B2G', 'Manutenção Preventiva', 'Corretiva - B2G', 'Manutenção Corretiva', 'Outros Custos'],
        'total_despesas': ['Credenciado Administrativo', 'Adiantamento - Credenciado Administrativo', 'Credenciado TI', 'Adiantamento - Credenciado TI', 'Despesas Administrativas', 'Despesas de Vendas e Marketing', 'Despesas Financeiras', 'Outros Tributos', 'Jurídico', 'Despesas Variáveis', 'Intermediação de Negócios', 'Distribuição de Dividendos', 'Dividendos'],
        'total_investimentos': ['Consórcios - a contemplar', 'Serviços', 'Ativos'],
        'mutuo_entradas': ['Mútuo - Entradas'],
        'mutuo_saidas': ['Mútuo - Saídas'],
        'dividendos': ['Distribuição de Dividendos', 'Dividendos'],
        'pessoal': ["Despesas com Pessoal", "Credenciado Administrativo", "Adiantamento - Credenciado Administrativo", "Credenciado TI", "Adiantamento - Credenciado TI", "Credenciado Operacional", "Adiantamento - Credenciado Operacional", "Terceirização de Mão de Obra"],
        'corretiva': ["Corretiva - B2G", "Manutenção Corretiva"],
        'preventiva': ["Preventiva - B2G", "Manutenção Preventiva"],
        'credenciados': ["Credenciado Administrativo", "Adiantamento - Credenciado Administrativo", "Credenciado TI", "Adiantamento - Credenciado TI", "Credenciado Operacional", "Adiantamento - Credenciado Operacional"],
        'clts': ["Despesas com Pessoal"],
        'terceirizacao': ["Terceirização de Mão de Obra"]
    };

    const targetCategories = metricMap[key];

    if (targetCategories) {
        // Calculate totals for these categories from filtered data
        const catTotals = {};
        state.filteredData.forEach(row => {
            if (targetCategories.includes(row.Categoria)) {
                if (!catTotals[row.Categoria]) catTotals[row.Categoria] = 0;
                // Sum only valid columns
                state.validColumns.forEach(col => {
                    catTotals[row.Categoria] += parseFloat(row[col]?.toString().replace(',', '.') || 0);
                });
            }
        });

        // Convert to array and sort
        contributingCategories = Object.entries(catTotals)
            .map(([cat, val]) => ({ category: cat, value: val }))
            .sort((a, b) => b.value - a.value);

    } else if (key === 'total_saidas') {
        // Breakdown for Total Saídas
        const m = state.metrics;
        contributingCategories = [
            { category: 'Custos Operacionais', value: m.total_custos },
            { category: 'Despesas Rateadas', value: m.total_despesas },
            { category: 'Impostos', value: m.total_impostos },
            { category: 'Investimentos', value: m.total_investimentos }
        ].sort((a, b) => b.value - a.value);
    } else if (key === 'resultado' || key === 'fcl') {
        // For high level aggregates, maybe show the major groups?
        // For now, let's just show a message for these complex ones or try to break it down by major groups
        contributingCategories = []; // Keep empty to show "Details unavailable" or handle differently
    }

    const tbody = document.querySelector('#modalTable tbody');
    tbody.innerHTML = '';

    if (contributingCategories.length > 0) {
        contributingCategories.forEach(item => {
            const percent = total !== 0 ? (item.value / total * 100).toFixed(1) + '%' : '0%';
            const row = `
                <tr>
                    <td>${item.category}</td>
                    <td class="text-end">${formatCurrency(item.value)}</td>
                    <td class="text-end">${percent}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Detalhamento não disponível para este item consolidado.</td></tr>';
    }

    modal.show();
}

function exportTableToCSV() {
    // Simple CSV export implementation
    let csv = [];
    const rows = document.querySelectorAll("#dreTable tr");

    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++)
            row.push('"' + cols[j].innerText + '"');
        csv.push(row.join(","));
    }

    downloadCSV(csv.join("\n"), "dre_export.csv");
}

function downloadCSV(csv, filename) {
    let csvFile;
    let downloadLink;

    csvFile = new Blob([csv], { type: "text/csv" });
    downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
}

// ========================================
// PDF EXPORT FUNCTION
// ========================================
async function exportToPDF() {
    try {
        // Show loading overlay
        document.getElementById('loadingOverlay').classList.remove('d-none');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        let yPosition = 20;
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;

        // ========== PÁGINA 1: CABEÇALHO E FILTROS ==========

        // Logo (se existir)
        const logo = document.querySelector('header img');
        if (logo && logo.complete) {
            try {
                const logoCanvas = await html2canvas(logo, { scale: 2 });
                const logoData = logoCanvas.toDataURL('image/png');
                doc.addImage(logoData, 'PNG', margin, yPosition, 40, 10);
            } catch (e) {
                console.log('Logo não capturado');
            }
        }

        // Título
        doc.setFontSize(20);
        doc.setTextColor(38, 34, 35);
        doc.text('Demonstração do Resultado - DRE', pageWidth / 2, yPosition + 15, { align: 'center' });

        // Data de geração
        doc.setFontSize(10);
        doc.setTextColor(108, 117, 125);
        const dataGeracao = new Date().toLocaleString('pt-BR');
        doc.text(`Gerado em: ${dataGeracao}`, pageWidth / 2, yPosition + 22, { align: 'center' });

        yPosition = 50;

        // Filtros aplicados
        doc.setFontSize(12);
        doc.setTextColor(38, 34, 35);
        doc.text('Filtros Aplicados:', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setTextColor(108, 117, 125);

        const filtros = [];
        if (state.filters.anos?.length > 0) filtros.push(`Anos: ${state.filters.anos.join(', ')}`);
        if (state.filters.meses?.length > 0) filtros.push(`Meses: ${state.filters.meses.join(', ')}`);
        if (state.filters.empresas?.length > 0) filtros.push(`Empresas: ${state.filters.empresas.join(', ')}`);
        if (state.filters.projetos?.length > 0) filtros.push(`Projetos: ${state.filters.projetos.join(', ')}`);

        if (filtros.length === 0) {
            doc.text('Todos os dados (sem filtros)', margin + 5, yPosition);
            yPosition += 6;
        } else {
            filtros.forEach(filtro => {
                doc.text(`• ${filtro}`, margin + 5, yPosition);
                yPosition += 6;
            });
        }

        yPosition += 10;

        // ========== CARDS PRINCIPAIS ==========
        doc.setFontSize(14);
        doc.setTextColor(38, 34, 35);
        doc.text('Indicadores Principais', margin, yPosition);
        yPosition += 10;

        const kpiData = [
            { label: 'Receitas Operacionais', value: state.metrics.total_entradas || 0 },
            { label: 'Total Saídas', value: state.metrics.total_saidas || 0 },
            { label: 'Resultado', value: state.metrics.resultado || 0 },
            { label: 'FCL', value: state.metrics.fcl || 0 }
        ];

        const cardWidth = (pageWidth - 2 * margin - 9) / 2;
        const cardHeight = 25;
        let xPos = margin;
        let row = 0;

        kpiData.forEach((kpi, index) => {
            if (index % 2 === 0 && index > 0) {
                row++;
                xPos = margin;
            }

            const yPos = yPosition + (row * (cardHeight + 5));

            // Fundo do card
            doc.setFillColor(245, 245, 245);
            doc.rect(xPos, yPos, cardWidth, cardHeight, 'F');

            // Label
            doc.setFontSize(9);
            doc.setTextColor(108, 117, 125);
            doc.text(kpi.label, xPos + 3, yPos + 7);

            // Valor
            doc.setFontSize(14);
            doc.setTextColor(38, 34, 35);
            doc.text(formatCurrency(kpi.value), xPos + 3, yPos + 17);

            xPos += cardWidth + 3;
        });

        yPosition += (Math.ceil(kpiData.length / 2) * (cardHeight + 5)) + 15;

        // ========== NOVA PÁGINA: GRÁFICOS ==========
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(14);
        doc.setTextColor(38, 34, 35);
        doc.text('Análise Gráfica', margin, yPosition);
        yPosition += 10;

        // Capturar gráfico principal
        const mainChart = document.getElementById('mainChart');
        if (mainChart) {
            try {
                const chartCanvas = await html2canvas(mainChart.parentElement, {
                    scale: 2,
                    backgroundColor: '#ffffff'
                });
                const chartData = chartCanvas.toDataURL('image/png');
                doc.addImage(chartData, 'PNG', margin, yPosition, pageWidth - 2 * margin, 80);
                yPosition += 90;
            } catch (e) {
                console.log('Gráfico não capturado', e);
            }
        }

        // Capturar gráfico de pizza
        const pieChart = document.getElementById('pieChart');
        if (pieChart) {
            try {
                const pieCanvas = await html2canvas(pieChart.parentElement, {
                    scale: 2,
                    backgroundColor: '#ffffff'
                });
                const pieData = pieCanvas.toDataURL('image/png');
                const pieWidth = 80;
                doc.addImage(pieData, 'PNG', (pageWidth - pieWidth) / 2, yPosition, pieWidth, 80);
            } catch (e) {
                console.log('Gráfico pizza não capturado', e);
            }
        }

        // ========== CARDS SECUNDÁRIOS ==========
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(14);
        doc.setTextColor(38, 34, 35);
        doc.text('Indicadores Detalhados', margin, yPosition);
        yPosition += 10;

        const kpiSecondary = [
            { label: 'Total Impostos', value: state.metrics.total_impostos || 0 },
            { label: 'Total Custos', value: state.metrics.total_custos || 0 },
            { label: 'Total Despesas', value: state.metrics.total_despesas || 0 },
            { label: 'Total Investimentos', value: state.metrics.total_investimentos || 0 },
            { label: 'Pessoal', value: state.metrics.pessoal || 0 },
            { label: 'Mútuo Entradas', value: state.metrics.mutuo_entradas || 0 },
            { label: 'Mútuo Saídas', value: state.metrics.mutuo_saidas || 0 },
            { label: 'Dividendos', value: state.metrics.dividendos || 0 },
            { label: 'Corretiva', value: state.metrics.corretiva || 0 },
            { label: 'Preventiva', value: state.metrics.preventiva || 0 },
            { label: 'Margem Lucro %', value: state.metrics.perc_lucro || 0, isPercent: true },
            { label: 'Margem FCL %', value: state.metrics.perc_fcl || 0, isPercent: true }
        ];

        const secCardWidth = (pageWidth - 2 * margin - 6) / 3;
        const secCardHeight = 20;
        let secXPos = margin;
        let secRow = 0;

        kpiSecondary.forEach((kpi, index) => {
            if (index % 3 === 0 && index > 0) {
                secRow++;
                secXPos = margin;
            }

            const yPos = yPosition + (secRow * (secCardHeight + 5));

            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPosition = 20;
                secRow = 0;
                doc.setFontSize(14);
                doc.text('Indicadores Detalhados (cont.)', margin, yPosition);
                yPosition += 10;
            }

            const finalYPos = yPosition + (secRow * (secCardHeight + 5));

            doc.setFillColor(250, 250, 250);
            doc.rect(secXPos, finalYPos, secCardWidth, secCardHeight, 'F');
            doc.setDrawColor(230, 230, 230);
            doc.rect(secXPos, finalYPos, secCardWidth, secCardHeight);

            doc.setFontSize(8);
            doc.setTextColor(108, 117, 125);
            doc.text(kpi.label, secXPos + 2, finalYPos + 6);

            doc.setFontSize(11);
            doc.setTextColor(38, 34, 35);
            const displayValue = kpi.isPercent ? kpi.value.toFixed(2) + '%' : formatCurrency(kpi.value);
            doc.text(displayValue, secXPos + 2, finalYPos + 14);

            secXPos += secCardWidth + 2;
        });


        // Salvar PDF
        doc.save(`DRE_${new Date().toISOString().split('T')[0]}.pdf`);

        // Hide loading
        document.getElementById('loadingOverlay').classList.add('d-none');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
        document.getElementById('loadingOverlay').classList.add('d-none');
    }
}

// ========================================
// MODAL POR MÁQUINA
// ========================================


function openPorMaquinaModal() {
    const totalEquipamentos = state.metrics.total_equipamentos;

    if (!totalEquipamentos || totalEquipamentos === 0) {
        alert('Nenhum equipamento encontrado no período filtrado.');
        return;
    }

    const m = state.metrics;

    // Calcular total geral e média
    const totalGeral = totalEquipamentos;
    const numMeses = state.validColumns.length || 1;
    const media = totalGeral / numMeses;

    // Definir todos os cards com seus ícones
    const cards = [
        { title: 'Receitas Operacionais', value: m.total_entradas, icon: 'bi-graph-up-arrow', color: 'primary' },
        { title: 'Total Saídas', value: m.total_saidas, icon: 'bi-graph-down-arrow', color: 'danger' },
        { title: 'Resultado', value: m.resultado, icon: 'bi-bullseye', color: 'warning' },
        { title: 'FCL', value: m.fcl, icon: 'bi-wallet2', color: 'success' },
        { title: 'Custos Operacionais', value: m.total_custos, icon: 'bi-gear', color: 'info' },
        { title: 'Despesas Rateadas', value: m.total_despesas, icon: 'bi-calculator', color: 'info' },
        { title: 'Investimentos', value: m.total_investimentos, icon: 'bi-piggy-bank', color: 'info' },
        { title: 'Impostos', value: m.total_impostos, icon: 'bi-bank', color: 'danger' },
        { title: 'Pessoal', value: m.pessoal, icon: 'bi-people', color: 'info' },
        { title: 'Credenciados', value: m.credenciados, icon: 'bi-person-badge', color: 'primary' },
        { title: 'CLTs', value: m.clts, icon: 'bi-person-vcard', color: 'success' },
        { title: 'Terceirização', value: m.terceirizacao, icon: 'bi-people-fill', color: 'warning' },
        { title: 'Corretiva', value: m.corretiva, icon: 'bi-tools', color: 'danger' },
        { title: 'Preventiva', value: m.preventiva, icon: 'bi-shield-check', color: 'success' }
    ];

    // Gerar HTML
    let html = '<div class="por-maquina-grid">';

    cards.forEach(card => {
        const porMaquina = card.value / totalEquipamentos;

        html += `
            <div class="por-maquina-item">
                <div class="por-maquina-item-header">
                    <div class="por-maquina-item-icon">
                        <i class="bi ${card.icon}"></i>
                    </div>
                    <div class="por-maquina-item-title">${card.title}</div>
                </div>
                <div class="por-maquina-item-values">
                    <div class="por-maquina-value-row">
                        <span class="por-maquina-value-label">Total</span>
                        <span class="por-maquina-value-number">${formatCurrency(card.value)}</span>
                    </div>
                    <div class="por-maquina-divider"></div>
                    <div class="por-maquina-value-row">
                        <span class="por-maquina-value-label">Por Equipamento</span>
                        <span class="por-maquina-value-number por-maquina-value-highlight">${formatCurrency(porMaquina)}</span>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Preencher os cards do topo
    document.getElementById('porMaquinaTotal').textContent = Math.round(totalGeral).toLocaleString('pt-BR');
    document.getElementById('porMaquinaMedia').textContent = Math.round(media).toLocaleString('pt-BR');
    document.getElementById('porMaquinaQtd').textContent = Math.round(media).toLocaleString('pt-BR');

    // Inserir no modal
    document.getElementById('porMaquinaBody').innerHTML = html;

    // Mostrar modal
    document.getElementById('porMaquinaModal').classList.add('active');

    // Prevenir scroll do body
    document.body.style.overflow = 'hidden';
}

// ========================================
// FECHAR MODAL POR MÁQUINA (GLOBAL)
// ========================================
function closePorMaquinaModal() {
    document.getElementById('porMaquinaModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Fechar ao pressionar ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePorMaquinaModal();
    }
});
