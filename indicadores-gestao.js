/**
 * Indicadores de Gestão - Mar Brasil
 * Logic for efficiency KPIs and per-equipment metrics.
 */

const CONFIG = {
    VERSION: "28.9 (Galáxia Estelar)",
    MESES_ORDEM: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
};

let state = {
    rawData: [],
    filteredData: [],
    validColumns: [],
    metrics: {},
    filters: {}
};

const FRASES_CULTURA = [
    { tag: "Missão", texto: "Climatização com Autossuficiência Energética." },
    { tag: "Propósito", texto: "Cuidar de vidas reais." },
    { tag: "Eficiência", texto: "Saúde, segurança e eficiência." },
    { tag: "Segurança", texto: "Segurança é absoluta e inegociável." },
    { tag: "Valores", texto: "Respeito, Disciplina, Técnica, Limpeza e Segurança." },
    { tag: "Pessoas", texto: "Valorizar pessoas e crescer juntos." },
    { tag: "Compromisso", texto: "Lealdade, fidelidade e transparência." },
    { tag: "Excelência", texto: "Excelência técnica e normativa." },
    { tag: "Risco Zero", texto: "Zero tolerância ao risco de vidas." },
    { tag: "Qualidade", texto: "Qualidade do ar que você respira." }
];

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromCache();
    initEventListeners();
});

function loadDataFromCache() {
    const raw = localStorage.getItem('dre_raw_data');
    if (!raw) {
        alert("Dados não encontrados. Por favor, carregue o CSV na página principal do DRE.");
        window.location.href = 'index.html';
        return;
    }

    try {
        state.rawData = JSON.parse(raw);
        const savedFilters = localStorage.getItem('dre_filters');
        if (savedFilters) {
            state.filters = JSON.parse(savedFilters);
        }

        processData();
        renderDashboard();
    } catch (e) {
        console.error("Erro ao carregar cache:", e);
    } finally {
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loadingOverlay').style.display = 'none';
            }, 500);
        }, 800);
    }
}

function processData() {
    const allKeys = Object.keys(state.rawData[0] || {});
    const periodCols = allKeys.filter(k => k.includes('/'));

    periodCols.sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        const yA = parseInt(anoA) < 100 ? 2000 + parseInt(anoA) : parseInt(anoA);
        const yB = parseInt(anoB) < 100 ? 2000 + parseInt(anoB) : parseInt(anoB);
        if (yA !== yB) return yA - yB;
        return CONFIG.MESES_ORDEM.indexOf(normalizeMes(mesA)) - CONFIG.MESES_ORDEM.indexOf(normalizeMes(mesB));
    });

    let activeCols = periodCols;
    if (state.filters.periodos && state.filters.periodos.length > 0) {
        activeCols = periodCols.filter(c => {
            const [mes, ano] = c.split('/');
            const p = `${normalizeMes(mes)}/${ano}`;
            return state.filters.periodos.includes(p) || state.filters.periodos.includes(ano);
        });
    }

    state.validColumns = activeCols;

    let df = [...state.rawData];
    if (state.filters.empresas && state.filters.empresas.length > 0) {
        df = df.filter(row => state.filters.empresas.includes(row.Empresa));
    }
    if (state.filters.projetos && state.filters.projetos.length > 0) {
        df = df.filter(row => state.filters.projetos.includes(row.Projeto));
    }

    state.filteredData = df;
    calculateMetrics();
}

