/**
 * Módulo de Comissões v15.0 - Mar Brasil
 * Integração com Supabase via Vercel API
 */

let state = {
    equipe: [],
    contratos: [],
    historico: [],
    padroes: {
        'Carlos': 0.0035,   // 0.35%
        'Abrantes': 0.0035, // 0.35%
        'Geovanna': 0.0020, // 0.20%
        'Prado': 0.0010     // 0.10%
    }
};

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
});

async function init() {
    const debug = document.getElementById('debugPanel');
    const output = document.getElementById('debugOutput');

    try {
        debug.classList.remove('d-none');
        output.innerHTML = "📡 Tentando conectar com a API...";

        // 1. Initial Data
        const res = await fetch('/api/comissoes?type=init');
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.details || `Erro ${res.status}`);
        }

        const data = await res.json();
        console.log("Dados Iniciais:", data);

        output.innerHTML = `✅ Conectado! Equipe: ${data.equipe_count} | Contratos: ${data.contratos_count}`;

        state.equipe = data.equipe || [];
        state.contratos = data.contratos || [];

        if (state.equipe.length === 0) {
            output.innerHTML += `<br>⚠️ <strong>Aviso:</strong> Ninguém na tabela 'equipe'. Rode o script de reparo no Supabase.`;
        } else {
            // Ocultar debug após 5 segundos se tudo estiver OK
            setTimeout(() => { if (state.historico.length > 0) debug.classList.add('d-none') }, 5000);
        }

        populateSelectors();
        renderDivisoesSugeridas();

        // 2. Load History
        await loadHistory();

    } catch (error) {
        console.warn("API indisponível, tentando MODO OFFLINE:", error.message);
        initOfflineMode(error.message);
    }
}

async function initOfflineMode(errorMsg) {
    const debug = document.getElementById('debugPanel');
    const output = document.getElementById('debugOutput');
    debug.classList.remove('d-none');
    output.innerHTML = `⚠️ <strong>Modo Offline:</strong> ${errorMsg}<br>Tentando carregar dados de 'dados-comissoes.csv'...`;
    output.classList.add('text-warning');

    const defaultFile = 'dados-comissoes.csv';
    try {
        const response = await fetch(defaultFile);
        if (!response.ok) throw new Error("Arquivo 'dados-comissoes.csv' não encontrado.");

        const text = await response.text();
        
        // Parsing manual simples do CSV (formatado para Comissões)
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log("Offline CSV loaded:", results.data);
                processOfflineData(results.data);
            },
            error: (err) => { throw new Error(err.message); }
        });

    } catch (err) {
        output.innerHTML = `❌ <strong>Erro Crítico:</strong> Não foi possível conectar à API nem carregar o CSV local.<br>${err.message}`;
        output.classList.remove('text-warning');
        output.classList.add('text-danger');
    }
}

function processOfflineData(data) {
    // 1. Mapear Equipe (baseado nos cabeçalhos que não são colunas fixas)
    const fixedKeys = ['contrato', 'data', 'nf', 'ciclo', 'valor liquido'];
    const allKeys = Object.keys(data[0] || {});
    const memberNames = allKeys.filter(k => !fixedKeys.includes(k.toLowerCase()));
    
    state.equipe = memberNames.map((nome, idx) => ({
        id: `offline-${idx}`,
        nome: nome,
        ativo: true,
        pct_padrao: state.padroes[nome] || 0
    }));

    // 2. Mapear Contratos
    const uniqueContratos = [...new Set(data.map(d => d.Contrato))].filter(Boolean);
    state.contratos = uniqueContratos.map((nome, idx) => ({
        id: `c-off-${idx}`,
        nome_contrato: nome
    }));

    // 3. Mapear Histórico
    state.historico = data.map((d, idx) => {
        const comissoes = [];
        memberNames.forEach(nome => {
            const val = parseCurrency(d[nome]);
            if (val > 0) {
                comissoes.push({
                    membro_id: state.equipe.find(m => m.nome === nome).id,
                    equipe: { nome: nome },
                    valor_calculado: val,
                    porcentagem: val / (parseCurrency(d['Valor Liquido']) * 0.01) // Estimativa
                });
            }
        });

        return {
            id: `h-off-${idx}`,
            contrato_id: state.contratos.find(c => c.nome_contrato === d.Contrato)?.id,
            contratos_base: { nome_contrato: d.Contrato },
            data_recebimento: d.Data || '',
            nota_fiscal: d.NF || '',
            ciclo: d.Ciclo || '',
            valor_liquido: parseCurrency(d['Valor Liquido']),
            comissoes: comissoes
        };
    });

    populateSelectors();
    renderDivisoesSugeridas();
    renderHistory();
    updateKPIs();
    
    const output = document.getElementById('debugOutput');
    output.innerHTML = `✅ <strong>MODO OFFLINE ATIVO</strong><br>Dados carregados de 'dados-comissoes.csv'`;
    document.getElementById('lastUpdate').textContent = "Sincronizado: Arquivo LOCAL Offline";
}

