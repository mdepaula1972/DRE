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
        output.innerHTML = `❌ <strong>Erro Crítico:</strong> ${error.message}`;
        output.classList.add('text-danger');
        console.error("Erro ao inicializar:", error);
    }
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

    // Preencher filtro de comissionado
    if (filterComissionado) {
        state.equipe.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.nome;
            filterComissionado.appendChild(opt);
        });
    }
}

function renderDivisoesSugeridas() {
    const container = document.getElementById('divisoesContainer');
    if (!container) return;
    container.innerHTML = '';

    state.equipe.forEach(membro => {
        const pctPadrao = state.padroes[membro.nome] || 0;

        const div = document.createElement('div');
        div.className = 'col-md-3';
        div.innerHTML = `
            <div class="p-2 border border-secondary rounded-3">
                <small class="d-block text-white-50 border-bottom border-secondary mb-2 pb-1">${membro.nome}</small>
                <div class="input-group input-group-sm mb-2">
                    <input type="number" step="0.01" class="form-control bg-transparent text-white border-0 input-pct" 
                        data-membro-id="${membro.id}" data-membro-nome="${membro.nome}" value="${(pctPadrao * 100).toFixed(2)}">
                    <span class="input-group-text bg-transparent text-white-50 border-0">%</span>
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
}

function recalculateSuggested() {
    const liquido = parseFloat(document.getElementById('inputLiquido').value) || 0;

    document.querySelectorAll('.input-pct').forEach(input => {
        const pct = parseFloat(input.value) / 100 || 0;
        const valor = liquido * pct;
        const membroId = input.dataset.membroId;
        document.getElementById(`calc-${membroId}`).textContent = formatCurrency(valor);
    });
}

function renderHistory(dados = null) {
    const tbody = document.getElementById('comissoesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const historico = dados || state.historico;

    if (historico.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 opacity-50">Nenhum recebimento encontrado.<br><small>Ajuste os filtros ou cadastre um novo recebimento.</small></td></tr>';
        return;
    }

    historico.forEach(rec => {
        const contratoNome = rec.contratos_base?.nome_contrato || 'N/A';
        const totalUmPorCento = rec.valor_liquido * 0.01;

        const row = document.createElement('tr');

        // Formatar ciclo de aaaa-mm para mm/aaaa
        let cicloFormatado = '-';
        if (rec.ciclo) {
            const [ano, mes] = rec.ciclo.split('-');
            cicloFormatado = `${mes}/${ano}`;
        }

        // Base Cells
        const [y, m, d] = rec.data_recebimento.split('-');
        const dataFormatada = `${d}/${m}/${y}`;

        row.innerHTML = `
            <td>
                <button class="btn btn-sm btn-outline-warning border-0" onclick="editRecebimento('${rec.id}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
            </td>
            <td>${contratoNome}</td>
            <td class="small">${dataFormatada}</td>
            <td>${rec.nota_fiscal || '-'}</td>
            <td class="small">${cicloFormatado}</td>
            <td>${formatCurrency(rec.valor_liquido)}</td>
            <td class="text-primary fw-bold">${formatCurrency(totalUmPorCento)}</td>
        `;

        // Member Cells (Adaptive to team)
        const nomesEquipe = ['Carlos', 'Abrantes', 'Geovanna', 'Prado'];
        nomesEquipe.forEach(nome => {
            const comissao = rec.comissoes.find(c => c.equipe?.nome === nome);
            const valor = comissao ? comissao.valor_calculado : 0;
            const td = document.createElement('td');
            td.className = valor > 0 ? 'text-white' : 'text-white-50';
            td.textContent = formatCurrency(valor);
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
}

function updateKPIs(dados = null) {
    let totais = { Carlos: 0, Abrantes: 0, Geovanna: 0, Prado: 0, Geral: 0 };

    const historico = dados || state.historico;

    historico.forEach(rec => {
        rec.comissoes.forEach(com => {
            const nome = com.equipe?.nome;
            if (totais[nome] !== undefined) {
                totais[nome] += com.valor_calculado;
                totais.Geral += com.valor_calculado;
            }
        });
    });

    document.getElementById('kpiCarlos').textContent = formatCurrency(totais.Carlos);
    document.getElementById('kpiAbrantes').textContent = formatCurrency(totais.Abrantes);
    document.getElementById('kpiGeovanna').textContent = formatCurrency(totais.Geovanna);
    document.getElementById('kpiPrado').textContent = formatCurrency(totais.Prado);
    document.getElementById('totalGeralComissoes').textContent = formatCurrency(totais.Geral);
    if (document.getElementById('kpiTotalPago')) {
        document.getElementById('kpiTotalPago').textContent = formatCurrency(totais.Geral);
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
    if (modalLancamento) {
        modalLancamento.addEventListener('hidden.bs.modal', () => {
            const form = document.getElementById('formRecebimento');
            form.reset();
            delete form.dataset.editId;
            form.querySelector('button[type="submit"]').textContent = 'Salvar Recebimento';
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

        // Re-renderizar a seção de distribuição
        renderDivisoesSugeridas();

        // Fechar modal e limpar form
        bootstrap.Modal.getInstance(document.getElementById('modalNovoComissionado')).hide();
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
    document.querySelectorAll('.input-pct').forEach(input => {
        const liquido = parseFloat(document.getElementById('inputLiquido').value) || 0;
        const pct = parseFloat(input.value) / 100 || 0;

        divisoes.push({
            membro_id: input.dataset.membroId,
            porcentagem: pct,
            valor_comissao: liquido * pct
        });
    });

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
