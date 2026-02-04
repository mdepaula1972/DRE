// Update: 09/12/2025 09:52 - Fix CLTs and Pessoal Calculations

// Configuration
const CONFIG = {
    VERSION: "27.0",
    LAST_UPDATE: "06/01/2026",
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
        { titulo: "Intermediação de Negócios", tipo: "hidden", categorias: ["Intermediação de Negócios"] },
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
        pie: null,
        waterfall: null,
        topExpenses: null,
        modal: null
    },
    isProjectionMode: false,
    originalValidColumns: []
};

// ... (existing code)

// Register DataLabels plugin
Chart.register(ChartDataLabels);

function initCharts() {
    const ctxMainElement = document.getElementById('mainChart');
    const ctxPieElement = document.getElementById('pieChart');
    const ctxWaterfallElement = document.getElementById('waterfallChart');
    const ctxTopElement = document.getElementById('topExpensesChart');

    // Initialize Main Chart
    if (ctxMainElement) {
        state.charts.main = new Chart(ctxMainElement.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Initialize Pie Chart
    if (ctxPieElement) {
        state.charts.pie = new Chart(ctxPieElement.getContext('2d'), {
            type: 'doughnut',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Initialize Waterfall Chart
    if (ctxWaterfallElement) {
        state.charts.waterfall = new Chart(ctxWaterfallElement.getContext('2d'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Initialize Top Expenses Chart
    if (ctxTopElement) {
        state.charts.topExpenses = new Chart(ctxTopElement.getContext('2d'), {
            type: 'bar', // Horizontal bar usually
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }
}

// Data Processing
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log(`Iniciando upload do arquivo: ${file.name} (${file.size} bytes)`);
    document.getElementById('loadingOverlay').classList.remove('d-none');
    document.getElementById('fileStatus').textContent = `Carregando: ${file.name}`;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "ISO-8859-1",
        complete: (results) => {
            console.log("PapaParse (ISO-8859-1) completo. Linhas:", results.data.length, "Erros:", results.errors.length);

            // If it seems to have failed or parsed incorrectly (e.g. only 1 column when expecting more), try UTF-8
            const headerCount = results.meta.fields ? results.meta.fields.length : 0;

            if ((results.errors.length > 0 && results.data.length === 0) || headerCount <= 1) {
                console.log("Tentativa com ISO-8859-1 falhou ou retornou poucas colunas. Tentando UTF-8...");
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    encoding: "UTF-8",
                    complete: (utfResults) => {
                        console.log("PapaParse (UTF-8) completo. Linhas:", utfResults.data.length);
                        processParsedData(utfResults);
                    }
                });
            } else {
                processParsedData(results);
            }
        },
        error: (err) => {
            console.error("Erro no Papa.parse:", err);
            alert("Erro ao ler o arquivo: " + err.message);
            document.getElementById('loadingOverlay').classList.add('d-none');
        }
    });
}

/**
 * Tenta carregar dados automaticamente se estiver em ambiente remoto
 * ou se o usuário desejar um carregamento padrão.
 */
function tryAutoLoad() {
    const isGitHubPages = window.location.hostname.includes('github.io');
    const defaultFile = 'dados.csv';

    console.log(`Tentando auto-load Gerencial (${defaultFile})...`);

    fetch(defaultFile)
        .then(response => {
            if (!response.ok) throw new Error("Arquivo padrão não encontrado");
            return response.blob();
        })
        .then(blob => {
            const file = new File([blob], defaultFile, { type: 'text/csv' });
            const event = { target: { files: [file] } };
            handleFileUpload(event);

            if (isGitHubPages) {
                console.log("Ambiente GitHub Pages detectado. Ajustando interface...");
            }
        })
        .catch(err => {
            console.warn("Auto-load indisponível ou arquivo não encontrado:", err.message);
        });
}

function processParsedData(results) {
    console.log("Processando dados parsed:", results);
    // Expose data for BrisinhAI
    window.FULL_CSV_DATA = results.data;
    if (window.updateBrisinhAIContext) window.updateBrisinhAIContext();
    try {
        let data = results.data;
        if (!data || data.length === 0) {
            throw new Error("O arquivo CSV parece estar vazio.");
        }

        // Standardize keys (Case-insensitive matching for Projeto, Categoria, Empresa)
        data = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                const cleanKey = key.trim().replace(/["']/g, '');
                if (!cleanKey) return;

                const lowerKey = cleanKey.toLowerCase();
                let finalKey = cleanKey;

                if (lowerKey === 'projeto') finalKey = 'Projeto';
                else if (lowerKey === 'categoria') finalKey = 'Categoria';
                else if (lowerKey === 'empresa') finalKey = 'Empresa';

                newRow[finalKey] = row[key];
            });
            return newRow;
        });

        // Filter invalid rows (require at least Projeto and Categoria)
        const originalCount = data.length;
        data = data.filter(row =>
            row['Projeto'] && row['Categoria'] &&
            row['Projeto'].toString().trim() !== '' && row['Categoria'].toString().trim() !== ''
        );

        console.log(`Filtragem: ${data.length} de ${originalCount} linhas são válidas.`);

        if (data.length === 0) {
            alert("Erro: Nenhuma linha válida encontrada. Verifique se o CSV contém as colunas 'Projeto' e 'Categoria' preenchidas.");
            document.getElementById('loadingOverlay').classList.add('d-none');
            document.getElementById('fileStatus').textContent = "⚠️ Erro no formato do arquivo";
            return;
        }

        // Normalize text values
        data.forEach(row => {
            row['Projeto'] = toTitleCase(row['Projeto'].toString());
            row['Empresa'] = row['Empresa'] ? row['Empresa'].toString().trim() : '';
            row['Categoria'] = row['Categoria'] ? row['Categoria'].toString().trim() : '';
        });

        state.rawData = data;
        localStorage.setItem('dre_raw_data', JSON.stringify(data));

        // Populate metadata and filters
        extractMetadata(data);

        // Initial Filter Application
        applyFilters();

        document.getElementById('loadingOverlay').classList.add('d-none');
        document.getElementById('fileStatus').textContent = `✅ ${data.length} registros carregados`;
        document.getElementById('lastUpdate').textContent = `Atualizado em: ${new Date().toLocaleTimeString()}`;

    } catch (error) {
        console.error("Erro ao processar CSV:", error);
        alert("Erro ao processar o arquivo: " + error.message);
        document.getElementById('loadingOverlay').classList.add('d-none');
        document.getElementById('fileStatus').textContent = "❌ Erro no carregamento";
    }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}

function extractMetadata(data) {
    if (!data || data.length === 0) return;

    // Extract all potential month/year columns
    // They usually contain '/' or follow a pattern like 'MMM/YY'
    const allKeys = Object.keys(data[0]);
    const validCols = allKeys.filter(k => k.includes('/'));

    console.log("Colunas de data detectadas:", validCols);

    if (validCols.length === 0) {
        console.warn("Nenhuma coluna de data (contendo '/') encontrada. Verifique o cabeçalho do CSV.");
        // Try a different heuristic? Or just inform the user.
        alert("Aviso: Nenhuma coluna de período (mês/ano) foi detectada. Verifique se o cabeçalho do arquivo segue o padrão 'Mês/Ano' (ex: Jan/24).");
    }

    const periodos = [];
    state.mapaMeses = {};

    validCols.forEach(col => {
        const partes = col.split('/');
        if (partes.length === 2) {
            const mesNome = partes[0].trim();
            const ano = partes[1].trim();
            const mesNormalizado = normalizeMes(mesNome);
            state.mapaMeses[col] = mesNormalizado;
            periodos.push({ col: col, mes: mesNormalizado, ano: ano, full: col });
        }
    });

    // Sort periods chronologically
    periodos.sort((a, b) => {
        const yA = parseInt(a.ano) < 100 ? 2000 + parseInt(a.ano) : parseInt(a.ano);
        const yB = parseInt(b.ano) < 100 ? 2000 + parseInt(b.ano) : parseInt(b.ano);

        if (yA !== yB) return yA - yB;
        return CONFIG.MESES_ORDEM.indexOf(a.mes) - CONFIG.MESES_ORDEM.indexOf(b.mes);
    });

    state.allColumns = periodos.map(p => p.full);

    // Extract Unique Companies, Projects, Categories for filters
    const empresas = [...new Set(data.map(d => d.Empresa).filter(Boolean))].sort();
    const projetos = [...new Set(data.map(d => d.Projeto).filter(Boolean))].sort();
    const categorias = [...new Set(data.map(d => d.Categoria).filter(Boolean))].sort();
    const periodosList = periodos.map(p => `${p.mes}/${p.ano}`);

    // Update State Filters Options
    state.filters.empresas = [];
    state.filters.projetos = [];
    state.filters.categorias = [];
    state.filters.periodos = [];

    // Populate UI Selects
    populateSelect('filterEmpresa', empresas);
    populateSelect('filterProjeto', projetos);
    populateSelect('filterCategoria', categorias);

    // Standardize Periods across pages
    populatePeriodSelect(periodosList);
}

function populatePeriodSelect(items) {
    const select = document.getElementById('filterPeriodo');
    if (!select) return;

    select.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });
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
                // if (typeof updateCascadeFilters === 'function') {
                //     updateCascadeFilters(filter);
                // }

                applyFilters();
            });
        }
    });

    // Clear Filters
    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) {
        btnClear.addEventListener('click', clearFilters);
    }

    // Sidebar Toggles
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const icon = sidebarToggle.querySelector('i');

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
    const btnExport = document.getElementById('btnExportTable');
    if (btnExport) {
        btnExport.addEventListener('click', exportTableToCSV);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initCharts();
    tryAutoLoad();

    // Update version in sidebar
    const vEl = document.getElementById('appVersion');
    if (vEl) vEl.textContent = CONFIG.VERSION;

    const uEl = document.getElementById('lastUpdate');
    if (uEl) uEl.textContent = `Aguardando dados... (v${CONFIG.VERSION})`;
});



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
                const isIndicators = !!document.getElementById('indicatorsContainer');
                if (isIndicators) {
                    // Year only logic
                    const anosSet = new Set();
                    Object.keys(state.mapaMeses).forEach(col => {
                        const ano = col.split('/')[1]?.trim();
                        if (ano) anosSet.add(ano);
                    });
                    options = Array.from(anosSet).sort();
                } else {
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
                }
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
        // Update the select element
        const filterId = `filter${filterToUpdate}`;

        // Store current selection before repopulating
        const filterKey = filterToUpdate.toLowerCase() + (filterToUpdate === 'Mes' ? 'es' : 's');
        const currentSelection = state.filters[filterKey] || [];

        populateSelect(filterId, options);

        // Try to restore selection if valid
        const validSelection = currentSelection.filter(val => options.includes(val));

        // Update state and UI
        state.filters[filterKey] = validSelection;

        // Re-select options in the DOM element
        const selectEl = document.getElementById(filterId);
        if (selectEl) {
            Array.from(selectEl.options).forEach(opt => {
                if (validSelection.includes(opt.value)) {
                    opt.selected = true;
                }
            });
        }
    }
}
function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return; // Prevent error if select is missing
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

    // 4. Valid Columns & Projection Logic
    let validColumns;

    if (state.isProjectionMode) {
        // Clone rows to avoid polluting rawData
        df = df.map(row => ({ ...row }));

        // Generate Projections (function defined below)
        validColumns = generateProjections(df);
    } else {
        validColumns = getValidColumns(f.periodos);
    }

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
        const ano_bruto = col.split('/')[1]?.trim();
        // Handle years being 2 or 4 digits
        const ano = ano_bruto.length === 2 ? `20${ano_bruto}` : ano_bruto;
        const periodo = `${mes}/${ano_bruto}`;

        return periodosFiltro.includes(periodo) || periodosFiltro.includes(ano);
    });
}

