const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allLancamentos = [];
let allAllocations = [];
let dimCategorias = new Map();
let dimProjetos = new Map();
let dimFornecedores = new Map();
let dimDRE = new Map();

document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Listener para o Gerador de Comando de Sincronização
    const syncInput = document.getElementById('syncDateInput');
    if (syncInput) {
        syncInput.addEventListener('input', updateSyncCommand);
    }
    
    setupLayout();
});

function updateSyncCommand() {
    const date = document.getElementById('syncDateInput').value || '01/06/2025';
    const command = `python omie_supabase_ingest.py --modo registro --de ${date} --empresa all --verbose --persist-supabase --include-movimentos-saida`;
    document.getElementById('syncCommandCode').textContent = command;
}

function copySyncCommand() {
    const command = document.getElementById('syncCommandCode').textContent;
    navigator.clipboard.writeText(command.trim()).then(() => {
        const btn = document.querySelector('[onclick="copySyncCommand()"]');
        const icon = btn.querySelector('i');
        icon.className = 'bi bi-check-lg';
        btn.classList.replace('btn-outline-info', 'btn-success');
        setTimeout(() => {
            icon.className = 'bi bi-clipboard';
            btn.classList.replace('btn-success', 'btn-outline-info');
        }, 2000);
    });
}

async function init() {
    try {
        setLoading(true);
        await Promise.all([
            fetchData(),
            fetchLastSync()
        ]);
        renderDashboard();
        updateSyncUI();
    } catch (err) {
        console.error('Erro na inicialização:', err);
        alert('Erro ao carregar dados do Supabase.');
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    const btn = document.getElementById('btnUpdate');
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Carregando...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Atualizar Dashboard';
    }
}

// Função para buscar TODOS os registros (contornando o limite de 1000 do Supabase)
async function fetchAll(tableName, filterColumn = 'data_referencia', minDate = '2025-06-01') {
    let results = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
        const query = supabaseClient
            .from(tableName)
            .select('*')
            .range(from, to);
        
        // Aplicar filtro de data se a coluna existir
        if (filterColumn && filterColumn !== 'null' && minDate) {
            // Em algumas tabelas o nome pode variar
            const col = (tableName === 'omie_cp_titulos') ? 'data_entrada' : 
                        (tableName === 'omie_mov_saidas' ? 'data_pagamento' : filterColumn);
            
            if (col) query.gte(col, minDate);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error(`Erro ao buscar ${tableName}:`, error);
            hasMore = false;
            break;
        }

        if (data && data.length > 0) {
            results = results.concat(data);
            from += 1000;
            to += 1000;
            if (data.length < 1000) hasMore = false;
        } else {
            hasMore = false;
        }
    }
    return results;
}

