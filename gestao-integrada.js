/**
 * Gestão Integrada - v24.8.0
 * 
 * Gerencia toda a interface e interações do usuário
 */

// ========== Estado Global ==========
let currentFilters = {};
let currentEditingNF = null;
let currentPayingNF = null;
let selectedYear = new Date().getFullYear();
let allEmployees = []; // Armazenar colaboradores do PeopleBoard

// ========== Inicialização ==========
document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Mostrar loading
        showLoading(true);

        // Inicializar Supabase Storage
        await supabaseStorage.initialize();

        initializeUI();
        await loadContracts();
        await fetchEmployees(); // Buscar colaboradores
        await loadInvoices();
        setupEventListeners();
        updateKPIs();
        updateVersion();

        showLoading(false);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showAlert(`Erro ao carregar dados: ${error.message}`, 'danger');
        showLoading(false);
    }
});

function initializeUI() {
    // Configurar data padrão
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('inputDataEmissao').value = hoje;
    document.getElementById('inputDataRecebimento').value = hoje;

    // Configurar competência padrão no modal de nova NF
    const mesAtual = new Date().toISOString().slice(0, 7);
    document.getElementById('inputCompetencia').value = mesAtual;

    // Preencher trimestres e competências
    populateQuarterFilter();
    populateCompetenciaFilter();
}

function populateCompetenciaFilter() {
    const select = document.getElementById('filterCompetencia');
    const invoices = storageManager.getAllInvoices();

    // Extrair competências únicas ordenadas
    const competencias = [...new Set(invoices.map(inv => inv.competencia))]
        .filter(comp => comp)
        .sort((a, b) => b.localeCompare(a)); // Ordem decrescente (mais recente primeiro)

    select.innerHTML = '';

    competencias.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp;
        option.textContent = formatCompetenciaDisplay(comp);
        select.appendChild(option);
    });
}

function formatCompetenciaDisplay(comp) {
    // Converte "2025-11" para "Nov/2025"
    if (!comp) return '';
    const [ano, mes] = comp.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function populateQuarterFilter() {
    const select = document.getElementById('filterTrimestre');
    const year = new Date().getFullYear();

    for (let y = year - 2; y <= year + 1; y++) {
        for (let t = 1; t <= 4; t++) {
            const option = document.createElement('option');
            option.value = `T${t}/${y}`;
            option.textContent = `T${t}/${y}`;
            select.appendChild(option);
        }
    }
}

function loadContracts() {
    const contracts = storageManager.getAllContracts();
    const selectContrato = document.getElementById('inputContrato');
    const selectFilterContrato = document.getElementById('filterContrato');

    // Limpar
    selectContrato.innerHTML = '<option value="">Selecione...</option>';
    selectFilterContrato.innerHTML = '<option value="">Todos</option>';

    contracts.forEach(contract => {
        const option1 = document.createElement('option');
        option1.value = contract.id;
        option1.textContent = contract.nome;
        option1.setAttribute('data-empresa', contract.empresa);
        option1.setAttribute('data-equipamentos', contract.contrato_por_equipamentos);
        selectContrato.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = contract.id;
        option2.textContent = contract.nome;
        selectFilterContrato.appendChild(option2);
    });
}

function loadInvoices() {
    const invoices = storageManager.filterInvoices(currentFilters);
    const tbody = document.querySelector('#tabelaNFs tbody');

    tbody.innerHTML = '';

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4">Nenhuma nota fiscal encontrada</td></tr>';
        return;
    }

    invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    invoices.forEach(invoice => {
        const contract = storageManager.getContract(invoice.contract_id);
        const row = createInvoiceRow(invoice, contract);
        tbody.appendChild(row);
    });
}