async function loadHistory() {
    try {
        showLoading(true);
        console.log("Carregando histórico...");
        const res = await fetch('/api/comissoes?type=history');
        if (!res.ok) throw new Error(`Status API (history): ${res.status}`);

        state.historico = await res.json();
        console.log("Histórico recebido:", state.historico);

        renderHistory();
        updateKPIs();
    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
    } finally {
        showLoading(false);
    }
}

function populateSelectors() {
    const select = document.getElementById('selectContrato');
    const filterContrato = document.getElementById('filterContrato');
    const filterComissionado = document.getElementById('filterComissionado');

    // Preencher dropdown do modal
    if (select) {
        state.contratos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome_contrato;
            select.appendChild(opt);
        });
    }

    // Preencher filtro de contrato
    if (filterContrato) {
        state.contratos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome_contrato;
            filterContrato.appendChild(opt);
        });
    }

    // Preencher filtro de comissionado (apenas ativos)
    if (filterComissionado) {
        filterComissionado.innerHTML = '<option value="">Todos</option>';
        state.equipe.filter(m => m.ativo).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nome;
            filterComissionado.appendChild(opt);
        });
    }

    // Preencher lista de gerenciamento de equipe
    renderGerenciarEquipe();
}

function renderGerenciarEquipe() {
    const container = document.getElementById('equipeListContainer');
    if (!container) return;
    container.innerHTML = '';

    state.equipe.forEach(m => {
        const item = document.createElement('div');
        item.className = 'list-group-item bg-transparent border-secondary text-white d-flex justify-content-between align-items-center px-0';
        item.innerHTML = `
            <div>
                <span class="${m.ativo ? '' : 'text-white-50 text-decoration-line-through'}">${m.nome}</span>
                <div class="small text-white-50">${(m.pct_padrao * 100).toFixed(2)}% padrão</div>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" ${m.ativo ? 'checked' : ''} 
                    onchange="toggleMembroStatus('${m.id}', this.checked)">
            </div>
        `;
        container.appendChild(item);
    });
}

async function toggleMembroStatus(id, ativo) {
    try {
        showLoading(true);
        const res = await fetch('/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_membro_status', id, ativo })
        });

        if (!res.ok) throw new Error('Erro ao atualizar status');

        const updated = await res.json();
        const idx = state.equipe.findIndex(m => m.id === id);
        if (idx !== -1) {
            state.equipe[idx] = updated;
        }

        renderDivisoesSugeridas();
        renderGerenciarEquipe();
        populateSelectors();

    } catch (error) {
        alert(error.message);
    } finally {
        showLoading(false);
    }
}

function renderDivisoesSugeridas() {
    const container = document.getElementById('divisoesContainer');
    if (!container) return;
    container.innerHTML = '';

    state.equipe.filter(m => m.ativo).forEach(membro => {
        const pctPadrao = state.padroes[membro.nome] || 0;

        const div = document.createElement('div');
        div.className = 'col-md-3';
        div.innerHTML = `
            <div class="p-2 border border-secondary rounded-3 bg-dark-subtle">
                <small class="d-block text-white-50 border-bottom border-secondary mb-2 pb-1">${membro.nome}</small>
                <div class="input-group input-group-sm mb-2">
                    <input type="number" step="0.01" class="form-control bg-dark text-warning border-secondary fw-bold input-pct" 
                        data-membro-id="${membro.id}" data-membro-nome="${membro.nome}" value="${(pctPadrao * 100).toFixed(2)}">
                    <span class="input-group-text bg-transparent text-white-50 border-secondary">%</span>
                </div>
                <div class="text-primary fw-bold valor-calculado" id="calc-${membro.id}">R$ 0,00</div>
            </div>
        `;
        container.appendChild(div);
    });

    // Add listeners to recalculate on the fly
    container.querySelectorAll('.input-pct').forEach(input => {
        input.addEventListener('input', recalculateSuggested);
    });

    recalculateSuggested();
}