// Core Calculation
function calculateDRE() {
    const df = state.filteredData;
    const cols = state.validColumns;

    // --- Identify Previous Period Columns (for variations) ---
    let prevCols = [];
    if (state.allColumns && state.allColumns.length > 0 && cols.length > 0) {
        // Sort selected cols based on master list index
        const sortedSelected = [...cols].sort((a, b) => state.allColumns.indexOf(a) - state.allColumns.indexOf(b));

        const firstCol = sortedSelected[0];
        const firstIdx = state.allColumns.indexOf(firstCol);
        const len = sortedSelected.length;

        if (firstIdx >= len) {
            // Take 'len' columns immediately preceding
            prevCols = state.allColumns.slice(firstIdx - len, firstIdx);
        }
    }

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

    // Pre-calculate totals by category (Current and Previous)
    const catTotals = {};
    const prevCatTotals = {};
    const catMonthly = {};

    // Project-level pre-calculation
    const projCatTotals = {};
    const projCatMonthly = {};
    const allProjects = new Set();

    df.forEach(row => {
        const cat = row.Categoria;
        const catLower = (cat || "").trim().toLowerCase();
        const proj = row.Projeto || 'Sem Projeto';
        allProjects.add(proj);

        if (!catTotals[cat]) {
            catTotals[cat] = 0;
            prevCatTotals[cat] = 0;
            catMonthly[cat] = {};
            cols.forEach(c => catMonthly[cat][c] = 0);
        }

        if (!projCatTotals[proj]) projCatTotals[proj] = {};
        if (!projCatMonthly[proj]) projCatMonthly[proj] = {};
        if (projCatTotals[proj][catLower] === undefined) projCatTotals[proj][catLower] = 0;
        if (!projCatMonthly[proj][catLower]) {
            projCatMonthly[proj][catLower] = {};
            cols.forEach(c => projCatMonthly[proj][catLower][c] = 0);
        }

        // Current Sum
        cols.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            catTotals[cat] += val;
            catMonthly[cat][col] += val;

            projCatTotals[proj][catLower] += val;
            projCatMonthly[proj][catLower][col] += val;
        });

        // Previous Sum
        prevCols.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            prevCatTotals[cat] += val;
        });
    });

    // Helpers para buscar valores
    const getCatTotal = (targetCat) => {
        if (!targetCat) return 0;
        const exact = catTotals[targetCat];
        if (exact !== undefined) return exact;
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

    const getProjCatTotal = (proj, targetCat) => {
        if (!targetCat || !projCatTotals[proj]) return 0;
        return projCatTotals[proj][targetCat.trim().toLowerCase()] || 0;
    };

    const getProjCatMonthly = (proj, targetCat, col) => {
        if (!targetCat || !projCatMonthly[proj]) return 0;
        return projCatMonthly[proj][targetCat.trim().toLowerCase()]?.[col] || 0;
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
        if (item.tipo === 'linha' || item.tipo === 'hidden') {
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

    const totalCustos = (getCatTotal("Credenciado Operacional") + getCatTotal("Adiantamento - Credenciado Operacional")) +
        getVal("Terceirização de Mão de Obra") +
        getVal("CLTs") + getVal("Custo dos Serviços Prestados") + getVal("Preventiva - B2G") +
        getVal("Corretiva - B2G") + getVal("Outros Custos");

    const totalDespesas = getVal("Credenciado Administrativo") + getVal("Credenciado TI") +
        getVal("Despesas Administrativas") + getVal("Despesas de Vendas e Marketing") + getVal("Despesas Financeiras") +
        getVal("Outros Tributos") + getVal("Despesas Eventuais") + getVal("Despesas Variáveis") + getVal("Intermediação de Negócios") +
        (getCatTotal("Distribuição de Dividendos") + getCatTotal("Dividendos"));

    // Nova regra de cálculo de Investimentos
    // Soma direta das categorias brutas para evitar lógica de dedução da tabela
    const totalInvestimentos = getCatTotal("Consórcios - a contemplar") + getCatTotal("Serviços") + getCatTotal("Ativos");

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

    // CLTs deve refletir exatamente "Despesas com Pessoal"
    const clts = getCatTotal("Despesas com Pessoal");

    // Pessoal Total = CLTs + Credenciados + Terceirização
    const pessoal = clts + credenciados + terceirizacao;

    const corretiva = sumCategories(["Corretiva - B2G", "Manutenção Corretiva"]);
    const preventiva = sumCategories(["Preventiva - B2G", "Manutenção Preventiva"]);

    // Calcular Total e Média de Equipamentos
    const totalEquipamentos = getCatTotal("Equipamentos");
    const mediaEquipamentos = cols.length > 0 ? (totalEquipamentos / cols.length) : 0;
    // --- Previous Metrics and Variations ---
    const getPrevCatTotal = (targetCat) => {
        if (!targetCat) return 0;
        const exact = prevCatTotals[targetCat];
        if (exact !== undefined) return exact;
        const key = Object.keys(prevCatTotals).find(k => k.trim().toLowerCase() === targetCat.trim().toLowerCase());
        return key ? prevCatTotals[key] : 0;
    };

    const prevValoresTotal = {};
    CONFIG.ESTRUTURA_DRE.forEach(item => {
        if (item.tipo === 'linha' || item.tipo === 'hidden') {
            let total = 0;
            item.categorias.forEach(cat => total += getPrevCatTotal(cat));
            prevValoresTotal[item.titulo] = total;
        } else if (item.tipo === 'linha_calc' && item.formula === 'servicos_menos_consorcios') {
            const s = getPrevCatTotal('Serviços');
            const c = getPrevCatTotal('Consórcios - a contemplar');
            prevValoresTotal[item.titulo] = (s >= c) ? s - c : 0;
        }
    });
    const getPrevVal = (key) => prevValoresTotal[key] || 0;

    // Previous Key Metrics
    const prev_totalEntradas = getPrevVal("Receita Bruta de Vendas") + getPrevVal("Receitas Indiretas");
    const prev_outrasEntradas = getPrevVal("Outras Receitas") + getPrevVal("Receitas Financeiras") + getPrevVal("Honorários") + getPrevVal("Juros e Devoluções") + getPrevVal("Recuperação de Despesas Variáveis");
    const prev_totalImpostos = getPrevVal("Impostos") + getPrevVal("Provisão IRPJ e CSSL Trimestral");

    const prev_totalCustos = (getPrevCatTotal("Credenciado Operacional") + getPrevCatTotal("Adiantamento - Credenciado Operacional")) +
        getPrevVal("Terceirização de Mão de Obra") + getPrevVal("CLTs") + getPrevVal("Custo dos Serviços Prestados") +
        getPrevVal("Preventiva - B2G") + getPrevVal("Corretiva - B2G") + getPrevVal("Outros Custos");

    const prev_totalDespesas = getPrevVal("Credenciado Administrativo") + getPrevVal("Credenciado TI") + getPrevVal("Despesas Administrativas") +
        getPrevVal("Despesas de Vendas e Marketing") + getPrevVal("Despesas Financeiras") + getPrevVal("Outros Tributos") +
        getPrevVal("Despesas Eventuais") + getPrevVal("Despesas Variáveis") + getPrevVal("Intermediação de Negócios") +
        (getPrevCatTotal("Distribuição de Dividendos") + getPrevCatTotal("Dividendos"));

    // Investments (Direct Sum as per current logic)
    const prev_totalInvestimentos = getPrevCatTotal("Consórcios - a contemplar") + getPrevCatTotal("Serviços") + getPrevCatTotal("Ativos");
    const prev_totalSaidas = prev_totalImpostos + prev_totalCustos + prev_totalDespesas + prev_totalInvestimentos;
    const prev_resultado = prev_totalEntradas + getPrevVal("Ativos") + prev_outrasEntradas - prev_totalSaidas;
    const prev_fcl = prev_resultado - getPrevVal("Ativos");

    // Previous Helpers
    const sumPrevCategories = (list) => list.reduce((acc, cat) => acc + getPrevCatTotal(cat), 0);
    const prev_credenciados = sumPrevCategories([
        "Credenciado Administrativo", "Adiantamento - Credenciado Administrativo",
        "Credenciado TI", "Adiantamento - Credenciado TI",
        "Credenciado Operacional", "Adiantamento - Credenciado Operacional"
    ]);
    const prev_terceirizacao = sumPrevCategories(["Terceirização de Mão de Obra"]);
    const prev_clts = getPrevCatTotal("Despesas com Pessoal");
    const prev_pessoal = prev_clts + prev_credenciados + prev_terceirizacao;
    const prev_corretiva = sumPrevCategories(["Corretiva - B2G", "Manutenção Corretiva"]);
    const prev_preventiva = sumPrevCategories(["Preventiva - B2G", "Manutenção Preventiva"]);

    // Calculate Variations
    const calcVar = (curr, prev) => (prev !== 0) ? ((curr - prev) / Math.abs(prev)) * 100 : 0;
    const variations = {
        total_entradas: calcVar(totalEntradas, prev_totalEntradas),
        total_saidas: calcVar(totalSaidas, prev_totalSaidas),
        resultado: calcVar(resultado, prev_resultado),
        fcl: calcVar(fcl, prev_fcl),
        total_custos: calcVar(totalCustos, prev_totalCustos),
        total_despesas: calcVar(totalDespesas, prev_totalDespesas),
        total_investimentos: calcVar(totalInvestimentos, prev_totalInvestimentos),
        total_impostos: calcVar(totalImpostos, prev_totalImpostos),
        pessoal: calcVar(pessoal, prev_pessoal),
        credenciados: calcVar(credenciados, prev_credenciados),
        clts: calcVar(clts, prev_clts),
        terceirizacao: calcVar(terceirizacao, prev_terceirizacao),
        corretiva: calcVar(corretiva, prev_corretiva),
        preventiva: calcVar(preventiva, prev_preventiva)
    };


    const val_receita_bruta = getVal("Receita Bruta de Vendas");
    const val_receitas_indiretas = getVal("Receitas Indiretas");
    const val_impostos_vendas = getVal("Impostos"); // Simples/PIS/COFINS
    const val_irpj_csll = getVal("Provisão IRPJ e CSSL Trimestral");

    // Receita Líquida
    const receita_liquida = (val_receita_bruta + val_receitas_indiretas) - val_impostos_vendas;

    // Custos e Despesas Variáveis
    const val_despesas_variaveis = getVal("Despesas Variáveis");
    const val_intermediacao = getVal("Intermediação de Negócios");
    const custos_despesas_variaveis = totalCustos + val_despesas_variaveis + val_intermediacao;

    // Lucro Bruto
    const lucro_bruto = receita_liquida - totalCustos; // User def: RL - Custo dos Produtos/Serviços

    // Despesas Operacionais (Fixas/Gerais) - Exclui Variáveis, Financeiras e Dividendos
    const val_despesas_financeiras = getVal("Despesas Financeiras");
    const val_dividendos = getCatTotal("Distribuição de Dividendos") + getCatTotal("Dividendos");

    // Total Despesas contains everything. Let's isolate OpEx.
    // OpEx = Total Despesas - Financeiras - Dividendos - Variáveis - Intermediação
    const despesas_operacionais = totalDespesas - val_despesas_financeiras - val_dividendos - val_despesas_variaveis - val_intermediacao;

    // EBIT (Resultado Operacional)
    const ebit = lucro_bruto - despesas_operacionais;

    // EBITDA (Assuming Depreciation is not explicitly separated, EBITDA ~= EBIT in this structure, or we add back distinct amort if tracked)
    // For this context, standard implies EBITDA = EBIT + Deprec. If Deprec is 0/hidden, EBITDA = EBIT.
    const ebitda = ebit;

    // Resultado Financeiro
    const val_receitas_financeiras = getVal("Receitas Financeiras");
    // Note: 'total_entradas' includes 'Receitas Financeiras' only if mapped?? 
    // Wait, CONFIG says Receitas Financeiras is row 24.
    // Let's ensure we get it right. 'Outras Receitas' usually sums Financial too.
    const resultado_financeiro = val_receitas_financeiras - val_despesas_financeiras;

    // LAIR (Lucro Antes do IR)
    const lair = ebit + resultado_financeiro + getVal("Outras Receitas") + getVal("Honorários") + getVal("Juros e Devoluções") + getVal("Recuperação de Despesas Variáveis");
    // Note: Adding other operational revenues to LAIR that weren't in Gross Profit

    // Lucro Líquido
    const lucro_liquido = lair - val_irpj_csll;

    // Grau de Alavancagem Operacional (GAO)
    // Margem de Contribuição ($) = Receita Líquida - Despesas Variáveis Totais
    const margem_contribuicao_valor = receita_liquida - custos_despesas_variaveis;
    const gao = ebit !== 0 ? (margem_contribuicao_valor / ebit) : 0;


    // Store Metrics
    state.metrics = {
        variations: variations,
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

        // Detailed Financials for Indicators
        receita_liquida: receita_liquida,
        lucro_bruto: lucro_bruto,
        margem_contribuicao_valor: margem_contribuicao_valor,
        ebit: ebit,
        ebitda: ebitda,
        resultado_financeiro: resultado_financeiro,
        lair: lair,
        lucro_liquido: lucro_liquido,
        despesas_operacionais: despesas_operacionais,
        gao: gao,

        // Raw Values Ref
        val_despesas_financeiras: val_despesas_financeiras,
        val_dividendos: val_dividendos,
        val_despesas_variaveis: val_despesas_variaveis,
        val_intermediacao: val_intermediacao,
        val_receita_bruta: val_receita_bruta,
        val_impostos_vendas: val_impostos_vendas,
        val_irpj_csll: val_irpj_csll,

        // Percentuals (keeping existing logic for charts)
        perc_total_saidas: totalEntradas !== 0 ? (totalSaidas / totalEntradas * 100) : 0,
        perc_resultado: totalEntradas !== 0 ? (resultado / totalEntradas * 100) : 0,
        perc_fcl_receita: totalEntradas !== 0 ? (fcl / totalEntradas * 100) : 0,
        perc_custos: totalSaidas !== 0 ? (totalCustos / totalSaidas * 100) : 0,
        perc_despesas: totalSaidas !== 0 ? (totalDespesas / totalSaidas * 100) : 0,
        perc_investimentos: totalSaidas !== 0 ? (totalInvestimentos / totalSaidas * 100) : 0,
        perc_impostos: totalSaidas !== 0 ? (totalImpostos / totalSaidas * 100) : 0,
        perc_pessoal: totalSaidas !== 0 ? (pessoal / totalSaidas * 100) : 0,
        perc_corretiva: totalSaidas !== 0 ? (corretiva / totalSaidas * 100) : 0,
        perc_preventiva: totalSaidas !== 0 ? (preventiva / totalSaidas * 100) : 0,
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
        perc_credenciados_pessoal: pessoal !== 0 ? (credenciados / pessoal * 100) : 0,
        perc_clts_pessoal: pessoal !== 0 ? (clts / pessoal * 100) : 0,
        perc_terceirizacao_pessoal: pessoal !== 0 ? (terceirizacao / pessoal * 100) : 0,
        receita_indireta: val_receitas_indiretas,
        perc_credenciados: totalSaidas !== 0 ? (credenciados / totalSaidas * 100) : 0,
        perc_clts: totalSaidas !== 0 ? (clts / totalSaidas * 100) : 0,
        perc_terceirizacao: totalSaidas !== 0 ? (terceirizacao / totalSaidas * 100) : 0,
        val_impostos: totalImpostos
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
                total2024: calculateYearTotal(item.titulo, '2024', valoresMensal),
                total2025: calculateYearTotal(item.titulo, '2025', valoresMensal)
            };
            row.total2425 = row.total2024 + row.total2025;
            state.dreData.push(row);
        }
    });

    // Project Breakdown logic (kept same)
    state.projectBreakdown = {};
    const itemsToExpand = CONFIG.ESTRUTURA_DRE.filter(item =>
        ['linha', 'linha_calc', 'hidden'].includes(item.tipo)
    );

    itemsToExpand.forEach(item => {
        const rubricTitle = item.titulo;
        const projectsMap = {};

        allProjects.forEach(proj => {
            let projTotal = 0;
            let projMeses = {};
            cols.forEach(c => projMeses[c] = 0);

            if (item.tipo === 'linha' || item.tipo === 'hidden') {
                (item.categorias || []).forEach(cat => {
                    projTotal += getProjCatTotal(proj, cat);
                    cols.forEach(col => {
                        projMeses[col] += getProjCatMonthly(proj, cat, col);
                    });
                });
            } else if (item.tipo === 'linha_calc') {
                if (item.formula === 'servicos_menos_consorcios') {
                    const s = getProjCatTotal(proj, 'Serviços');
                    const c = getProjCatTotal(proj, 'Consórcios - a contemplar');
                    projTotal = (s >= c) ? s - c : 0;
                    cols.forEach(col => {
                        const sM = getProjCatMonthly(proj, 'Serviços', col);
                        const cM = getProjCatMonthly(proj, 'Consórcios - a contemplar', col);
                        projMeses[col] = (sM >= cM) ? sM - cM : 0;
                    });
                }
            }

            if (Math.abs(projTotal) > 0.01) {
                projectsMap[proj] = {
                    nome: proj,
                    total: projTotal,
                    meses: projMeses,
                    media: projTotal / (cols.length || 1)
                };
            }
        });

        const projectList = Object.values(projectsMap);
        if (projectList.length > 0) {
            state.projectBreakdown[rubricTitle] = projectList.sort((a, b) => b.total - a.total);
        }
    });

}