async function fetchLastSync() {
    try {
        const { data, error } = await supabaseClient
            .from('omie_sync_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1);
        
        if (data && data.length > 0) {
            lastSyncInfo = data[0];
        }
    } catch (err) {
        console.warn('Erro ao buscar logs de sincronização:', err);
    }
}

function updateSyncUI() {
    const container = document.getElementById('lastSyncContainer');
    if (!container || !lastSyncInfo) return;

    const date = new Date(lastSyncInfo.timestamp);
    const dateStr = date.toLocaleString('pt-BR');
    const statusClass = lastSyncInfo.status === 'SUCESSO' ? 'text-success' : 'text-danger';
    
    container.innerHTML = `
        <span class="me-2">Última Atualização:</span>
        <span class="fw-bold ${statusClass}">${dateStr}</span>
        <i class="bi bi-info-circle ms-1" title="${lastSyncInfo.detalhes || ''}"></i>
    `;
}

async function fetchData() {
    const START_DATE = '2025-06-01';

    // 1. Fetch Contas a Pagar (Paginação)
    const cpData = await fetchAll('omie_cp_titulos', 'data_entrada', START_DATE);
    
    // 2. Fetch Movimentos de Saída (Paginação)
    const movData = await fetchAll('omie_mov_saidas', 'data_pagamento', START_DATE);

    // 3. Fetch Rateios (Tabela oficial do Supabase para alocação Categoria/Departamento)
    const allocData = await fetchAll('omie_cp_allocations', 'null', null);

    // 5. Fetch Dimensões (Toda a lista contornando o limite de 1000)
    const fornData = await fetchAll('omie_dim_fornecedores', 'null', null);
    const catData = await fetchAll('omie_dim_categorias', 'null', null);
    const projData = await fetchAll('omie_dim_projetos', 'null', null);
    const dreData = await fetchAll('omie_dim_dre', 'null', null);

    allAllocations = allocData || [];
    
    // Mapear Dimensões para busca rápida
    // Categorias: Guardamos objeto com descrição e vínculo DRE
    dimCategorias = new Map();
    (catData || []).forEach(c => {
        dimCategorias.set(String(c.codigo_categoria), {
            descricao: c.descricao_categoria,
            codigo_dre: String(c.codigo_conta_dre || '')
        });
    });

    dimProjetos = new Map((projData || []).map(p => [String(p.codigo_projeto), p.descricao_projeto]));

    // Dimensão DRE: Mapa de Código -> Descrição
    dimDRE = new Map();
    (dreData || []).forEach(d => {
        dimDRE.set(String(d.codigo_conta_dre), d.descricao_conta_dre);
    });
    
    // Mapear Fornecedores: Prioridade para Nome Fantasia, depois Razão Social, depois CNPJ
    dimFornecedores = new Map();
    (fornData || []).forEach(f => {
        const name = f.nome_fantasia || f.razao_social || f.cnpj_cpf || 'Sem Nome';
        dimFornecedores.set(String(f.codigo_cliente_omie), name);
    });

    // Consolidação
    const cpMapped = (cpData || []).map(item => {
        let payload = {};
        try { payload = typeof item.payload_json === 'string' ? JSON.parse(item.payload_json) : (item.payload_json || {}); } catch(e) {}
        
        // Tenta buscar no Lookup da Dimensão primeiro (forma mais precisa)
        let fornecedorNome = dimFornecedores.get(String(item.codigo_cliente_fornecedor)) || item.fornecedor_nome_transferencia;
        
        // Se não achou na dimensão nem na coluna, tenta fallbacks do payload
        if (!fornecedorNome || fornecedorNome === 'Desconhecido') {
            fornecedorNome = payload?.nm_cliente || 
                            payload?.nome_cliente || 
                            payload?.nome_fantasia || 
                            payload?.razao_social || 
                            payload?.contas_pagar_cadastro?.[0]?.nm_cliente || 
                            'Desconhecido';
        }
        
        return {
            ...item,
            id_global: `cp_${item.codigo_lancamento_omie}`,
            fonte: 'CP',
            fornecedor: fornecedorNome,
            empresa: item.empresa_nome || 'DZM',
            valor: parseFloat(item.valor_documento) || 0,
            categoria_id: String(item.codigo_categoria_padrao || 'S/ Cat')
        };
    });

    const movMapped = (movData || []).map(item => {
        let payload = {};
        try { payload = typeof item.payload_json === 'string' ? JSON.parse(item.payload_json) : (item.payload_json || {}); } catch(e) {}
        
        // Tenta buscar no Lookup da Dimensão (nCodCliente no movimento)
        let fornecedorNome = dimFornecedores.get(String(item.codigo_cliente_fornecedor)) || item.fornecedor_nome_transferencia;

        // Fallbacks para movimentos (podem ser lançamentos diretos sem código de cliente)
        if (!fornecedorNome || fornecedorNome === 'Desconhecido') {
            fornecedorNome = payload?.detalhes?.cNomeCliente || 
                             payload?.detalhes?.cNomeFantasia || 
                             payload?.detalhes?.cNumDocFiscal || 
                             payload?.resumo?.cNomeCliente ||
                             item.empresa_nome || 
                             'Lançamento Direto';
        }

        return {
            ...item,
            id_global: `mov_${item.dedupe_key}`,
            fonte: 'MOV',
            fornecedor: fornecedorNome,
            empresa: item.empresa_nome || 'Mar Brasil',
            valor: parseFloat(item.valor_pago) || 0,
            categoria_id: String(item.codigo_categoria || 'S/ Cat')
        };
    });

    allLancamentos = [...cpMapped, ...movMapped];
    console.log(`[DATA] ${allLancamentos.length} registros carregados desde ${START_DATE}`);
}

function renderDashboard() {
    const filterCompany = document.getElementById('filterCompany').value;
    const filterDateBase = document.getElementById('filterDateBase').value; // registro, vencimento, pagamento
    const filterMonth = document.getElementById('filterMonth').value;
    const filterStatus = document.getElementById('filterStatus').value;
    const filterSource = document.getElementById('filterSource').value;

    const today = new Date();
    today.setHours(0,0,0,0);

    const filtered = allLancamentos.filter(item => {
        // 1. Filtro Empresa (MarBR ou DZM)
        if (filterCompany) {
            const eName = (item.empresa_nome || '').toUpperCase();
            if (!eName.includes(filterCompany.toUpperCase())) return false;
        }

        // 2. Determinar Data Referência para Filtro de Mes e Ordenação
        let dataRefStr = '';
        if (filterDateBase === 'vencimento') dataRefStr = item.data_vencimento;
        else if (filterDateBase === 'pagamento') dataRefStr = item.data_pagamento;
        else dataRefStr = item.data_entrada || item.data_registro_nf || item.data_pagamento; // Registro

        if (!dataRefStr || dataRefStr === '---') {
            if (filterMonth) return false;
        } else {
            if (filterMonth) {
                const date = parseDate(dataRefStr);
                const itemMonth = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}`;
                if (itemMonth !== filterMonth) return false;
            }
        }
        
        // Injetar a data_referencia processada para renderização
        item._dataSort = parseDate(dataRefStr);
        item._dataLabel = dataRefStr;

        // 3. Status Inteligente (Atrasado vs A Vencer)
        const statusRaw = (item.status_titulo || '').toUpperCase();
        const isPaid = statusRaw.includes('PAGO');
        const dtVenc = parseDate(item.data_vencimento);
        const isOverdue = !isPaid && dtVenc < today && item.data_vencimento && item.data_vencimento !== '---';

        if (filterStatus) {
            if (filterStatus === 'PAGO' && !isPaid) return false;
            if (filterStatus === 'ABERTO' && (isPaid || isOverdue)) return false;
            if (filterStatus === 'ATRASADO' && !isOverdue) return false;
        }

        if (filterSource && item.fonte !== filterSource) return false;

        return true;
    });

    // Ordenação Final por Data Referência
    filtered.sort((a, b) => b._dataSort - a._dataSort);

    updateKPIs(filtered);
    renderTable(filtered);
}

function updateKPIs(data) {
    let totalOut = 0, totalPaid = 0, totalPending = 0;
    const today = new Date();
    today.setHours(0,0,0,0);

    data.forEach(item => {
        const val = item.valor || 0;
        totalOut += val;
        
        const statusRaw = (item.status_titulo || '').toUpperCase();
        if (statusRaw.includes('PAGO')) {
            totalPaid += val;
        } else {
            totalPending += val;
        }
    });

    document.getElementById('kpiTotalOut').textContent = formatCurrency(totalOut);
    document.getElementById('kpiTotalPaid').textContent = formatCurrency(totalPaid);
    document.getElementById('kpiTotalPending').textContent = formatCurrency(totalPending);
    document.getElementById('rowCount').textContent = data.length;
}

function renderTable(data) {
    const body = document.getElementById('lancamentosBody');
    body.innerHTML = '';
    const today = new Date();
    today.setHours(0,0,0,0);

    data.forEach(item => {
        const tr = document.createElement('tr');
        const statusRaw = (item.status_titulo || '').toUpperCase();
        const isPaid = statusRaw.includes('PAGO');
        const dtVenc = parseDate(item.data_vencimento);
        const isOverdue = !isPaid && dtVenc < today && item.data_vencimento && item.data_vencimento !== '---';

        const statusClass = isPaid ? 'status-pago' : (isOverdue ? 'status-atrasado' : 'status-aberto');
        const statusLabel = isPaid ? 'PAGO' : (isOverdue ? 'ATRASADO' : (statusRaw || 'ABERTO'));
        
        const allocations = allAllocations.filter(a => String(a.codigo_lancamento_omie) === String(item.codigo_lancamento_omie));
        const hasAlloc = allocations.length > 0;

        tr.innerHTML = `
            <td class="ps-4 td-status">
                <span class="status-badge ${statusClass}"></span>
                <span class="small fw-bold">${statusLabel}</span>
            </td>
            <td class="td-data">${formatDateBR(item._dataLabel)}</td>
            <td class="td-empresa small fw-bold text-muted">${item.empresa}</td>
            <td class="fw-bold td-fornecedor" title="${item.fornecedor}">${item.fornecedor}</td>
            <td class="fw-bold text-dark td-valor">${formatCurrency(item.valor)}</td>
            <td class="td-cat"><span class="badge bg-light text-dark border">${dimCategorias.get(item.categoria_id)?.descricao || item.categoria_id}</span></td>
            <td class="td-fonte"><span class="source-tag ${item.fonte === 'CP' ? 'source-cp' : 'source-mov'}">${item.fonte}</span></td>
            <td class="td-acoes">
                <button class="btn btn-sm btn-outline-primary btn-expand" onclick="toggleExpand(event, '${item.id_global}')">
                    <i class="bi bi-chevron-down"></i> Detalhes
                </button>
            </td>
        `;
        body.appendChild(tr);

        // Detalhes
        const detailTr = document.createElement('tr');
        detailTr.id = `details-${item.id_global}`;
        detailTr.className = 'detail-row';
        detailTr.style.display = 'none';

        // Lógica de Conta DRE: 
        // 1. Tenta pegar do rateio
        // 2. Senão, tenta pegar da categoria principal
        let dreText = 'Não vinculado';
        if (hasAlloc && allocations[0].descricao_conta_dre) {
            dreText = allocations[0].descricao_conta_dre;
        } else {
            const catInfo = dimCategorias.get(item.categoria_id);
            if (catInfo && catInfo.codigo_dre) {
                dreText = dimDRE.get(catInfo.codigo_dre) || `Cód: ${catInfo.codigo_dre}`;
            }
        }

        const projId = hasAlloc ? String(allocations[0].codigo_projeto) : String(item.codigo_projeto || '');
        const projText = dimProjetos.get(projId) || projId || 'Nenhum';
        
        // Detalhamento de Departamentos (Rateio)
        let deptoHtml = '<span class="text-muted">Padrão / Sem Rateio</span>';
        if (hasAlloc) {
            deptoHtml = `<ul class="list-unstyled mb-0 mt-1">
                ${allocations.map(a => `
                    <li class="mb-1 border-bottom pb-1 d-flex justify-content-between">
                        <span><i class="bi bi-diagram-3 me-2"></i>${a.descricao_departamento || a.codigo_departamento}</span>
                        <span class="fw-bold">${formatCurrency(a.valor_alocado)} <small class="text-muted">(${a.percentual_departamento}%)</small></span>
                    </li>
                `).join('')}
            </ul>`;
        }

        detailTr.innerHTML = `
            <td colspan="7" class="p-4 border-top-0">
                <div class="row">
                    <div class="col-md-3">
                        <div class="detail-label">Data Vencimento</div>
                        <div class="detail-value text-danger fw-bold">${formatDateBR(item.data_vencimento)}</div>
                        <div class="detail-label">Data Pagamento</div>
                        <div class="detail-value text-success fw-bold">${formatDateBR(item.data_pagamento)}</div>
                    </div>
                    <div class="col-md-3">
                        <div class="detail-label">Conta DRE</div>
                        <div class="detail-value text-primary fw-bold">${dreText}</div>
                        <div class="detail-label">Projeto</div>
                        <div class="detail-value">${projText}</div>
                    </div>
                    <div class="col-md-5">
                        <div class="detail-label">Departamentos / Rateio Detalhado</div>
                        <div class="detail-value">${deptoHtml}</div>
                        <div class="detail-label">Observação / ID</div>
                        <div class="detail-value small text-muted">
                            ${item.codigo_lancamento_omie ? `OMIE: ${item.codigo_lancamento_omie}` : (item.codigo_movimento_cc ? `MOV: ${item.codigo_movimento_cc}` : '')}
                            <br>${item.observacao || 'Nenhuma observação registrada.'}
                        </div>
                    </div>
                </div>
            </td>
        `;
        body.appendChild(detailTr);
    });
}

function toggleExpand(event, id) {
    if (event) event.preventDefault();
    const row = document.getElementById(`details-${id}`);
    const isHidden = row.style.display === 'none';
    row.style.display = isHidden ? 'table-row' : 'none';
    const btn = event?.currentTarget;
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
    }
}

function parseDate(dateStr) {
    if (!dateStr || dateStr === '---') return new Date(0);
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
    if (parts.length !== 3) return new Date(0);
    if (parts[0].length === 4) return new Date(parts[0], parts[1]-1, parts[2].slice(0,2));
    return new Date(parts[2], parts[1]-1, parts[0]);
}

function formatDateBR(dateStr) {
    if (!dateStr || dateStr === '---') return '---';
    if (dateStr.includes('/') && dateStr.split('/')[0].length <= 2) return dateStr;
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    if (parts[0].length === 4) return `${parts[2].slice(0,2)}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

function formatCurrency(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── EVENT HANDLERS ──────────────────────────────────────────────────────────

document.getElementById('filterCompany').onchange = renderDashboard;
document.getElementById('filterDateBase').onchange = renderDashboard;
document.getElementById('filterMonth').onchange = renderDashboard;
document.getElementById('filterStatus').onchange = renderDashboard;
document.getElementById('filterSource').onchange = renderDashboard;

document.getElementById('clearFilters').onclick = () => {
    document.getElementById('filterCompany').value = '';
    document.getElementById('filterDateBase').value = 'registro';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterSource').value = '';
    renderDashboard();
};

document.getElementById('btnUpdate').onclick = () => {
    const modal = new bootstrap.Modal(document.getElementById('modalUpdate'));
    modal.show();
};

function setupLayout() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');
    toggle.onclick = (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('expanded');
        const icon = toggle.querySelector('i');
        icon.className = sidebar.classList.contains('collapsed') ? 'bi bi-chevron-right' : 'bi bi-chevron-left';
    };
}