function recalculateSuggested() {
    const liquido = parseFloat(document.getElementById('inputLiquido').value) || 0;
    let totalPct = 0;

    document.querySelectorAll('.input-pct').forEach(input => {
        const pctDigitado = parseFloat(input.value) || 0;
        totalPct += pctDigitado;

        const pct = pctDigitado / 100;
        const valor = liquido * pct;
        const membroId = input.dataset.membroId;
        const calcEl = document.getElementById(`calc-${membroId}`);
        if (calcEl) calcEl.textContent = formatCurrency(valor);
    });

    // Atualizar indicador de total
    const indicador = document.getElementById('totalPctIndicador');
    if (indicador) {
        indicador.textContent = `${totalPct.toFixed(2)}%`;
        // Deve somar 1% total (que representamos como 100% da distribuição sugerida ou 1.0 no total dos campos)
        // Como os campos são digitados como "0.35", a soma deve ser 1.00 se for 1% total.
        // Se o usuário usa 100 como base, ajustamos. Aqui parece usar 1.0 como total (0.35+0.35+0.20+0.10)
        if (Math.abs(totalPct - 1.0) < 0.001) {
            indicador.className = 'badge rounded-pill px-3 py-2 fw-bold bg-success';
        } else {
            indicador.className = 'badge rounded-pill px-3 py-2 fw-bold bg-danger';
        }
    }
}

function renderHistory(dados = null) {
    const tbody = document.getElementById('comissoesTableBody');
    const theadRow = document.getElementById('comissoesTableHead');
    if (!tbody || !theadRow) return;

    const historico = dados || state.historico;

    // 1. Identificar todos os nomes de membros para as colunas
    // Usamos um Set para garantir nomes únicos e ordenados
    const nomesParaColunas = new Set();

    // Adicionar membros ativos atuais
    state.equipe.filter(m => m.ativo).forEach(m => nomesParaColunas.add(m.nome));

    // Adicionar membros que já têm dados no histórico (mesmo que inativos agora)
    historico.forEach(rec => {
        rec.comissoes.forEach(com => {
            if (com.equipe?.nome) nomesParaColunas.add(com.equipe.nome);
        });
    });

    const listaNomes = Array.from(nomesParaColunas).sort();

    // 2. Atualizar Cabeçalho (thead)
    theadRow.innerHTML = `
        <th style="width: 40px;"></th>
        <th>Contrato</th>
        <th>Data</th>
        <th>NF</th>
        <th>Ciclo</th>
        <th>Valor Líquido</th>
        <th>Total 1%</th>
        ${listaNomes.map(nome => `<th class="text-nowrap text-uppercase small" style="min-width: 100px;">${nome}</th>`).join('')}
    `;

    // 3. Atualizar Corpo (tbody)
    tbody.innerHTML = '';
    if (historico.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${7 + listaNomes.length}" class="text-center py-5 opacity-50">Nenhum recebimento encontrado.<br><small>Ajuste os filtros ou cadastre um novo recebimento.</small></td></tr>`;
        return;
    }

    historico.forEach(rec => {
        const contratoNome = rec.contratos_base?.nome_contrato || 'N/A';
        const totalUmPorCento = rec.valor_liquido * 0.01;

        const row = document.createElement('tr');

        let cicloFormatado = '-';
        if (rec.ciclo) {
            const [ano, mes] = rec.ciclo.split('-');
            cicloFormatado = `${mes}/${ano}`;
        }

        const [y, m, d] = rec.data_recebimento.split('-');
        const dataFormatada = `${d}/${m}/${y}`;

        // Base HTML
        let rowHtml = `
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-warning border-0 p-1" onclick="editRecebimento('${rec.id}')" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger border-0 p-1" onclick="deleteRecebimento('${rec.id}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
            <td>${contratoNome}</td>
            <td class="small">${dataFormatada}</td>
            <td>${rec.nota_fiscal || '-'}</td>
            <td class="small text-nowrap">${cicloFormatado}</td>
            <td>${formatCurrency(rec.valor_liquido)}</td>
            <td class="text-primary fw-bold">${formatCurrency(totalUmPorCento)}</td>
        `;

        // Dynamic Member Cells
        listaNomes.forEach(nome => {
            const comissao = rec.comissoes.find(c => c.equipe?.nome === nome);
            const valor = comissao ? comissao.valor_calculado : 0;
            const corClass = valor > 0 ? 'text-white' : 'text-white-50 opacity-25';
            rowHtml += `<td class="${corClass} small">${formatCurrency(valor)}</td>`;
        });

        row.innerHTML = rowHtml;
        tbody.appendChild(row);
    });
}