function calculateMetrics() {
    const df = state.filteredData;
    const cols = state.validColumns;

    const sumCats = (cats) => {
        const targetCats = cats.map(c => c.toLowerCase().trim());
        return df
            .filter(row => row.Categoria && targetCats.includes(row.Categoria.toLowerCase().trim()))
            .reduce((acc, row) => {
                let rowSum = 0;
                cols.forEach(c => rowSum += parseFloat(row[c]?.toString().replace(',', '.') || 0));
                return acc + rowSum;
            }, 0);
    };

    const receitaBruta = sumCats(["Receita Bruta de Vendas"]);
    const receitasIndiretas = sumCats(["Receitas Indiretas"]);
    const totalEntradas = receitaBruta + receitasIndiretas;

    const impostos = sumCats(["Impostos", "Provisão - IRPJ e CSSL Trimestral"]);
    const receitaLiquida = totalEntradas - impostos;

    const credencialOp = sumCats(["Credenciado Operacional", "Adiantamento - Credenciado Operacional"]);
    const clts = sumCats(["Despesas com Pessoal"]);
    const preventiva = sumCats(["Preventiva - B2G", "Manutenção Preventiva"]);
    const corretiva = sumCats(["Corretiva - B2G", "Manutenção Corretiva"]);
    const terceirizacao = sumCats(["Terceirização de Mão de Obra"]);
    const custoServicos = sumCats(["Custo dos Serviços Prestados"]);
    const outrosCustos = sumCats(["Outros Custos"]);

    const totalCustos = credencialOp + clts + preventiva + corretiva + terceirizacao + custoServicos + outrosCustos;

    const credencialAdm = sumCats(["Credenciado Administrativo", "Adiantamento - Credenciado Administrativo"]);
    const credencialTI = sumCats(["Credenciado TI", "Adiantamento - Credenciado TI"]);
    const despesasAdm = sumCats(["Despesas Administrativas", "Despesas de Vendas e Marketing", "Despesas Financeiras", "Outros Tributos", "Jurídico", "Despesas Variáveis", "Intermediação de Negócios"]);
    const dividendos = sumCats(["Distribuição de Dividendos", "Dividendos"]);

    const totalDespesas = credencialAdm + credencialTI + despesasAdm + dividendos;

    const investimentos = sumCats(["Consórcios - a contemplar", "Serviços", "Ativos"]);
    const totalSaidas = impostos + totalCustos + totalDespesas + investimentos;

    const resultado = totalEntradas + sumCats(["Ativos"]) + sumCats(["Outras Receitas", "Receitas Financeiras", "Honorários", "Juros e devoluções"]) - totalSaidas;
    const fcl = resultado - sumCats(["Ativos"]);

    const despFinanceiras = sumCats(["Despesas Financeiras"]);
    const ebitda = totalEntradas - totalCustos - (totalDespesas - despFinanceiras - dividendos);

    const despVariaveis = sumCats(["Despesas Variáveis", "Intermediação de Negócios"]);
    const margemContribuicao = receitaLiquida - totalCustos - despVariaveis;

    const pessoal = clts + credencialOp + credencialAdm + credencialTI + terceirizacao;
    const allCredenciados = credencialOp + credencialAdm + credencialTI;

    const totalEquipamentos = sumCats(["Equipamentos"]);

    state.metrics = {
        totalEntradas, receitaBruta, receitaLiquida, totalSaidas, resultado, fcl, ebitda,
        margemContribuicao, pessoal, impostos,
        totalCustos, totalDespesas, investimentos,
        preventiva, corretiva, clts, credencialOp, allCredenciados, terceirizacao,
        totalEquipamentos,
        n: totalEquipamentos || 1
    };
}

function renderDashboard() {
    renderStarField();
    renderSpiralSystem();

    const periodText = state.validColumns.length > 0 ? (state.validColumns.length === 1 ? state.validColumns[0] : `${state.validColumns[0]} - ${state.validColumns[state.validColumns.length - 1]}`) : 'Todo o período';
    const companyText = (state.filters.empresas && state.filters.empresas.length > 0) ? state.filters.empresas.join(', ') : 'Todas as Empresas';

    document.getElementById('periodDisplay').textContent = periodText;
    document.getElementById('companyDisplay').textContent = companyText;

    if (window.APP_VERSION) document.getElementById('versionDisplay').textContent = `v${window.APP_VERSION}`;
}

function renderStarField() {
    const container = document.querySelector('.solar-gestor-container');
    if (!container) return;

    // Remove old star field
    let field = container.querySelector('.star-field');
    if (field) field.remove();

    field = document.createElement('div');
    field.className = 'star-field';

    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 'px';
        star.style.width = size;
        star.style.height = size;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', (2 + Math.random() * 5) + 's');
        field.appendChild(star);
    }

    container.appendChild(field);
}