function createInvoiceRow(invoice, contract) {
    const tr = document.createElement('tr');

    const statusBadge = invoice.status === 'Pago'
        ? '<span class="badge-status badge-pago">Pago</span>'
        : '<span class="badge-status badge-pendente">Pendente</span>';

    const equipamentos = invoice.numero_equipamentos || '-';

    tr.innerHTML = `
        <td class="text-center">
            <button class="btn btn-sm btn-link text-muted p-0" onclick="toggleInvoiceExpansion('${invoice.nf_id}', this)" title="Ver detalhes">
                <i class="bi bi-plus-circle"></i>
            </button>
        </td>
        <td><strong>${invoice.numero_nf}</strong></td>
        <td>${contract ? contract.nome : invoice.contract_id}</td>
        <td>${contract ? contract.empresa : '-'}</td>
        <td>${invoice.competencia}</td>
        <td>${invoice.data_emissao}</td>
        <td class="text-end">${formatCurrency(invoice.valor_receita_bruta)}</td>
        <td class="text-end text-danger" title="${getTaxBreakdown(invoice)}">${formatCurrency(invoice.impostos.total)}</td>
        <td class="text-end text-success"><strong>${formatCurrency(invoice.valor_liquido)}</strong></td>
        <td class="text-center">${equipamentos}</td>
        <td>${statusBadge}</td>
        <td class="action-btn-group">
            <button class="btn btn-sm btn-outline-primary" onclick="editarNF('${invoice.nf_id}')" title="Editar">
                <i class="bi bi-pencil"></i>
            </button>
            ${invoice.status === 'Pendente' ? `
            <button class="btn btn-sm btn-outline-success" onclick="marcarComoPago('${invoice.nf_id}')" title="Marcar como Pago">
                <i class="bi bi-check-circle"></i>
            </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-danger" onclick="excluirNF('${invoice.nf_id}')" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    `;

    return tr;
}

function getTaxBreakdown(invoice) {
    let breakdown = 'Breakdown:\n';
    if (invoice.impostos.pis > 0) breakdown += `PIS: ${formatCurrency(invoice.impostos.pis)}\n`;
    if (invoice.impostos.cofins > 0) breakdown += `COFINS: ${formatCurrency(invoice.impostos.cofins)}\n`;
    if (invoice.impostos.iss > 0) breakdown += `ISS: ${formatCurrency(invoice.impostos.iss)}\n`;
    if (invoice.impostos.icms > 0) breakdown += `ICMS: ${formatCurrency(invoice.impostos.icms)}\n`;
    if (invoice.impostos.trimestral_provisao > 0) breakdown += `Trimestral: ${formatCurrency(invoice.impostos.trimestral_provisao)}\n`;
    return breakdown;
}