function updateKPIs(dados = null) {
    const historico = dados || state.historico;
    let totais = { Geral: 0 };

    // Inicializar totais baseados em todos os membros que aparecem no histórico + membros atuais
    state.equipe.forEach(m => {
        totais[m.nome] = 0;
    });

    historico.forEach(rec => {
        rec.comissoes.forEach(com => {
            const nome = com.equipe?.nome;
            if (nome) {
                if (totais[nome] === undefined) totais[nome] = 0;
                totais[nome] += com.valor_calculado;
                totais.Geral += com.valor_calculado;
            }
        });
    });

    // Renderizar cards dinamicamente
    const container = document.getElementById('kpiCardsContainer');
    if (container) {
        container.innerHTML = '';

        // Mostrar cards apenas para membros ativos ou que tenham algum valor no período
        const membrosParaMostrar = state.equipe.filter(m => m.ativo || (totais[m.nome] > 0));

        membrosParaMostrar.forEach(m => {
            const valor = totais[m.nome] || 0;
            const div = document.createElement('div');
            div.className = 'col-md-3';
            div.innerHTML = `
                <div class="glass-card kpi">
                    <div class="card-label"><i class="bi bi-people me-2"></i>${m.nome}</div>
                    <div class="card-value h3" style="font-size: 1.5rem;">${formatCurrency(valor)}</div>
                    <div class="card-subtitle small opacity-50">${(m.pct_padrao * 100).toFixed(2)}% Padrão</div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    if (document.getElementById('totalGeralComissoes')) {
        document.getElementById('totalGeralComissoes').textContent = formatCurrency(totais.Geral);
    }
}

window.editRecebimento = function (id) {
    const rec = state.historico.find(r => r.id === id);
    if (!rec) return;

    // Preencher campos do modal
    document.getElementById('selectContrato').value = rec.contrato_id;
    document.getElementById('inputData').value = rec.data_recebimento;
    document.getElementById('inputNF').value = rec.nota_fiscal || '';
    document.getElementById('inputCiclo').value = rec.ciclo || '';
    document.getElementById('inputBruto').value = rec.valor_bruto;
    document.getElementById('inputLiquido').value = rec.valor_liquido;

    // Preencher divisões
    renderDivisoesSugeridas();

    // Atualizar percentuais se houver comissões salvas
    if (rec.comissoes && rec.comissoes.length > 0) {
        rec.comissoes.forEach(com => {
            const input = document.querySelector(`.input-pct[data-membro-id="${com.membro_id}"]`);
            if (input) {
                input.value = (com.porcentagem * 100).toFixed(2);
            }
        });
        recalculateSuggested();
    }

    // Alterar botão de salvar para modo edição
    const form = document.getElementById('formRecebimento');
    form.dataset.editId = id;
    form.querySelector('button[type="submit"]').textContent = 'Atualizar Lançamento';

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('modalLancamento'));
    modal.show();
}

window.deleteRecebimento = async function (id) {
    if (!confirm('Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        showLoading(true);
        const res = await fetch('/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_recebimento', id })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao excluir lançamento');
        }

        await loadHistory();
        alert('Lançamento excluído com sucesso.');

    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    const form = document.getElementById('formRecebimento');
    if (form) {
        form.addEventListener('submit', handleSave);
    }

    const inputLiquido = document.getElementById('inputLiquido');
    if (inputLiquido) {
        inputLiquido.addEventListener('input', recalculateSuggested);
    }

    // Form Novo Contrato
    const formContrato = document.getElementById('formNovoContrato');
    if (formContrato) {
        formContrato.addEventListener('submit', handleSaveContrato);
    }

    // Form Novo Comissionado
    const formComissionado = document.getElementById('formNovoComissionado');
    if (formComissionado) {
        formComissionado.addEventListener('submit', handleSaveComissionado);
    }

    // Resetar form de lançamento ao fechar
    const modalLancamento = document.getElementById('modalLancamento');
    const modalNovoMembro = document.getElementById('modalNovoComissionado');

    if (modalLancamento) {
        modalLancamento.addEventListener('hidden.bs.modal', () => {
            // Se o modal de novo membro abrir, não resetamos o form do lançamento
            // para que os dados possam ser restaurados depois.
            // Apenas resetamos se o modal estiver fechando de vez (sem outro abrindo)
            setTimeout(() => {
                if (!document.body.classList.contains('modal-open')) {
                    const form = document.getElementById('formRecebimento');
                    if (form) {
                        form.reset();
                        delete form.dataset.editId;
                        const submitBtn = form.querySelector('button[type="submit"]');
                        if (submitBtn) submitBtn.textContent = 'Salvar Recebimento';
                    }
                }
            }, 300);
        });
    }

    if (modalNovoMembro) {
        modalNovoMembro.addEventListener('hidden.bs.modal', () => {
            // Ao fechar o modal de novo membro, reabrimos o de lançamento se ele estava sendo preenchido
            // O state e os dados já são restaurados no handleSaveComissionado
            const m = new bootstrap.Modal(document.getElementById('modalLancamento'));
            m.show();
        });
    }

    // Botões de Filtro
    const btnAplicar = document.getElementById('btnAplicarFiltros');
    if (btnAplicar) {
        btnAplicar.addEventListener('click', applyFilters);
    }

    const btnLimpar = document.getElementById('btnLimparFiltros');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', clearFilters);
    }
}

// Aplicar filtros
function applyFilters() {
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;
    const ciclo = document.getElementById('filterCiclo').value;
    const contratoId = document.getElementById('filterContrato').value;
    const comissionadoId = document.getElementById('filterComissionado').value;

    state.historicoFiltrado = state.historico.filter(rec => {
        // Filtro de período
        if (dataInicio && rec.data_recebimento < dataInicio) return false;
        if (dataFim && rec.data_recebimento > dataFim) return false;

        // Filtro de ciclo
        if (ciclo && rec.ciclo !== ciclo) return false;

        // Filtro de contrato
        if (contratoId && rec.contrato_id !== contratoId) return false;

        // Filtro de comissionado (verifica se tem comissão do membro)
        if (comissionadoId) {
            const temComissao = rec.comissoes.some(c => c.membro_id === comissionadoId);
            if (!temComissao) return false;
        }

        return true;
    });

    renderHistory(state.historicoFiltrado);
    updateKPIs(state.historicoFiltrado);
}

// Limpar filtros
function clearFilters() {
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterCiclo').value = '';
    document.getElementById('filterContrato').value = '';
    document.getElementById('filterComissionado').value = '';

    state.historicoFiltrado = null;
    renderHistory();
    updateKPIs();
}

// Salvar novo contrato
async function handleSaveContrato(e) {
    e.preventDefault();

    const nome = document.getElementById('inputNomeContrato').value.trim();
    const numero = document.getElementById('inputNumeroContrato').value.trim();
    const obs = document.getElementById('inputObsContrato').value.trim();

    if (!nome) {
        alert('Nome do contrato é obrigatório.');
        return;
    }

    try {
        showLoading(true);
        const res = await fetch('/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_contrato',
                nome_contrato: nome,
                numero_contrato: numero,
                observacoes: obs
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Erro ao salvar contrato');
        }

        const novoContrato = await res.json();

        // Adicionar ao dropdown
        const select = document.getElementById('selectContrato');
        const opt = document.createElement('option');
        opt.value = novoContrato.id;
        opt.textContent = novoContrato.nome_contrato;
        select.appendChild(opt);
        select.value = novoContrato.id;

        // Adicionar ao state
        state.contratos.push(novoContrato);

        // Fechar modal e limpar form
        bootstrap.Modal.getInstance(document.getElementById('modalNovoContrato')).hide();
        document.getElementById('formNovoContrato').reset();

        alert('Contrato cadastrado com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar contrato:', error);
        alert('Erro: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Salvar novo comissionado
async function handleSaveComissionado(e) {
    e.preventDefault();

    const nome = document.getElementById('inputNomeComissionado').value.trim();
    const pct = parseFloat(document.getElementById('inputPctComissionado').value) / 100;

    if (!nome) {
        alert('Nome do comissionado é obrigatório.');
        return;
    }

    try {
        showLoading(true);
        const res = await fetch('/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_equipe',
                nome: nome,
                pct_padrao: pct
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Erro ao salvar comissionado');
        }

        const novoMembro = await res.json();

        // Adicionar ao state
        state.equipe.push(novoMembro);
        state.padroes[novoMembro.nome] = pct;

        // Salvar dados atuais do modal de lançamento antes de re-renderizar
        const formRec = document.getElementById('formRecebimento');
        const currentData = {
            contrato: document.getElementById('selectContrato').value,
            data: document.getElementById('inputData').value,
            nf: document.getElementById('inputNF').value,
            ciclo: document.getElementById('inputCiclo').value,
            bruto: document.getElementById('inputBruto').value,
            liquido: document.getElementById('inputLiquido').value,
            pcts: {}
        };
        document.querySelectorAll('.input-pct').forEach(input => {
            currentData.pcts[input.dataset.membroId] = input.value;
        });

        // Re-renderizar seletores e distribuição
        populateSelectors();
        renderDivisoesSugeridas();

        // Restaurar dados
        document.getElementById('selectContrato').value = currentData.contrato;
        document.getElementById('inputData').value = currentData.data;
        document.getElementById('inputNF').value = currentData.nf;
        document.getElementById('inputCiclo').value = currentData.ciclo;
        document.getElementById('inputBruto').value = currentData.bruto;
        document.getElementById('inputLiquido').value = currentData.liquido;
        Object.keys(currentData.pcts).forEach(id => {
            const input = document.querySelector(`.input-pct[data-membro-id="${id}"]`);
            if (input) input.value = currentData.pcts[id];
        });
        recalculateSuggested();

        // Fechar apenas o modal de novo comissionado
        const modalNovo = bootstrap.Modal.getInstance(document.getElementById('modalNovoComissionado'));
        modalNovo.hide();
        document.getElementById('formNovoComissionado').reset();

        alert('Comissionado cadastrado com sucesso!');

    } catch (error) {
        console.error('Erro ao salvar comissionado:', error);
        alert('Erro: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function handleSave(e) {
    e.preventDefault();

    const divisoes = [];
    let totalPct = 0;
    document.querySelectorAll('.input-pct').forEach(input => {
        const pctDigitado = parseFloat(input.value) || 0;
        totalPct += pctDigitado;

        const liquido = parseFloat(document.getElementById('inputLiquido').value) || 0;
        const pct = pctDigitado / 100;

        divisoes.push({
            membro_id: input.dataset.membroId,
            porcentagem: pct,
            valor_comissao: liquido * pct
        });
    });

    // VALIDAÇÃO: Soma deve ser 1.00%
    if (Math.abs(totalPct - 1.0) > 0.001) {
        alert(`A soma das comissões está incorreta (${totalPct.toFixed(2)}%). \n\nÉ necessário reanalisar a distribuição para que o total seja exatamente 1.00%.`);
        return;
    }

    const payload = {
        contrato_id: document.getElementById('selectContrato').value,
        data_recebimento: document.getElementById('inputData').value,
        nota_fiscal: document.getElementById('inputNF').value,
        ciclo: document.getElementById('inputCiclo').value,
        valor_bruto: parseFloat(document.getElementById('inputBruto').value),
        valor_liquido: parseFloat(document.getElementById('inputLiquido').value),
        divisoes
    };

    const editId = formRecebimento.dataset.editId;
    if (editId) {
        payload.action = 'update_recebimento';
        payload.id = editId;
    }

    try {
        const res = await fetch('/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalLancamento')).hide();
            // Resetar form e modo edição
            formRecebimento.reset();
            delete formRecebimento.dataset.editId;
            formRecebimento.querySelector('button[type="submit"]').textContent = 'Salvar Recebimento';

            await loadHistory();
        } else {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao salvar');
        }
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
}

function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) overlay.classList.remove('d-none');
        else overlay.classList.add('d-none');
    }
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const content = document.getElementById('mainContent');

    showLoading(true);
    try {
        let iaAnalysis = "Análise estratégica não disponível no momento.";
        if (window.getBrisinhAIAnalysis) {
            iaAnalysis = await window.getBrisinhAIAnalysis();
        }

        const canvas = await html2canvas(content, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(242, 145, 27);
        doc.text("Análise Estratégica BrisinhAI - Comissões", 10, 20);

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const splitText = doc.splitTextToSize(iaAnalysis.replace(/<[^>]*>/g, ''), pdfWidth - 20);
        doc.text(splitText, 10, 30);

        doc.save(`Mar_Brasil_Comissoes_${new Date().getTime()}.pdf`);
    } catch (err) {
        console.error("PDF Export Error:", err);
    } finally {
        showLoading(false);
    }
}