function renderSpiralSystem() {
    const scene = document.getElementById('solarSceneGestor');
    if (!scene) return;

    const m = state.metrics;
    const n = m.n;
    const sunValueEl = document.getElementById('sunValueGestor');
    if (sunValueEl) {
        sunValueEl.textContent = formatCurrency(m.totalEntradas);
    }

    // Clear previous
    scene.querySelectorAll('.planet-wrapper-gestor, .culture-asteroid-wrapper').forEach(p => p.remove());

    const indicators = [
        { label: "M. Líquida", value: (m.totalEntradas ? (m.resultado / m.totalEntradas * 100) : 0), type: 'percent', icon: 'bi-gem', orbit: 1, glow: 'green-glow' },
        { label: "M. EBITDA", value: (m.totalEntradas ? (m.ebitda / m.totalEntradas * 100) : 0), type: 'percent', icon: 'bi-activity', orbit: 1, glow: 'green-glow' },
        { label: "M. FCL", value: (m.totalEntradas ? (m.fcl / m.totalEntradas * 100) : 0), type: 'percent', icon: 'bi-wallet2', orbit: 1, glow: 'green-glow' },

        { label: "Total Saídas", value: m.totalSaidas / n, type: 'currency', icon: 'bi-graph-down-arrow', orbit: 2, glow: 'orange-glow' },
        { label: "Custos Op.", value: m.totalCustos / n, type: 'currency', icon: 'bi-gear', orbit: 2, glow: 'blue-glow' },
        { label: "Desp. Rateadas", value: m.totalDespesas / n, type: 'currency', icon: 'bi-calculator', orbit: 2, glow: 'blue-glow' },
        { label: "Impostos", value: m.impostos / n, type: 'currency', icon: 'bi-bank', orbit: 2, glow: 'orange-glow' },

        { label: "Pessoal", value: m.pessoal / n, type: 'currency', icon: 'bi-people', orbit: 3, glow: 'blue-glow' },
        { label: "Preventiva", value: (m.preventiva + m.credencialOp + m.clts) / n, type: 'currency', icon: 'bi-shield-check', orbit: 3, glow: 'green-glow' },
        { label: "Corretiva", value: m.corretiva / n, type: 'currency', icon: 'bi-tools', orbit: 3, glow: 'orange-glow' },
        { label: "FCL / Mák", value: m.fcl / n, type: 'currency', icon: 'bi-currency-dollar', orbit: 3, glow: 'green-glow' }
    ];

    indicators.forEach((p, i) => {
        const angle = (i * (360 / indicators.length));
        // Expanded orbital spacing for better clarity
        const baseRadius = p.orbit === 1 ? 250 : (p.orbit === 2 ? 450 : 650);
        const duration = (30 + Math.random() * 50) + 's';

        const wrapper = document.createElement('div');
        wrapper.className = 'planet-wrapper-gestor';
        wrapper.style.setProperty('--base-radius', `${baseRadius}px`);
        wrapper.style.setProperty('--start-angle', `${angle}deg`);
        wrapper.style.setProperty('--duration', duration);

        // Add Micro Dust particles around planet
        for (let d = 0; d < 3; d++) {
            const dust = document.createElement('div');
            dust.className = 'micro-dust';
            dust.style.setProperty('--dust-speed', (3 + Math.random() * 4) + 's');
            dust.style.animationDelay = (Math.random() * 2) + 's';
            wrapper.appendChild(dust);
        }

        const planet = document.createElement('div');
        planet.className = `planet-gestor ${p.glow || ''}`;

        // Reduced sizes for indicators as requested (-0.3x approx)
        const randomSize = Math.floor(125 + Math.random() * 55) + 'px';
        planet.style.width = randomSize;
        planet.style.height = randomSize;

        const formattedVal = p.type === 'percent' ? p.value.toFixed(1) + '%' : formatCurrency(p.value);

        planet.innerHTML = `
            <i class="bi ${p.icon}"></i>
            <div class="planet-title">${p.label}</div>
            <div class="planet-value">${formattedVal}</div>
        `;

        wrapper.appendChild(planet);
        scene.appendChild(wrapper);
    });

    renderCultureAsteroids();
}