function updateKPIs() {
    const stats = storageManager.getStats(currentFilters);

    document.getElementById('kpiTotalFaturado').textContent = formatCurrency(stats.total_faturado);
    document.getElementById('kpiTotalImpostos').textContent = formatCurrency(stats.total_impostos);
    document.getElementById('kpiTotalLiquido').textContent = formatCurrency(stats.total_liquido);
    document.getElementById('kpiTotalComissoes').textContent = formatCurrency(stats.total_comissoes);

    document.getElementById('kpiNumNFs').textContent = `${stats.num_total} NFs`;
    document.getElementById('kpiNumComissoes').textContent = `${stats.num_total} NFs`;

    const percImpostos = stats.total_faturado > 0
        ? ((stats.total_impostos / stats.total_faturado) * 100).toFixed(1)
        : 0;
    document.getElementById('kpiPercImpostos').textContent = `${percImpostos}%`;

    // Atualizar número de NFs com comissão
    const nfsComComissao = storageManager.filterInvoices(currentFilters).filter(nf => nf.comissoes && nf.comissoes.length > 0).length;
    document.getElementById('kpiNumComissoes').textContent = `${nfsComComissao} NFs`;
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // Sidebar
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('mobileSidebarToggle')?.addEventListener('click', toggleSidebar);

    // Filtros - aplicar manualmente via botão
    document.getElementById('btnAplicarFiltros').addEventListener('click', applyFilters);
    document.getElementById('btnLimparFiltros').addEventListener('click', clearFilters);

    // Modal NF
    document.getElementById('inputContrato').addEventListener('change', onContratoSelected);
    document.getElementById('inputValorFaturado').addEventListener('input', updateTaxPreview);
    document.getElementById('inputHouveRetencao').addEventListener('change', toggleRetencao);
    document.getElementById('btnSalvarNF').addEventListener('click', salvarNF);

    // Comissões
    document.getElementById('btnAddComissao').addEventListener('click', () => {
        addCommissionRow();
    });

    // Modal Config Impostos
    document.getElementById('btnSalvarConfigImpostos').addEventListener('click', salvarConfigImpostos);
    document.querySelector('#modalConfigImpostos').addEventListener('show.bs.modal', loadQuarterlyConfig);

    // Modal Marcar Pago
    document.getElementById('inputTemComissao').addEventListener('change', toggleComissoes);
    document.getElementById('btnAdicionarFavorecido').addEventListener('click', adicionarFavorecido);
    document.getElementById('btnConfirmarPagamento').addEventListener('click', confirmarPagamento);

    // Exportar
    document.getElementById('btnExportarCSV').addEventListener('click', exportarCSV);

    // Detalhes de Comissões ao clicar no card
    document.getElementById('cardComissoes').addEventListener('click', showComissoesDetail);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

function applyFilters() {
    currentFilters = {};

    const competenciaSelect = document.getElementById('filterCompetencia');
    const selectedCompetencias = Array.from(competenciaSelect.selectedOptions).map(opt => opt.value);
    const trimestre = document.getElementById('filterTrimestre').value;
    const contrato = document.getElementById('filterContrato').value;
    const empresa = document.getElementById('filterEmpresa').value;
    const status = document.getElementById('filterStatus').value;

    // Múltiplas competências
    if (selectedCompetencias.length > 0) {
        currentFilters.competencias = selectedCompetencias;
    }
    if (trimestre) currentFilters.trimestre = trimestre;
    if (contrato) currentFilters.contractId = contrato;  // Corrigido para contractId
    if (empresa) currentFilters.empresa = empresa;
    if (status) currentFilters.status = status;

    loadInvoices();
    updateKPIs();
}

function clearFilters() {
    const competenciaSelect = document.getElementById('filterCompetencia');
    competenciaSelect.selectedIndex = -1; // Deselect all
    document.getElementById('filterTrimestre').value = '';
    document.getElementById('filterContrato').value = '';
    document.getElementById('filterEmpresa').value = '';
    document.getElementById('filterStatus').value = '';

    currentFilters = {};
    loadInvoices();
    updateKPIs();
}

// ========== Modal NF ==========
function onContratoSelected() {
    const select = document.getElementById('inputContrato');
    const selectedOption = select.options[select.selectedIndex];

    if (!selectedOption.value) return;

    const empresa = selectedOption.getAttribute('data-empresa');
    const precisaEquipamentos = selectedOption.getAttribute('data-equipamentos') === 'true';

    document.getElementById('inputEmpresa').value = empresa;

    const grupoEquip = document.getElementById('grupoEquipamentos');
    const inputEquip = document.getElementById('inputNumeroEquipamentos');

    if (precisaEquipamentos) {
        grupoEquip.style.display = 'block';
        inputEquip.required = true;
    } else {
        grupoEquip.style.display = 'none';
        inputEquip.required = false;
        inputEquip.value = '';
    }

    updateTaxPreview();
    updateCommissionsCalculations();
}

/**
 * Busca colaboradores do Supabase (PeopleBoard)
 */
async function fetchEmployees() {
    try {
        const { data, error } = await supabaseStorage.client
            .from('employees')
            .select('id, full_name')
            .eq('status', 'Ativo')
            .order('full_name');

        if (error) throw error;
        allEmployees = data || [];
        console.log(`[DEBUG] ${allEmployees.length} colaboradores carregados para comissões`);
    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
    }
}

/**
 * Adiciona uma linha de comissão no modal
 */
function addCommissionRow(data = null) {
    const container = document.getElementById('containerComissoes');
    const row = document.createElement('div');
    row.className = 'commission-row mb-2 d-flex gap-2 align-items-end';

    const employeeOptions = allEmployees.map(emp =>
        `<option value="${emp.id}" ${data && data.colaborador_id === emp.id ? 'selected' : ''}>${emp.full_name}</option>`
    ).join('');

    row.innerHTML = `
        <div style="flex: 2;">
            <label class="small text-muted mb-1">Colaborador</label>
            <select class="form-select form-select-sm combo-colaborador" required>
                <option value="">Selecione...</option>
                ${employeeOptions}
            </select>
        </div>
        <div style="flex: 1;">
            <label class="small text-muted mb-1">Alíquota (%)</label>
            <input type="number" step="0.01" class="form-control form-control-sm input-aliquota" 
                   value="${data ? data.aliquota : '1.00'}" required oninput="updateCommissionsCalculations()">
        </div>
        <div style="flex: 1;">
            <label class="small text-muted mb-1">Valor (R$)</label>
            <input type="text" class="form-control form-control-sm input-valor-calc" readonly>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove(); updateCommissionsCalculations();">
            <i class="bi bi-trash"></i>
        </button>
    `;

    container.appendChild(row);
    updateCommissionsCalculations();
}

/**
 * Atualiza cálculos de comissão e validação de 1%
 */
function updateCommissionsCalculations() {
    const valorFaturado = parseFloat(document.getElementById('inputValorFaturado').value) || 0;
    const rows = document.querySelectorAll('.commission-row');
    const sumContainer = document.getElementById('sumComissoes');
    const totalLabel = document.getElementById('totalComissoesLabel');
    const alertBox = document.getElementById('comissaoAlert');

    let totalComissoes = 0;
    let totalAliquota = 0;

    rows.forEach(row => {
        const aliquota = parseFloat(row.querySelector('.input-aliquota').value) || 0;
        const valor = (valorFaturado * aliquota) / 100;
        row.querySelector('.input-valor-calc').value = formatCurrency(valor);

        totalComissoes += valor;
        totalAliquota += aliquota;
    });

    if (rows.length > 0) {
        sumContainer.style.setProperty('display', 'flex', 'important');
        totalLabel.textContent = formatCurrency(totalComissoes);

        // Validação de 1% (limite total)
        if (totalAliquota > 1.0001) { // Margem de erro float
            alertBox.style.display = 'block';
        } else {
            alertBox.style.display = 'none';
        }
    } else {
        sumContainer.style.setProperty('display', 'none', 'important');
        alertBox.style.display = 'none';
    }
}

function updateTaxPreview() {
    const contratoId = document.getElementById('inputContrato').value;
    const valorFaturado = parseFloat(document.getElementById('inputValorFaturado').value) || 0;
    const competencia = document.getElementById('inputCompetencia').value;

    if (!contratoId || valorFaturado === 0 || !competencia) {
        document.getElementById('taxPreview').style.display = 'none';
        return;
    }

    const contract = storageManager.getContract(contratoId);
    if (!contract) return;

    // Calcular impostos mensais
    const monthly = taxEngine.calculateMonthlyTaxes(contract, valorFaturado);

    // Converter competência para MM/YYYY
    const [ano, mes] = competencia.split('-');
    const competenciaFormatada = `${mes}/${ano}`;

    // Calcular provisão trimestral (simplificado - sem todas as NFs)
    const year = parseInt(ano);
    let trimestralProvisao = 0;

    if (year >= 2026) {
        const allInvoices = storageManager.getAllInvoices();
        trimestralProvisao = taxEngine.calculateMonthlyQuarterlyProvision(
            competenciaFormatada,
            contratoId,
            valorFaturado,
            allInvoices
        );
    }

    const total = monthly.total_mensal + trimestralProvisao;
    const liquido = valorFaturado - total;

    document.getElementById('previewPIS').textContent = formatCurrency(monthly.pis);
    document.getElementById('previewCOFINS').textContent = formatCurrency(monthly.cofins);
    document.getElementById('previewISS').textContent = formatCurrency(monthly.iss);
    document.getElementById('previewICMS').textContent = formatCurrency(monthly.icms);
    document.getElementById('previewTrimestral').textContent = formatCurrency(trimestralProvisao);
    document.getElementById('previewTotalImpostos').textContent = formatCurrency(total);
    document.getElementById('previewValorLiquido').textContent = formatCurrency(liquido);

    document.getElementById('taxPreview').style.display = 'block';
}

function toggleRetencao() {
    const checkbox = document.getElementById('inputHouveRetencao');
    const grupo = document.getElementById('grupoRetencao');

    grupo.style.display = checkbox.checked ? 'block' : 'none';

    if (!checkbox.checked) {
        document.getElementById('inputValorRetido').value = '';
    }
}

function salvarNF() {
    const form = document.getElementById('formNF');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const competencia = document.getElementById('inputCompetencia').value;
    const [ano, mes] = competencia.split('-');

    const dataEmissao = document.getElementById('inputDataEmissao').value;
    const [anoEm, mesEm, diaEm] = dataEmissao.split('-');

    const data = {
        contrato_id: document.getElementById('inputContrato').value,
        empresa: document.getElementById('inputEmpresa').value,
        numero_nf: document.getElementById('inputNumeroNF').value,
        competencia: `${mes}/${ano}`,
        data_emissao: `${diaEm}/${mesEm}/${anoEm}`,
        valor_receita_bruta: parseFloat(document.getElementById('inputValorFaturado').value),
        numero_equipamentos: parseInt(document.getElementById('inputNumeroEquipamentos').value) || null,
        houve_imposto_retido: document.getElementById('inputHouveRetencao').checked,
        valor_imposto_retido: document.getElementById('inputHouveRetencao').checked
            ? parseFloat(document.getElementById('inputValorRetido').value)
            : null,
        comissoes: Array.from(document.querySelectorAll('.commission-row')).map(row => ({
            colaborador_id: row.querySelector('.combo-colaborador').value,
            aliquota: parseFloat(row.querySelector('.input-aliquota').value) || 0,
            valor: parseFloat(row.querySelector('.input-valor-calc').value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0,
            nome_colaborador: row.querySelector('.combo-colaborador').options[row.querySelector('.combo-colaborador').selectedIndex].text
        })).filter(c => c.colaborador_id)
    };

    try {
        const editId = document.getElementById('editNFId').value;

        if (editId) {
            storageManager.updateInvoice(editId, data);
            showAlert('Nota fiscal atualizada com sucesso!', 'success');
        } else {
            storageManager.addInvoice(data);
            showAlert('Nota fiscal cadastrada com sucesso!', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalNovaНF')).hide();
        loadInvoices();
        updateKPIs();
        clearNFForm();
    } catch (error) {
        showAlert(`Erro: ${error.message}`, 'danger');
    }
}

function editarNF(nfId) {
    const invoice = storageManager.getInvoice(nfId);
    if (!invoice) return;

    currentEditingNF = nfId;
    document.getElementById('editNFId').value = nfId;
    document.getElementById('modalNFTitle').textContent = 'Editar Nota Fiscal';

    document.getElementById('inputContrato').value = invoice.contract_id;
    onContratoSelected();

    document.getElementById('inputNumeroNF').value = invoice.numero_nf;

    const [ano, mes] = invoice.competencia.split('/');
    document.getElementById('inputCompetencia').value = `${ano}-${mes}`;

    const [dia, mesEm, anoEm] = invoice.data_emissao.split('/');
    document.getElementById('inputDataEmissao').value = `${anoEm}-${mesEm}-${dia}`;

    document.getElementById('inputValorFaturado').value = invoice.valor_receita_bruta;
    document.getElementById('inputNumeroEquipamentos').value = invoice.numero_equipamentos || '';

    document.getElementById('inputHouveRetencao').checked = invoice.houve_imposto_retido;
    document.getElementById('inputValorRetido').value = invoice.valor_imposto_retido || '';
    toggleRetencao();

    // Carregar comissões
    document.getElementById('containerComissoes').innerHTML = '';
    if (invoice.comissoes && Array.isArray(invoice.comissoes)) {
        invoice.comissoes.forEach(c => addCommissionRow(c));
    }

    updateTaxPreview();
    updateCommissionsCalculations();

    new bootstrap.Modal(document.getElementById('modalNovaНF')).show();
}

function excluirNF(nfId) {
    if (!confirm('Tem certeza que deseja excluir esta nota fiscal?')) return;

    try {
        storageManager.deleteInvoice(nfId);
        showAlert('Nota fiscal excluída com sucesso!', 'success');
        loadInvoices();
        updateKPIs();
    } catch (error) {
        showAlert(`Erro: ${error.message}`, 'danger');
    }
}

function clearNFForm() {
    document.getElementById('formNF').reset();
    document.getElementById('editNFId').value = '';
    document.getElementById('modalNFTitle').textContent = 'Nova Nota Fiscal';
    document.getElementById('taxPreview').style.display = 'none';
    document.getElementById('grupoEquipamentos').style.display = 'none';
    document.getElementById('grupoRetencao').style.display = 'none';
    document.getElementById('containerComissoes').innerHTML = '';
    document.getElementById('sumComissoes').style.setProperty('display', 'none', 'important');
    document.getElementById('comissaoAlert').style.display = 'none';
    currentEditingNF = null;

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('inputDataEmissao').value = hoje;
}

// Reset form quando modal fecha
document.getElementById('modalNovaНF').addEventListener('hidden.bs.modal', clearNFForm);

// ========== Modal Config Impostos ==========
function loadQuarterlyConfig() {
    renderYearTabs();
    renderQuarterlyForm(selectedYear);
}

function renderYearTabs() {
    const container = document.getElementById('yearTabs');
    container.innerHTML = '';

    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear + 2; year++) {
        const tab = document.createElement('div');
        tab.className = `year-tab${year === selectedYear ? ' active' : ''}`;
        tab.textContent = year;
        tab.onclick = () => {
            selectedYear = year;
            renderYearTabs();
            renderQuarterlyForm(year);
        };
        container.appendChild(tab);
    }
}

function renderQuarterlyForm(year) {
    const container = document.getElementById('quarterlyConfigForm');
    container.innerHTML = '';

    if (year < 2026) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Atenção:</strong> O sistema de impostos trimestrais é válido apenas para 2026 em diante.
                Para anos anteriores, os impostos devem ser informados manualmente ao cadastrar a NF.
            </div>
        `;
        return;
    }

    for (let t = 1; t <= 4; t++) {
        const trimestre = `T${t}/${year}`;
        const config = taxEngine.getQuarterlyConfig(trimestre);
        const stats = taxEngine.getQuarterStats(trimestre, storageManager.getAllInvoices());

        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header">
                <h6 class="mb-0">Trimestre ${t} (${getTrimestreMonths(t)})</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Imposto Total Bruto (R$)</label>
                        <input type="number" step="0.01" class="form-control form-control-light" 
                               id="inputT${t}_${year}" value="${config?.imposto_total_bruto || ''}">
                    </div>
                    <div class="col-md-6">
                        <div class="border-start ps-3">
                            <small class="text-muted d-block">Receita do Trimestre:</small>
                            <strong>${formatCurrency(stats.receita_total)}</strong>
                            <small class="text-muted d-block mt-2">Retenções Informadas:</small>
                            <strong class="text-danger">${formatCurrency(stats.retencoes_total)}</strong>
                            <small class="text-muted d-block mt-2">Líquido a Recolher:</small>
                            <strong class="text-success">${formatCurrency(stats.imposto_liquido)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

function getTrimestreMonths(t) {
    const months = {
        1: 'Jan-Mar',
        2: 'Abr-Jun',
        3: 'Jul-Set',
        4: 'Out-Dez'
    };
    return months[t];
}

function salvarConfigImpostos() {
    if (selectedYear < 2026) {
        showAlert('Impostos trimestrais são válidos apenas para 2026+', 'warning');
        return;
    }

    try {
        for (let t = 1; t <= 4; t++) {
            const trimestre = `T${t}/${selectedYear}`;
            const valor = parseFloat(document.getElementById(`inputT${t}_${selectedYear}`).value) || 0;

            if (valor > 0) {
                taxEngine.setQuarterlyConfig(trimestre, valor);
            }
        }

        // Recalcular todos os trimestres do ano
        for (let t = 1; t <= 4; t++) {
            storageManager.recalculateQuarter(`T${t}/${selectedYear}`);
        }

        showAlert('Configurações salvas! Impostos recalculados.', 'success');
        loadInvoices();
        updateKPIs();

    } catch (error) {
        showAlert(`Erro: ${error.message}`, 'danger');
    }
}

// ========== Modal Marcar Pago ==========
function marcarComoPago(nfId) {
    const invoice = storageManager.getInvoice(nfId);
    if (!invoice) return;

    const contract = storageManager.getContract(invoice.contract_id);

    currentPayingNF = nfId;
    document.getElementById('pagarNFId').value = nfId;

    // Se a NF já tem comissões configuradas, avisar ou carregar
    const comissoesText = invoice.comissoes && invoice.comissoes.length > 0
        ? `<div class="alert alert-info small py-1 mb-2"><i class="bi bi-info-circle me-1"></i> Esta NF possui ${invoice.comissoes.length} comissões configuradas.</div>`
        : '';

    document.getElementById('infoNFPagar').innerHTML = `
        ${comissoesText}
        <strong>NF ${invoice.numero_nf}</strong> - ${contract?.nome || ''}<br>
        Valor Líquido: <strong class="text-success">${formatCurrency(invoice.valor_liquido)}</strong>
    `;

    document.getElementById('totalDistribuir').textContent = formatCurrency(invoice.valor_liquido);

    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('inputDataRecebimento').value = hoje;

    document.getElementById('inputTemComissao').checked = false;
    document.getElementById('grupoComissoes').style.display = 'none';
    document.getElementById('comissoesContainer').innerHTML = '';

    new bootstrap.Modal(document.getElementById('modalMarcarPago')).show();
}

function toggleComissoes() {
    const checkbox = document.getElementById('inputTemComissao');
    const grupo = document.getElementById('grupoComissoes');

    if (checkbox.checked) {
        grupo.style.display = 'block';
        // Se já existem comissões na NF, carregar elas
        const invoice = storageManager.getInvoice(currentPayingNF);
        document.getElementById('comissoesContainer').innerHTML = '';
        if (invoice && invoice.comissoes && invoice.comissoes.length > 0) {
            invoice.comissoes.forEach((c, idx) => {
                adicionarFavorecido(c, idx);
            });
        } else {
            adicionarFavorecido(); // Adicionar primeiro favorecido vazio
        }
    } else {
        grupo.style.display = 'none';
        document.getElementById('comissoesContainer').innerHTML = '';
    }
}

function adicionarFavorecido(data = null, forceIndex = null) {
    const container = document.getElementById('comissoesContainer');
    const index = forceIndex !== null ? forceIndex : container.children.length;

    const row = document.createElement('div');
    row.className = 'commission-row';
    row.innerHTML = `
        <div class="form-group" style="flex: 2;">
            <label class="form-label small">Favorecido (Colaborador)</label>
            <select class="form-select form-select-sm form-control-light combo-favorecido" 
                   id="favorecido_id_${index}" onchange="updateFavorecidoNome(${index})" required>
                <option value="">Selecione...</option>
                ${allEmployees.map(e => `<option value="${e.id}" ${data && (data.colaborador_id === e.id || data.nome === e.full_name) ? 'selected' : ''}>${e.full_name}</option>`).join('')}
            </select>
            <input type="hidden" id="favorecido_nome_${index}" value="${data ? (data.nome_colaborador || data.nome || '') : ''}">
        </div>
        <div class="form-group" style="flex: 1;">
            <label class="form-label small">Alíquota (%)</label>
            <input type="number" step="0.01" class="form-control form-control-sm form-control-light input-aliq-pago" 
                   id="favorecido_aliquota_${index}" value="${data ? data.aliquota : ''}" oninput="calcularComissoes()" required>
        </div>
        <div class="form-group">
            <label class="form-label small">Valor</label>
            <input type="text" class="form-control form-control-sm form-control-light" 
                   id="favorecido_valor_${index}" readonly>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" 
                onclick="removerFavorecido(this)" style="margin-bottom: 0;">
            <i class="bi bi-trash"></i>
        </button>
    `;

    container.appendChild(row);
    if (data) calcularComissoes();
}

/**
 * Helper para atualizar nome oculto quando seleciona colaborador
 */
function updateFavorecidoNome(index) {
    const select = document.getElementById(`favorecido_id_${index}`);
    const nomeInput = document.getElementById(`favorecido_nome_${index}`);
    if (select && nomeInput) {
        nomeInput.value = select.options[select.selectedIndex].text;
    }
}

function removerFavorecido(btn) {
    btn.closest('.commission-row').remove();
    calcularComissoes();
}

function calcularComissoes() {
    const nfId = document.getElementById('pagarNFId').value;
    const invoice = storageManager.getInvoice(nfId);
    if (!invoice) return;

    const container = document.getElementById('comissoesContainer');
    const rows = container.querySelectorAll('.commission-row');

    let totalAliquota = 0;

    rows.forEach((row, index) => {
        const aliquota = parseFloat(document.getElementById(`favorecido_aliquota_${index}`)?.value) || 0;
        totalAliquota += aliquota;

        // IMPORTANTE: Aqui a comissão no pagamento pode ser diferente da comissão na NF
        // Mas o usuário pediu validação de 1% do BRUTO na NF.
        // Vou manter o cálculo baseado no VALOR LÍQUIDO pra distribuição se o usuário preencher no pagamento,
        // mas carregar o valor calculado da NF se ele vier de lá.

        const valor = (invoice.valor_receita_bruta * aliquota) / 100;
        const inputValor = document.getElementById(`favorecido_valor_${index}`);
        if (inputValor) {
            inputValor.value = formatCurrency(valor);
        }
    });

    const alertTotal = document.getElementById('alertComissaoTotal');
    document.getElementById('totalAliquotas').textContent = `${totalAliquota.toFixed(2)}%`;

    if (totalAliquota > 0) {
        alertTotal.style.display = 'block';

        if (Math.abs(totalAliquota - 100) > 0.01) {
            alertTotal.className = 'alert alert-warning mt-3';
        } else {
            alertTotal.className = 'alert alert-success mt-3';
        }
    } else {
        alertTotal.style.display = 'none';
    }
}

function confirmarPagamento() {
    const nfId = document.getElementById('pagarNFId').value;
    const dataRecebimento = document.getElementById('inputDataRecebimento').value;
    const temComissao = document.getElementById('inputTemComissao').checked;

    if (!dataRecebimento) {
        showAlert('Data de recebimento é obrigatória', 'warning');
        return;
    }

    const [ano, mes, dia] = dataRecebimento.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    let comissoes = [];

    if (temComissao) {
        const container = document.getElementById('comissoesContainer');
        const rows = container.querySelectorAll('.commission-row');

        let totalAliquota = 0;

        rows.forEach((row, index) => {
            const idColab = document.getElementById(`favorecido_id_${index}`)?.value;
            const nome = document.getElementById(`favorecido_nome_${index}`)?.value;
            const aliquota = parseFloat(document.getElementById(`favorecido_aliquota_${index}`)?.value) || 0;

            if (nome && aliquota > 0) {
                comissoes.push({
                    colaborador_id: idColab,
                    nome_colaborador: nome,
                    aliquota: aliquota,
                    valor: (invoice.valor_receita_bruta * aliquota) / 100
                });
                totalAliquota += aliquota;
            }
        });

        if (totalAliquota > 1.0001) {
            showAlert('O total das alíquotas de comissão não pode exceder 1%', 'danger');
            return;
        }

        if (comissoes.length === 0) {
            showAlert('Adicione pelo menos um favorecido', 'warning');
            return;
        }
    }

    try {
        const invoice = storageManager.getInvoice(nfId);
        invoice.markAsPaid(dataFormatada, comissoes);
        storageManager.updateInvoice(nfId, invoice);

        showAlert('Pagamento confirmado com sucesso!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalMarcarPago')).hide();
        loadInvoices();
        updateKPIs();
    } catch (error) {
        showAlert(`Erro: ${error.message}`, 'danger');
    }
}

// ========== Utilidades ==========
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function showAlert(message, type = 'info') {
    // Criar alert Bootstrap
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function exportarCSV() {
    const csv = storageManager.exportToCSV();

    if (!csv) {
        showAlert('Nenhum dado para exportar', 'warning');
        return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `faturamento_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('CSV exportado com sucesso!', 'success');
}

function updateVersion() {
    const versionEl = document.getElementById('appVersionDisplay');
    if (versionEl && typeof APP_VERSION !== 'undefined') {
        versionEl.textContent = `${APP_VERSION} Gestão Integrada`;
    }
}
