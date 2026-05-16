// Análise Setorial - Mar Brasil
// Version: 1.1.0 - Com Rateio Administrativo
// Last Update: 08/01/2026

// Configuration
const CONFIG = {
    VERSION: "26.8",
    LAST_UPDATE: "08/01/2026 - 13:30",
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
    CHART_COLORS: [
        '#F2911B', '#00477A', '#2ecc71', '#e74c3c', '#3498db',
        '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#e67e22',
        '#95a5a6', '#d35400', '#c0392b', '#8e44ad', '#16a085'
    ],
    RATEIO_CONFIG: {
        SETOR_RATEIO: 'Administrativo',  // Setor que será rateado
        CATEGORIA_EQUIPE: 'Equipe'        // Categoria que indica número de pessoas
    }
};

// State
let state = {
    rawData: [],
    processedData: [],  // Dados após rateio
    filteredData: [],
    equipeData: {},     // Dados de equipe por setor/período
    filters: {
        periodos: [],
        setores: [],
        categorias: []
    },
    charts: {
        main: null,
        pie: null,
        line: null,
        topCategories: null,
        variation: null,
        modal: null
    }
};

// Register DataLabels plugin
Chart.register(ChartDataLabels);

// ========================================
// Rateio Logic
// ========================================

function aplicarRateio() {
    console.log('Aplicando rateio do setor Administrativo...');

    // 1. Extrair dados de Equipe (número de pessoas por setor/período)
    const equipeRows = state.rawData.filter(row =>
        row.Categoria && row.Categoria.toLowerCase().includes('equipe')
    );

    console.log('Linhas de Equipe encontradas:', equipeRows);

    // Construir mapa de equipe: {setor: {periodo: numPessoas}}
    state.equipeData = {};
    equipeRows.forEach(row => {
        if (!state.equipeData[row.Setor]) {
            state.equipeData[row.Setor] = {};
        }

        // Para cada período, pegar o número de pessoas
        Object.keys(row).forEach(key => {
            if (key.match(/^(\d{2}|[a-zA-Z]{3})\/\d{2}$/)) {
                state.equipeData[row.Setor][key] = row[key] || 0;
            }
        });
    });

    console.log('Mapa de Equipe:', state.equipeData);

    // 2. Separar despesas administrativas
    const despesasAdministrativas = state.rawData.filter(row =>
        row.Setor === CONFIG.RATEIO_CONFIG.SETOR_RATEIO &&
        !row.Categoria.toLowerCase().includes('equipe')  // Não incluir a própria linha de Equipe
    );

    console.log('Despesas Administrativas a ratear:', despesasAdministrativas);

    // 3. Calcular rateio para cada período
    const periodosDisponiveis = getAvailablePeriodsFromRaw();

    periodosDisponiveis.forEach(periodo => {
        // Calcular total de pessoas no período (exceto Administrativo)
        let totalPessoas = 0;
        Object.keys(state.equipeData).forEach(setor => {
            if (setor !== CONFIG.RATEIO_CONFIG.SETOR_RATEIO) {
                totalPessoas += state.equipeData[setor][periodo] || 0;
            }
        });

        console.log(`Período ${periodo}: Total pessoas = ${totalPessoas}`);

        if (totalPessoas === 0) {
            console.warn(`Período ${periodo}: sem pessoas para ratear`);
            return;
        }

        // Para cada despesa administrativa
        despesasAdministrativas.forEach(despesaAdm => {
            const valorTotal = despesaAdm[periodo] || 0;
            if (valorTotal === 0) return;

            // Ratear para cada setor proporcionalmente
            Object.keys(state.equipeData).forEach(setor => {
                if (setor === CONFIG.RATEIO_CONFIG.SETOR_RATEIO) return; // Não ratear para si mesmo

                const numPessoas = state.equipeData[setor][periodo] || 0;
                if (numPessoas === 0) return;

                const proporcao = numPessoas / totalPessoas;
                const valorRateado = valorTotal * proporcao;

                // Adicionar ou atualizar linha rateada
                const categoriaRateada = `${despesaAdm.Categoria} (Rateado)`;

                let linhaRateada = state.processedData.find(row =>
                    row.Setor === setor && row.Categoria === categoriaRateada
                );

                if (!linhaRateada) {
                    linhaRateada = {
                        Setor: setor,
                        Categoria: categoriaRateada,
                        Despesas: 0,
                        _isRateado: true
                    };
                    state.processedData.push(linhaRateada);
                }

                if (!linhaRateada[periodo]) linhaRateada[periodo] = 0;
                linhaRateada[periodo] += valorRateado;
            });
        });
    });

    console.log('Dados processados após rateio:', state.processedData);
}

function getAvailablePeriodsFromRaw() {
    if (state.rawData.length === 0) return [];

    const periods = new Set();
    state.rawData.forEach(row => {
        Object.keys(row).forEach(key => {
            if (key.match(/^(\d{2}|[a-zA-Z]{3})\/\d{2}$/)) {
                periods.add(key);
            }
        });
    });

    return Array.from(periods).sort((a, b) => {
        const [monthA, yearA] = a.split('/');
        const [monthB, yearB] = b.split('/');
        // Se ambos são numéricos, compara numericamente
        if (!isNaN(monthA) && !isNaN(monthB)) {
            return yearA !== yearB ? yearA - yearB : monthA - monthB;
        }
        // Senão, compara como string (ordem alfabética)
        return `${yearA}${monthA}`.localeCompare(`${yearB}${monthB}`);
    });
}

// ========================================
// Initialization
// ========================================

function initCharts() {
    const chartConfigs = {
        main: { id: 'mainChart', type: 'bar' },
        pie: { id: 'pieChart', type: 'pie' },
        line: { id: 'lineChart', type: 'line' },
        topCategories: { id: 'topCategoriesChart', type: 'bar' },
        variation: { id: 'variationChart', type: 'bar' },
        modal: { id: 'modalChart', type: 'bar' }
    };

    Object.keys(chartConfigs).forEach(key => {
        const config = chartConfigs[key];
        const canvas = document.getElementById(config.id);
        if (canvas) {
            state.charts[key] = new Chart(canvas, {
                type: config.type,
                data: { labels: [], datasets: [] },
                options: getDefaultChartOptions(config.type)
            });
        }
    });
}

function getDefaultChartOptions(type) {
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: type === 'pie',
        plugins: {
            legend: {
                display: type === 'pie' || type === 'line',
                position: 'top'
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        label += formatCurrency(context.parsed.y || context.parsed);
                        return label;
                    }
                }
            },
            datalabels: {
                display: type === 'pie',
                color: '#fff',
                font: { weight: 'bold', size: 12 },
                formatter: (value, ctx) => {
                    if (type === 'pie') {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return percentage + '%';
                    }
                    return formatCurrency(value, false);
                }
            }
        }
    };

    if (type !== 'pie') {
        baseOptions.scales = {
            x: { stacked: type === 'bar', grid: { display: false } },
            y: {
                stacked: type === 'bar',
                beginAtZero: true,
                ticks: {
                    callback: value => formatCurrency(value, false)
                }
            }
        };
    }

    return baseOptions;
}

// =========================...
// (Continue com o resto do código do arquivo original, mas usando state.processedData em vez de state.rawData para gráficos e tabelas)