function calculateYearTotal(titulo, year, valoresMensal) {
    let sum = 0;
    const rowValues = valoresMensal[titulo] || {};
    Object.keys(rowValues).forEach(col => {
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
    updateIndicatorsPage();
}

/**
 * Updates the Indicators Page with the 10 specific cards requested
 */
function updateIndicatorsPage() {
    const container = document.getElementById('indicatorsContainer');
    if (!container) return;

    const m = state.metrics;
    if (!m || !m.total_entradas) return;

    container.innerHTML = '';

    // Calculations for Display
    const RL = m.receita_liquida || 1; // Avoid div by zero

    // 1. Margem Bruta
    const margemBruta = (m.lucro_bruto / RL) * 100;

    // 2. Margem de Contribuição
    const margemContribuicao = (m.margem_contribuicao_valor / RL) * 100;

    // 3. Margem Operacional
    const margemOperacional = (m.ebit / RL) * 100;

    // 4. EBITDA (Value) -> m.ebitda

    // 5. Margem EBITDA
    const margemEbitda = (m.ebitda / RL) * 100;

    // 6. Resultado Financeiro -> m.resultado_financeiro

    // 7. Margem Antes do IR/CSLL
    const margemLair = (m.lair / RL) * 100;

    // 8. Margem Líquida
    const margemLiquida = (m.lucro_liquido / RL) * 100;

    // 9. Índice de Despesas Operacionais (Weight of OpEx on Revenue)
    const indiceDespOp = (m.despesas_operacionais / RL) * 100;

    // 10. Grau de Alavancagem Operacional (GAO) -> m.gao

    // --- Cards Definitions ---
    const cards = [
        {
            title: '1. Margem Bruta',
            value: margemBruta,
            isPercent: true,
            desc: 'Eficiência da atividade principal',
            formula: 'Lucro Bruto ÷ Receita Líquida',
            color: 'primary',
            icon: 'bi-bar-chart'
        },
        {
            title: '2. Margem de Contribuição',
            value: margemContribuicao,
            isPercent: true,
            desc: 'Cobertura de custos fixos e lucro',
            formula: '(Rec. Líquida - Var.) ÷ Rec. Líquida',
            color: 'info',
            icon: 'bi-pie-chart'
        },
        {
            title: '3. Margem Operacional',
            value: margemOperacional,
            isPercent: true,
            desc: 'Resultado da operação principal',
            formula: 'EBIT ÷ Receita Líquida',
            color: 'warning',
            icon: 'bi-gear'
        },
        {
            title: '4. EBITDA',
            value: m.ebitda,
            isCurrency: true,
            desc: 'Geração de caixa operacional',
            formula: 'EBIT + Depreciação + Amort.',
            color: 'success',
            icon: 'bi-activity'
        },
        {
            title: '5. Margem EBITDA',
            value: margemEbitda,
            isPercent: true,
            desc: 'Eficiência operacional (Caixa)',
            formula: 'EBITDA ÷ Receita Líquida',
            color: 'success',
            icon: 'bi-graph-up'
        },
        {
            title: '6. Resultado Financeiro',
            value: m.resultado_financeiro,
            isCurrency: true,
            desc: 'Impacto de receitas e desp. fin.',
            formula: 'Rec. Fin. - Desp. Fin.',
            color: 'secondary',
            icon: 'bi-bank'
        },
        {
            title: '7. Margem Antes do IR/CSLL',
            value: margemLair,
            isPercent: true,
            desc: 'Desemp. antes da carga tributária',
            formula: 'LAIR ÷ Receita Líquida',
            color: 'info',
            icon: 'bi-journal-check'
        },
        {
            title: '8. Margem Líquida',
            value: margemLiquida,
            isPercent: true,
            desc: 'Quanto efetivamente sobra',
            formula: 'Lucro Líquido ÷ Receita Líquida',
            color: 'primary',
            icon: 'bi-wallet2'
        },
        {
            title: '9. Índ. Despesas Operacionais',
            value: indiceDespOp,
            isPercent: true,
            desc: 'Peso das despesas sobre a receita',
            formula: 'Desp. Op. ÷ Receita Líquida',
            color: 'danger',
            icon: 'bi-calculator'
        },
        {
            title: '10. GAO (Alavancagem Op.)',
            value: m.gao,
            isDecimal: true,
            desc: 'Sensibilidade do lucro à receita',
            formula: 'Margem Contrib. ÷ EBIT',
            color: 'dark',
            icon: 'bi-lightning'
        }
    ];

    // --- Render ---
    cards.forEach(card => {
        let displayVal = '0';
        if (card.isPercent) displayVal = card.value.toFixed(1) + '%';
        else if (card.isCurrency) displayVal = formatCurrency(card.value);
        else if (card.isDecimal) displayVal = card.value.toFixed(2) + 'x';

        // Background subtle color logic
        const bgClass = `bg-${card.color}-subtle`; // Bootstrap 5.3 utility class or custom
        // We'll stick to our custom styles or standard bootstrap card integration

        const html = `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="card h-100 border-0 shadow-sm indicator-card">
                    <div class="card-body p-4 position-relative overflow-hidden">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="icon-box-sm rounded-circle bg-${card.color} bg-opacity-10 text-${card.color} p-3">
                                <i class="bi ${card.icon} fs-4"></i>
                            </div>
                            <span class="badge bg-light text-muted border">${card.formula}</span>
                        </div>
                        
                        <h6 class="card-subtitle text-muted text-uppercase mb-2 small fw-bold" style="letter-spacing: 0.5px;">
                            ${card.title}
                        </h6>
                        
                        <h2 class="card-title fw-bold text-dark mb-2">
                            ${displayVal}
                        </h2>
                        
                        <p class="card-text text-muted small mb-0 border-top pt-2 mt-2">
                            ${card.desc}
                        </p>
                    </div>
                    <div class="card-footer bg-transparent border-0 pt-0 pb-3">
                        
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// Global function for radio button click
window.updateValuationSelection = function (key) {
    state.selectedValuationKey = key;
    updateIndicatorsPage();
};

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
        { key: 'resultado', title: 'Resultado', icon: 'bi-bullseye', color: 'highlight', bgColor: 'bg-yellow-soft', percentKey: 'perc_resultado', percentRefIcon: 'bi-graph-up-arrow', isClickable: true },
        { key: 'fcl', title: 'Fluxo de Caixa Livre - FCL', icon: 'bi-wallet2', color: 'success', bgColor: 'bg-green-soft', percentKey: 'perc_fcl_receita', percentRefIcon: 'bi-graph-up-arrow', isClickable: true }
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
    if (!container) return; // Prevent error if container is missing
    container.innerHTML = '';

    // Define metrics where increase is BAD
    const badIncreaseKeys = [
        'total_saidas', 'total_custos', 'total_despesas', 'total_investimentos', 'total_impostos',
        'pessoal', 'credenciados', 'clts', 'terceirizacao', 'corretiva', 'preventiva'
    ];

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

            // For breakdown card, variation goes under Total
            html = `
                <div class="${colClass}">
                    <div class="metric-card ${cardClass} ${bgClass} ${breakdownClickClass}" ${breakdownClickHandler}>
                        <div class="icon-box">
                            <i class="bi ${card.icon}"></i>
                        </div>
                        <div class="title">${card.title}</div>
                        <div class="value" style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0rem;">
                            ${formatCurrency(card.breakdown.total)}
                        </div>
                        <div class="breakdown-container mt-2">
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
    const mainChartEl = document.getElementById('mainChart');
    const pieChartEl = document.getElementById('pieChart');
    const waterfallChartEl = document.getElementById('waterfallChart');
    const topExpensesChartEl = document.getElementById('topExpensesChart');

    if (!mainChartEl && !pieChartEl && !waterfallChartEl && !topExpensesChartEl) {
        return; // No charts on this page
    }

    // Only get context if element exists
    const ctxMain = mainChartEl ? mainChartEl.getContext('2d') : null;
    const ctxPie = pieChartEl ? pieChartEl.getContext('2d') : null;
    const ctxWaterfall = waterfallChartEl ? waterfallChartEl.getContext('2d') : null;
    const ctxTop = topExpensesChartEl ? topExpensesChartEl.getContext('2d') : null;

    const m = state.metrics; // Define globally for the function

    // === DATA PREPARATION ===
    const labels = state.validColumns.map(c => {
        const [mes, ano] = c.split('/');
        return `${mes.charAt(0).toUpperCase() + mes.slice(1)}/${ano}`;
    });

    const getRowValue = (descricao, col) => {
        const row = state.dreData.find(r => r.type === 'data' && r.descricao === descricao);
        return row ? (row.meses[col] || 0) : 0;
    };

    // Series
    const monthlyReceitas = labels.map((_, i) => {
        const col = state.validColumns[i];
        return Math.round(getRowValue('Receita Bruta de Vendas', col) + getRowValue('Receitas Indiretas', col));
    });

    const monthlySaidas = labels.map((_, i) => {
        const col = state.validColumns[i];
        let total = 0;
        // Summing major groups manually to ensure consistency
        // Impostos
        total += getRowValue('Impostos', col) + getRowValue('Provisão IRPJ e CSSL Trimestral', col);
        // Custos
        total += getRowValue('Credenciado Operacional', col) + getRowValue('Terceirização de Mão de Obra', col) + getRowValue('CLTs', col) +
            getRowValue('Custo dos Serviços Prestados', col) + getRowValue('Preventiva - B2G', col) + getRowValue('Corretiva - B2G', col) + getRowValue('Outros Custos', col);
        // Despesas
        total += getRowValue('Credenciado Administrativo', col) + getRowValue('Credenciado TI', col) + getRowValue('Despesas Administrativas', col) +
            getRowValue('Despesas de Vendas e Marketing', col) + getRowValue('Despesas Financeiras', col) + getRowValue('Outros Tributos', col) +
            getRowValue('Despesas Eventuais', col) + getRowValue('Despesas Variáveis', col) + getRowValue('Intermediação de Negócios', col);
        // Investimentos
        total += getRowValue('Consórcios a contemplar', col) + getRowValue('Serviços', col) + getRowValue('Ativos', col);
        return Math.round(total);
    });

    const monthlyResult = labels.map((_, i) => {
        const col = state.validColumns[i];
        const receitas = monthlyReceitas[i];
        const outras = getRowValue('Outras Receitas', col) + getRowValue('Receitas Financeiras', col) + getRowValue('Honorários', col) + getRowValue('Juros e Devoluções', col);
        const ativos = getRowValue('Ativos', col);
        const saidas = monthlySaidas[i];
        return Math.round(receitas + outras + ativos - saidas);
    });

    const monthlyFCL = labels.map((_, i) => {
        const col = state.validColumns[i];
        const ativos = getRowValue('Ativos', col);
        return Math.round(monthlyResult[i] - ativos);
    });

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            datalabels: {
                display: false // Default off, enable per dataset
            }
        }
    };

    // === MAIN CHART ===
    if (state.charts.main) state.charts.main.destroy();

    // Tooltip for Main Chart
    const mainTooltip = {
        callbacks: {
            label: function (context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);

                // Variation logic
                const i = context.dataIndex;
                if (i > 0) {
                    const curr = context.parsed.y;
                    const prev = context.dataset.data[i - 1];
                    if (prev !== 0) {
                        const change = ((curr - prev) / Math.abs(prev)) * 100;
                        const icon = change >= 0 ? '▲' : '▼';
                        label += ` (${icon} ${Math.abs(change).toFixed(1)}%)`;
                    }
                }
                return label;
            }
        }
    };

    if (ctxMain) {
        state.charts.main = new Chart(ctxMain, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Receitas',
                        data: monthlyReceitas,
                        backgroundColor: CONFIG.COLORS.primary,
                        borderRadius: 4,
                        order: 2,
                        datalabels: {
                            display: 'auto',
                            anchor: 'end',
                            align: 'top',
                            formatter: val => Math.round(val).toLocaleString('pt-BR'),
                            font: { size: 10, weight: 'bold' },
                            color: CONFIG.COLORS.primary
                        }
                    },
                    {
                        label: 'Saídas',
                        data: monthlySaidas,
                        backgroundColor: CONFIG.COLORS.danger,
                        borderRadius: 4,
                        order: 3,
                        datalabels: {
                            display: 'auto',
                            anchor: 'end',
                            align: 'top',
                            formatter: val => Math.round(val).toLocaleString('pt-BR'),
                            font: { size: 10, weight: 'bold' },
                            color: CONFIG.COLORS.danger
                        }
                    },
                    {
                        label: 'Resultado',
                        data: monthlyResult,
                        type: 'line',
                        borderColor: CONFIG.COLORS.secondary,
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        order: 0,
                        datalabels: {
                            display: 'auto',
                            anchor: 'end',
                            align: 'bottom',
                            formatter: val => Math.round(val).toLocaleString('pt-BR'),
                            font: { size: 10, weight: 'bold' },
                            color: CONFIG.COLORS.secondary
                        }
                    },
                    {
                        label: 'FCL',
                        data: monthlyFCL,
                        type: 'line',
                        borderColor: CONFIG.COLORS.success,
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3,
                        order: 1,
                        hidden: false // Visible by default as requested
                    }
                ]
            },
            options: {
                ...commonOptions,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: mainTooltip,
                    datalabels: { clamp: true } // Apply to all
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // === PIE CHART ===
    if (state.charts.pie) state.charts.pie.destroy();

    if (ctxPie) {
        const m = state.metrics;
        const pieData = [m.total_custos, m.total_despesas, m.total_impostos, m.total_investimentos].map(v => Math.round(v));
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
                                const val = context.parsed;
                                const pct = pieTotal > 0 ? (val / pieTotal * 100).toFixed(1) + '%' : '0%';
                                return `${context.label}: ${formatCurrency(val)} (${pct})`;
                            }
                        }
                    },
                    datalabels: {
                        color: 'white',
                        font: { weight: 'bold' },
                        formatter: (val, ctx) => {
                            if (pieTotal === 0) return '';
                            const pct = (val / pieTotal * 100);
                            if (pct < 5) return '';
                            return Math.round(pct) + '%';
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // === WATERFALL CHART ===
    if (state.charts.waterfall) state.charts.waterfall.destroy();

    // Waterfall Items (Entradas is fixed start, Resultado is fixed end)
    // Intermediate items to be sorted by impact (size)
    const wfItems = [
        { label: 'Impostos', val: -(m.total_impostos || 0) },
        { label: 'Custos', val: -(m.total_custos || 0) },
        { label: 'Despesas', val: -(m.total_despesas || 0) },
        { label: 'Invest.', val: -(m.total_investimentos || 0) }
    ];

    // Sort items by absolute value descending (Largest impact first)
    wfItems.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

    // Build Data Arrays
    const inputs = (m.total_entradas || 0) + (m.outras_entradas || 0);
    const finalResult = (m.resultado || 0);

    const wfLabels = ['Entradas', ...wfItems.map(i => i.label), 'Resultado'];

    const wfFloating = [];
    const wfBackgrounds = [];

    let current = 0;

    // 1. Start (Entradas)
    wfFloating.push([0, inputs]);
    wfBackgrounds.push(CONFIG.COLORS.success);
    current = inputs;

    // 2. Intermediates
    wfItems.forEach(item => {
        wfFloating.push([current, current + item.val]);
        current += item.val;
        wfBackgrounds.push(CONFIG.COLORS.danger);
    });

    // 3. End (Resultado) - Should match calculation
    // Note: small rounding diffs might exist, so we force the graphic to land at 0-Result logic?
    // Actually, distinct bar for Result usually starts at 0.
    wfFloating.push([0, finalResult]);
    wfBackgrounds.push(CONFIG.COLORS.primary);

    if (ctxWaterfall) {
        state.charts.waterfall = new Chart(ctxWaterfall, {
            type: 'bar',
            data: {
                labels: wfLabels,
                datasets: [{
                    data: wfFloating, // [min, max]
                    backgroundColor: wfBackgrounds,
                    borderRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const raw = ctx.raw;
                                const val = raw[1] - raw[0];
                                return formatCurrency(val);
                            }
                        }
                    },
                    datalabels: {
                        display: 'auto',
                        formatter: (val, ctx) => {
                            const v = val[1] - val[0];
                            return Math.round(v).toLocaleString('pt-BR');
                        },
                        font: { size: 10, weight: 'bold' },
                        color: '#555',
                        anchor: 'end',
                        align: 'top'
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // === TOP 5 EXPENSES CHART ===
    if (state.charts.topExpenses) state.charts.topExpenses.destroy();

    const expenseCats = {};
    // ... (aggregation logic same as before)
    state.filteredData.forEach(row => {
        const cat = row.Categoria;
        if (cat.includes('Receita') || cat.includes('Entrada')) return;
        let sum = 0;
        state.validColumns.forEach(c => sum += parseFloat(row[c]?.toString().replace(',', '.') || 0));
        if (sum > 0) expenseCats[cat] = (expenseCats[cat] || 0) + sum;
    });

    const sortedExpenses = Object.entries(expenseCats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Custom Palette for Top 5
    const top5Colors = [CONFIG.COLORS.danger, CONFIG.COLORS.info, CONFIG.COLORS.primary, CONFIG.COLORS.secondary, CONFIG.COLORS.success];

    if (ctxTop) {
        state.charts.topExpenses = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: sortedExpenses.map(e => e[0]),
                datasets: [{
                    label: 'Valor',
                    data: sortedExpenses.map(e => Math.round(e[1])),
                    backgroundColor: top5Colors,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => formatCurrency(ctx.parsed.x)
                        }
                    },
                    datalabels: {
                        display: 'auto',
                        color: 'white',
                        anchor: 'start', // Start of bar (left) or center?
                        align: 'end',   // Inside the bar, near the end
                        formatter: val => 'R$ ' + Math.round(val).toLocaleString('pt-BR')
                    }
                },
                scales: {
                    x: { display: false },
                    y: { grid: { display: false } }
                }
            }
        });
    }
}

function updateTable() {
    const tableElement = document.getElementById('dreTable');
    if (!tableElement) return; // Prevent error if table is missing entirely

    const thead = tableElement.querySelector('thead');
    const tbody = tableElement.querySelector('tbody');
    if (!thead || !tbody) return;

    const cols = state.validColumns;

    // Headers
    let headerHTML = '<tr><th style="width: 40px;"></th><th style="min-width: 210px;">Descrição</th>';
    cols.forEach(col => {
        headerHTML += `<th class="text-end text-muted small" style="min-width: 100px;">${col}</th>`;
    });
    headerHTML += '<th class="text-end table-secondary text-white">Total</th>';
    headerHTML += '<th class="text-end bg-light">Média</th>';
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // Helper for Row Nature (Good or Bad meaning of increase)
    const isPositiveMetric = (desc) => {
        const positiveList = [
            'Receita Bruta de Vendas', 'Receitas Indiretas', 'Outras Receitas',
            'Receitas Financeiras', 'Honorários', 'Juros e Devoluções',
            'Recuperação de Despesas Variáveis', 'Mútuo - Entradas',
            'Resultado', 'Fluxo de Caixa Livre', 'FCL s/ Receita Operacional'
        ];
        if (desc.startsWith('Receita') || positiveList.includes(desc)) return true;
        return false;
    };

    // Body
    let bodyHTML = '';
    state.dreData.forEach(row => {
        if (row.type === 'divisor') {
            const totalCols = cols.length + 4; // Added column for expand btn
            bodyHTML += `<tr><td colspan="${totalCols}" class="p-0"><hr class="my-0 border-secondary opacity-25"></td></tr>`;
        } else {
            const hasBreakdown = state.projectBreakdown && state.projectBreakdown[row.descricao];
            const expandBtn = hasBreakdown ?
                `<button class="btn-expand-project" onclick="toggleProjectRows('${row.descricao}', this)"><i class="bi bi-plus"></i></button>` : '';

            bodyHTML += `<tr>`;
            bodyHTML += `<td class="text-center">${expandBtn}</td>`;
            bodyHTML += `<td class="fw-medium text-truncate" style="max-width: 300px;" title="${row.descricao}">` + row.descricao + `</td>`;

            cols.forEach((col, index) => {
                const val = row.meses[col] || 0;
                let varHtml = '';

                // Calculate MoM Variation
                if (index > 0) {
                    const prevCol = cols[index - 1];
                    const prevVal = row.meses[prevCol] || 0;
                    varHtml = calculateVariationHtml(val, prevVal, isPositiveMetric(row.descricao));
                }

                bodyHTML += `<td class="text-end small">
                    <div class="fw-bold text-dark">${formatCurrency(val)}</div>
                    ${varHtml}
                </td>`;
            });

            // Totals
            bodyHTML += `<td class="text-end table-secondary text-white fw-bold">${formatCurrency(row.total)}</td>`;
            bodyHTML += `<td class="text-end text-muted bg-light">${formatCurrency(row.media)}</td>`;
            bodyHTML += `</tr>`;

            // IF has project breakdown, add project rows hidden
            if (hasBreakdown) {
                state.projectBreakdown[row.descricao].forEach(proj => {
                    bodyHTML += `<tr class="row-project-detail" style="display: none;">`;
                    bodyHTML += `<td></td>`; // Empty for btn column
                    bodyHTML += `<td class="project-name-cell">${proj.nome}</td>`;

                    cols.forEach((col, index) => {
                        const val = proj.meses[col] || 0;
                        let varHtml = '';

                        if (index > 0) {
                            const prevCol = cols[index - 1];
                            const prevVal = proj.meses[prevCol] || 0;
                            varHtml = calculateVariationHtml(val, prevVal, isPositiveMetric(row.descricao));
                        }

                        bodyHTML += `<td class="text-end small">
                            <div class="text-dark">${formatCurrency(val)}</div>
                            ${varHtml}
                        </td>`;
                    });

                    bodyHTML += `<td class="text-end small fw-bold">${formatCurrency(proj.total)}</td>`;
                    bodyHTML += `<td class="text-end small">${formatCurrency(proj.media)}</td>`;
                    bodyHTML += `</tr>`;
                });
            }
        }
    });
    tbody.innerHTML = bodyHTML;
}

// Global toggle function
window.toggleProjectRows = function (rubricTitle, btn) {
    const icon = btn.querySelector('i');
    const isExpanding = icon.classList.contains('bi-plus');

    // Toggle icon
    icon.classList.toggle('bi-plus', !isExpanding);
    icon.classList.toggle('bi-dash', isExpanding);

    // Toggle rows
    const parentRow = btn.closest('tr');
    let nextRow = parentRow.nextElementSibling;
    while (nextRow && nextRow.classList.contains('row-project-detail')) {
        nextRow.style.display = isExpanding ? 'table-row' : 'none';
        nextRow = nextRow.nextElementSibling;
    }
};


// Utils
function calculateVariationHtml(current, previous, isPositiveMetric) {
    if (previous !== 0) {
        const change = ((current - previous) / Math.abs(previous)) * 100;
        const isGood = isPositiveMetric ? change > 0 : change < 0;

        let colorClass = 'text-muted';
        if (change > 0) colorClass = isGood ? 'text-success' : 'text-danger';
        if (change < 0) colorClass = isGood ? 'text-success' : 'text-danger';

        const icon = change >= 0 ? '▲' : '▼';
        return `<div class="${colorClass}" style="font-size: 0.7rem; margin-top: 2px;">${icon} ${Math.abs(change).toFixed(1)}%</div>`;
    } else if (current !== 0) {
        return `<div class="text-secondary" style="font-size: 0.7rem; margin-top: 2px;">Novo</div>`;
    }
    return '';
}

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

    // Helper para somar categoria específica nos dados filtrados (Case Insensitive Safe)
    const getCatSum = (catName) => {
        const target = catName.trim().toLowerCase();
        let s = 0;
        state.filteredData.forEach(row => {
            if (row.Categoria && row.Categoria.trim().toLowerCase() === target) {
                state.validColumns.forEach(col => s += parseFloat(row[col]?.toString().replace(',', '.') || 0));
            }
        });
        return s;
    };

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
        'total_despesas': ['Credenciado Administrativo', 'Adiantamento - Credenciado Administrativo', 'Credenciado TI', 'Adiantamento - Credenciado TI', 'Despesas Administrativas', 'Despesas de Vendas e Marketing', 'Despesas Financeiras', 'Outros Tributos', 'Jurídico', 'Despesas Variáveis', 'Intermediação de Negócios'],
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

    // --- GRAPH GENERATION (STACKED BAR) ---
    const chartLabels = state.validColumns.map(c => {
        const [mes, ano] = c.split('/');
        return `${mes.charAt(0).toUpperCase() + mes.slice(1)}/${ano}`;
    });

    let datasets = [];

    // Palette for distinct item colors
    const palette = [
        '#F2911B', '#262223', '#2ecc71', '#3498db', '#9b59b6',
        '#f1c40f', '#1abc9c', '#e67e22', '#34495e', '#e74c3c',
        '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#d35400',
        '#7f8c8d', '#c0392b', '#bdc3c7', '#7f8c8d', '#2c3e50'
    ];

    // Helper to get monthly series for a specific listing of categories
    const getValuesSeries = (cats) => {
        return state.validColumns.map(col => {
            let sum = 0;
            state.filteredData.forEach(row => {
                if (cats.includes(row.Categoria)) {
                    sum += parseFloat(row[col]?.toString().replace(',', '.') || 0);
                }
            });
            return sum;
        });
    };

    // Helper to add a dataset
    const addDataset = (label, data, colorIdx) => {
        datasets.push({
            label: label,
            data: data,
            backgroundColor: palette[colorIdx % palette.length],
            borderRadius: 2,
            stack: 'Stack 0'
        });
    };

    if (key === 'total_saidas') {
        const groups = [
            { label: 'Custos Operacionais', mapKey: 'total_custos' },
            { label: 'Despesas Rateadas', mapKey: 'total_despesas' },
            { label: 'Impostos', mapKey: 'total_impostos' },
            { label: 'Investimentos', mapKey: 'total_investimentos' }
        ];
        groups.forEach((g, i) => {
            addDataset(g.label, getValuesSeries(metricMap[g.mapKey]), i);
        });

    } else if (key === 'resultado') {
        // Para Resultado, vamos mostrar Entradas vs Saídas Empilhadas (Neto é difícil de visualizar empilhado)
        // Ou melhor: Breakdown dos componentes principais
        // Atenção: Misturar positivo e negativo em stacked bar funciona (sobe e desce do eixo 0)

        addDataset('Total Entradas Ops.', getValuesSeries(metricMap['total_entradas']), 2); // Verde
        addDataset('Outras Entradas', getValuesSeries(metricMap['outras_entradas']), 5);    // Amarelo
        addDataset('Ativos (Ajuste)', getValuesSeries(['Ativos']), 6);                      // Teal

        // Saídas (Negativas para o gráfico ficar lógico em relação ao saldo? Ou positivas para comparação de volume?)
        // O usuário quer ver "o que compõe". Mostrar saídas como negativo no gráfico de Resultado faz sentido matemática visualmente.

        const invert = (arr) => arr.map(v => -Math.abs(v)); // Força visualização negativa

        addDataset('Custos Operacionais', invert(getValuesSeries(metricMap['total_custos'])), 9); // Laranja 
        addDataset('Despesas Rateadas', invert(getValuesSeries(metricMap['total_despesas'])), 1); // Dark
        addDataset('Impostos', invert(getValuesSeries(metricMap['total_impostos'])), 16);         // Red
        addDataset('Investimentos', invert(getValuesSeries(metricMap['total_investimentos'])), 4); // Purple

    } else if (key === 'fcl') {
        // FCL Composição: Resultado Liquido vs Ded. Ativos
        // FCL = Resultado - Ativos. 
        // Resultado é composto por (Entradas - Saídas). 
        // Visualizar FCL breakdown é complexo. Vamos tentar mostrar Resultado vs Ativos

        // Vamos calcular a série de Resultado primeiro
        const entradas = getValuesSeries(metricMap['total_entradas']);
        const outras = getValuesSeries(metricMap['outras_entradas']);
        const ativos = getValuesSeries(['Ativos']);

        const custos = getValuesSeries(metricMap['total_custos']);
        const despesas = getValuesSeries(metricMap['total_despesas']);
        const impostos = getValuesSeries(metricMap['total_impostos']);
        const invest = getValuesSeries(metricMap['total_investimentos']);

        const resultadoSeries = entradas.map((v, i) => v + outras[i] + ativos[i] - (custos[i] + despesas[i] + impostos[i] + invest[i]));

        addDataset('Resultado Líquido', resultadoSeries, 2);
        addDataset('(-) Ded. Ativos', ativos.map(v => -v), 9); // Negativo pois subtrai

    } else if (metricMap[key]) {
        // Caso Padrão: Divide nas categorias individuais listadas no map
        // Ex: Custos Gerais -> Lista de todas as linhas de custo

        // Se houver muitas categorias, o gráfico fica poluído. Vamos limitar ou agrupar?
        // O pedido foi "cada item". Vamos honrar.

        const categories = metricMap[key];

        // Optimization: Sort categories by total value first to put biggest bars at bottom/top or predictable color order? 
        // Or just iterate.
        categories.forEach((cat, i) => {
            const series = getValuesSeries([cat]);
            // Só adiciona se tiver valor em algum mês (para não poluir a legenda à toa)
            if (series.some(v => v !== 0)) {
                addDataset(cat, series, i);
            }
        });

    } else {
        // Fallback Simple
        addDataset(title, state.validColumns.map(() => 0), 0);
    }

    // Render Modal Chart
    const ctxModal = document.getElementById('modalChart').getContext('2d');
    if (state.charts.modal) state.charts.modal.destroy();

    state.charts.modal = new Chart(ctxModal, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: {
                    stacked: true,
                    grid: { borderDash: [2, 2] },
                    ticks: {
                        callback: function (value) {
                            if (Math.abs(value) >= 1000) {
                                return (value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + 'k';
                            }
                            return value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                },
                datalabels: {
                    color: 'white',
                    display: 'auto', // Use auto to hide overlapping labels
                    formatter: function (value, context) {
                        const stackValues = context.chart.data.datasets.map(d => d.data[context.dataIndex]);
                        const totalStack = stackValues.reduce((acc, v) => acc + Math.abs(v), 0);
                        if (totalStack === 0) return '';

                        const pct = (Math.abs(value) / totalStack * 100);
                        if (pct < 5) return ''; // Hide if less than 5%

                        return pct.toFixed(0) + '%';
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    textShadowBlur: 2,
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    clamp: true
                }
            }
        }
    });

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
    } else if (key === 'resultado') {
        // Detalhamento do Resultado
        const m = state.metrics;
        contributingCategories = [
            { category: '(+) Total Entradas Ops.', value: m.total_entradas },
            { category: '(+) Outras Entradas', value: m.outras_entradas },
            { category: '(+) Ativos (Ajuste)', value: getCatSum("Ativos") },
            { category: '(-) Impostos', value: -m.total_impostos },
            { category: '(-) Custos Operacionais', value: -m.total_custos },
            { category: '(-) Despesas Rateadas', value: -m.total_despesas },
            { category: '(-) Investimentos', value: -m.total_investimentos }
        ];
    } else if (key === 'fcl') {
        // Detalhamento do FCL
        const m = state.metrics;
        contributingCategories = [
            { category: 'Resultado', value: m.resultado },
            { category: '(-) Ded. Ativos', value: -getCatSum("Ativos") }
        ];
    }

    const tbody = document.querySelector('#modalTable tbody');
    tbody.innerHTML = '';

    if (contributingCategories.length > 0) {
        contributingCategories.forEach(item => {
            // Percentual pode não fazer sentido matematicamente para somas/subtrações mistas, 
            // mas mantemos a lógica de % em relação ao total do card para referência.
            // Para valores negativos, o percentual mostrará o impacto negativo.

            // let percent = total !== 0 ? (item.value / total * 100).toFixed(1) + '%' : '-';
            // Ajuste: Para Resultado e FCL, o % direto pode ser confuso. Vamos mostrar '-' se for muito complexo ou manter.
            // Vamos manter simples:
            const percent = total !== 0 ? (Math.abs(item.value) / Math.abs(total) * 100).toFixed(1) + '%' : '-';

            const colorClass = item.value < 0 ? 'text-danger' : 'text-success';

            const row = `
                <tr>
                    <td>${item.category}</td>
                    <td class="text-end ${colorClass}">${formatCurrency(item.value)}</td>
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

// ========================================
// Fluxo de Caixa / Projeção Logic
// ========================================

/**
 * Toggles Projection Mode on/off
 */
function toggleProjectionMode() {
    const btn = document.getElementById('btnFluxoCaixa');
    if (!btn) return;

    state.isProjectionMode = !state.isProjectionMode;

    const periodFilter = document.getElementById('filterPeriodo');
    const title = document.querySelector('.h3');

    if (state.isProjectionMode) {
        // --- ENTER PROJECTION MODE ---
        btn.classList.remove('btn-info');
        btn.classList.add('btn-warning');
        btn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Sair da Projeção';

        if (periodFilter) periodFilter.disabled = true;
        if (title) title.textContent = 'Fluxo de Caixa (Projeção 12 Meses)';

    } else {
        // --- EXIT PROJECTION MODE ---
        btn.classList.add('btn-info');
        btn.classList.remove('btn-warning');
        btn.innerHTML = '<i class="bi bi-graph-up-arrow me-1"></i> Fluxo de Caixa';

        if (periodFilter) periodFilter.disabled = false;
        if (title) title.textContent = 'Demonstração do Resultado';

        // CRITICAL: Reset map of months to remove projected columns from global state
        extractMetadata(state.rawData);

        // Restore user filters in UI (extractMetadata resets them)
        // We set the values back to the DOM elements
        const filterIds = ['filterPeriodo', 'filterEmpresa', 'filterProjeto', 'filterCategoria'];
        filterIds.forEach(fid => {
            const el = document.getElementById(fid);
            const key = fid.replace('filter', '').toLowerCase() + (fid === 'filterPeriodo' ? 's' : 's');
            if (el && state.filters[key]) {
                // For multi-select, we need to select options
                const values = state.filters[key];
                Array.from(el.options).forEach(opt => {
                    opt.selected = values.includes(opt.value);
                });
            }
        });
    }

    // Force update
    applyFilters();
}

/**
 * Generates projection data for the filtered dataset
 * @param {Array} df - The filtered data rows
 * @returns {Array} - The valid future columns
 */
function generateProjections(df) {
    // 1. Identify Base Period dynamically from FILTERED data
    // This ensures that if a company only has data in 2024, we use 2024 as base.
    const activeCols = new Set();

    // Scan filtered data for non-zero columns
    const allKnownCols = Object.keys(state.mapaMeses);

    // Optimization: Check for data presence
    df.forEach(row => {
        allKnownCols.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            if (val !== 0) activeCols.add(col);
        });
    });

    let relevantCols = Array.from(activeCols);

    // Fallback: If no data found (all zeros?), use global last 12
    if (relevantCols.length === 0) {
        relevantCols = allKnownCols;
    }

    // Sort cols based on date
    const sortedCols = relevantCols.sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        const valAnoA = parseInt(anoA) < 100 ? 2000 + parseInt(anoA) : parseInt(anoA);
        const valAnoB = parseInt(anoB) < 100 ? 2000 + parseInt(anoB) : parseInt(anoB);
        if (valAnoA !== valAnoB) return valAnoA - valAnoB;
        return CONFIG.MESES_ORDEM.indexOf(normalizeMes(mesA)) - CONFIG.MESES_ORDEM.indexOf(normalizeMes(mesB));
    });

    // Take last 12 months available in this dataset context
    const baseCols = sortedCols.slice(-12);

    if (baseCols.length === 0) return [];

    // 2. Generate 12 Future Months
    const lastCol = baseCols[baseCols.length - 1];
    const futureCols = generateNext12Months(lastCol);

    // 3. Register Future Months in mapaMeses temporarily
    futureCols.forEach(col => {
        const [mes, ano] = col.split('/');
        state.mapaMeses[col] = normalizeMes(mes);
    });

    // 4. Calculate Averages and Populate Future Columns
    df.forEach(row => {
        let sum = 0;
        let count = 0;

        baseCols.forEach(col => {
            const val = parseFloat(row[col]?.toString().replace(',', '.') || 0);
            sum += val;
            if (val !== 0) count++;
        });

        // Average - Divide by 12 generally for annualized projection smoothness, 
        // OR by baseCols.length? 
        // User said "average of previous 12 months". 
        // Standard approach: Sum / 12 (assuming 0s are real 0s).
        const avg = baseCols.length > 0 ? sum / 12 : 0;

        // Assign to future columns
        futureCols.forEach(fCol => {
            row[fCol] = avg;
        });
    });

    return futureCols;
}

/**
 * Generates an array of 'Mmm/YY' strings for the next 12 months
 * @param {String} lastMonthStr - e.g. "Dez/24"
 */
function generateNext12Months(lastMonthStr) {
    const parts = lastMonthStr.split('/');
    let mesIdx = CONFIG.MESES_ORDEM.indexOf(normalizeMes(parts[0]));
    let ano = parseInt(parts[1]);

    // We need to keep consistent year format.
    const isFullYear = parts[1].length === 4;

    const future = [];
    for (let i = 0; i < 12; i++) {
        mesIdx++;
        if (mesIdx > 11) {
            mesIdx = 0;
            ano++;
        }

        const mesNome = CONFIG.MESES_ORDEM[mesIdx];
        const anoStr = isFullYear ? ano.toString() : ano.toString().slice(-2).padStart(2, '0');
        future.push(`${mesNome}/${anoStr}`);
    }
    return future;
}
// End of Script

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
        headerDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #F2911B; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div id="report-logo-ph"></div>
                    <div>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Indicadores Estratégicos</h1>
                        <p style="margin: 5px 0 0; color: #6c757d; font-size: 14px;">Mar Brasil</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: 600; margin:0;">Dashboard</p>
                    <p style="font-size: 12px; color: #6c757d; margin:5px 0 0;">${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>`;

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

        // --- AI ---
        const aiHeader = document.createElement('div');
        aiHeader.innerHTML = `<h3 style="font-size: 16px; margin-bottom: 15px; border-left: 5px solid #F2911B; padding-left: 10px; background:#f8f9fa; padding:10px;">🤖 Análise de Indicadores (BrisinhAI)</h3>`;
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

        // --- Indicators Grid ---
        const gridSource = document.getElementById('indicatorsContainer');
        if (gridSource) {
            const gridClone = gridSource.cloneNode(true);
            gridClone.style.zoom = "0.75"; // Fit more columns
            gridClone.style.display = 'grid';
            gridClone.style.gridTemplateColumns = 'repeat(3, 1fr)';
            gridClone.style.gap = '20px';

            // Remove 'col-12', 'col-md-4'
            Array.from(gridClone.children).forEach(child => {
                child.className = ''; // Reset classes
                child.style.border = '1px solid #eee';
                child.style.borderRadius = '8px';
                child.style.padding = '10px';
                // Keep internal structure
            });

            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<h6 style="font-size:14px; font-weight:bold; margin-bottom:10px;">Grid de Indicadores</h6>`;
            wrapper.appendChild(gridClone);
            addToPage(wrapper);
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

        doc.save(`Indicadores_MarBrasil_${new Date().toISOString().slice(0, 10)}.pdf`);

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
// Expose globally
window.exportToPDF = exportToPDF;

// ==========================================
// Privacy Mode Logic
// ==========================================
window.togglePrivacyMode = function () {
    document.body.classList.toggle('privacy-active');
    const isPrivacyActive = document.body.classList.contains('privacy-active');
    localStorage.setItem('privacyMode', isPrivacyActive);
    updatePrivacyIcon();
}

function updatePrivacyIcon() {
    const btn = document.getElementById('btnPrivacyToggle');
    if (btn) {
        const icon = btn.querySelector('i');
        const isPrivacyActive = document.body.classList.contains('privacy-active');
        if (isPrivacyActive) {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
            btn.title = "Mostrar Valores";
            btn.classList.add('btn-dark');
            btn.classList.remove('btn-outline-dark');
        } else {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
            btn.title = "Ocultar Valores";
            btn.classList.remove('btn-dark');
            btn.classList.add('btn-outline-dark');
        }
    }
}

// Initialize logic
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage
    const isPrivacyActive = localStorage.getItem('privacyMode') === 'true';
    if (isPrivacyActive) {
        document.body.classList.add('privacy-active');
    }
    updatePrivacyIcon();
});