function renderCultureAsteroids() {
    const scene = document.getElementById('solarSceneGestor');
    if (!scene) return;

    // Separate Missão from other culture items
    const missao = FRASES_CULTURA.find(f => f.tag === "Missão");
    const cultureOrbits = FRASES_CULTURA.filter(f => f.tag !== "Missão");

    // Create Missão as a special diagonal asteroid
    if (missao) {
        const wrapper = document.createElement('div');
        wrapper.className = 'culture-asteroid-wrapper';
        scene.appendChild(wrapper);

        const asteroidContainer = document.createElement('div');
        asteroidContainer.className = 'asteroid-crossing missao-special';

        // Slower speed: 30s to 42s (3s slower as requested)
        const duration = (30 + Math.random() * 12) + 's';
        const delay = '2s';

        // Central diagonal lane
        const config = { startX: '-40%', startY: '85%', travelX: '140vw', travelY: '-110vh' };
        const randomSize = Math.floor(175 + Math.random() * 70) + 'px';

        asteroidContainer.style.setProperty('--duration', duration);
        asteroidContainer.style.animationDelay = delay;
        asteroidContainer.style.setProperty('--start-x', config.startX);
        asteroidContainer.style.setProperty('--start-y', config.startY);
        asteroidContainer.style.setProperty('--travel-x', config.travelX);
        asteroidContainer.style.setProperty('--travel-y', config.travelY);

        const balloon = document.createElement('div');
        balloon.className = 'culture-balloon missao-balloon';
        balloon.style.width = randomSize;
        balloon.style.height = randomSize;
        balloon.innerHTML = `<strong>${missao.tag}</strong><span>${missao.texto}</span>`;

        // Add trail particles
        for (let t = 0; t < 6; t++) {
            const trail = document.createElement('div');
            trail.className = 'asteroid-trail';
            trail.style.left = (20 + Math.random() * 60) + '%';
            trail.style.top = (20 + Math.random() * 60) + '%';
            trail.style.animationDelay = (t * 0.3) + 's';
            balloon.appendChild(trail);
        }

        asteroidContainer.appendChild(balloon);
        wrapper.appendChild(asteroidContainer);
    }

    // Create other culture values as orbiting planets
    cultureOrbits.forEach((f, i) => {
        const angle = (i * (360 / cultureOrbits.length));
        // Orbits 4 and 5 (outermost)
        const orbit = i < Math.ceil(cultureOrbits.length / 2) ? 4 : 5;
        const baseRadius = orbit === 4 ? 800 : 950;
        const duration = (40 + Math.random() * 30) + 's';

        const wrapper = document.createElement('div');
        wrapper.className = 'planet-wrapper-gestor culture-orbit';
        wrapper.style.setProperty('--base-radius', `${baseRadius}px`);
        wrapper.style.setProperty('--start-angle', `${angle}deg`);
        wrapper.style.setProperty('--duration', duration);

        const planet = document.createElement('div');
        planet.className = 'culture-planet';

        // Random sizes for culture planets
        const randomSize = Math.floor(140 + Math.random() * 60) + 'px';
        planet.style.width = randomSize;
        planet.style.height = randomSize;

        planet.innerHTML = `
            <div class="culture-planet-content">
                <strong>${f.tag}</strong>
                <span>${f.texto}</span>
            </div>
        `;

        wrapper.appendChild(planet);
        scene.appendChild(wrapper);
    });
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function normalizeMes(mes) {
    if (!mes) return "";
    return mes.trim().charAt(0).toUpperCase() + mes.trim().slice(1).toLowerCase();
}

function initEventListeners() {
    const btnPrivacy = document.getElementById('btnPrivacy');
    if (btnPrivacy) {
        btnPrivacy.addEventListener('click', () => {
            document.body.classList.toggle('privacy-enabled');
            const icon = btnPrivacy.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            }
        });
    }
}
