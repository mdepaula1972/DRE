/**
 * Charts and Visualizations
 * Funções para renderizar gráficos e expansão de linhas
 */

// ========== Estado dos Gráficos ==========
let charts = {
    evolution: null,
    empresa: null
};

// ========== Renderização de Gráficos ==========

function renderDashboardCharts() {
    const invoices = storageManager.filterInvoices(currentFilters);

    if (invoices.length === 0) {
        destroyCharts();
        return;
    }

    renderEvolutionChart(invoices);
    renderEmpresaChart(invoices);
}

function renderEvolutionChart(invoices) {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;

    // Agrupar por competência
    const groupedByMonth = {};
    invoices.forEach(invoice => {
        const comp = invoice.competencia;
        if (!groupedByMonth[comp]) {
            groupedByMonth[comp] = {
                faturado: 0,
                liquido: 0,
                impostos: 0
            };
        }
        groupedByMonth[comp].faturado += invoice.valor_receita_bruta;
        groupedByMonth[comp].liquido += invoice.valor_liquido;
        groupedByMonth[comp].impostos += invoice.impostos.total;
    });

    // Ordenar competências cronologicamente
    const labels = Object.keys(groupedByMonth).sort();
    const dataFaturado = labels.map(l => groupedByMonth[l].faturado);
    const dataLiquido = labels.map(l => groupedByMonth[l].liquido);
    const dataImpostos = labels.map(l => groupedByMonth[l].impostos);

    // Destroir chart anterior se existir
    if (charts.evolution) {
        charts.evolution.destroy();
    }

    // Criar novo chart
    charts.evolution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(formatCompetencia),
            datasets: [
                {
                    label: 'Faturado',
                    data: dataFaturado,
                    backgroundColor: 'rgba(242, 145, 27, 0.8)',
                    borderColor: 'rgb(242, 145, 27)',
                    borderWidth: 1
                },
                {
                    label: 'Líquido',
                    data: dataLiquido,
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgb(52, 152, 219)',
                    borderWidth: 1
                },
                {
                    label: 'Impostos',
                    data: dataImpostos,
                    backgroundColor: 'rgba(149, 165, 166, 0.8)',
                    borderColor: 'rgb(149, 165, 166)',
                    borderWidth: 1
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
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function renderEmpresaChart(invoices) {
    const ctx = document.getElementById('empresaChart');
    if (!ctx) return;

    // Agrupar por CONTRATO (mudado de empresa)
    const groupedByContrato = {};
    invoices.forEach(invoice => {
        const contract = storageManager.getContract(invoice.contract_id);
        const nomeContrato = contract ? (contract.nome_contrato || 'Não Especificado') : 'Não Especificado';

        if (!groupedByContrato[nomeContrato]) {
            groupedByContrato[nomeContrato] = 0;
        }
        groupedByContrato[nomeContrato] += invoice.valor_receita_bruta;
    });

    const labels = Object.keys(groupedByContrato);
    const data = Object.values(groupedByContrato);

    const colors = [
        'rgba(242, 145, 27, 0.8)',  // Mar Brasil Orange
        'rgba(52, 152, 219, 0.8)',  // Blue
        'rgba(155, 89, 182, 0.8)',  // Purple
        'rgba(46, 204, 113, 0.8)',  // Green
        'rgba(231, 76, 60, 0.8)',   // Red
        'rgba(241, 196, 15, 0.8)'   // Yellow
    ];

    // Destroir chart anterior se existir
    if (charts.empresa) {
        charts.empresa.destroy();
    }

    charts.empresa = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento por Contrato',
                data: data,
                backgroundColor: colors,
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function destroyCharts() {
    if (charts.evolution) {
        charts.evolution.destroy();
        charts.evolution = null;
    }
    if (charts.empresa) {
        charts.empresa.destroy();
        charts.empresa = null;
    }
}

function formatCompetencia(comp) {
    // Converte "2026-01" para "Jan/26"
    const [ano, mes] = comp.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano.slice(-2)}`;
}

// ========== Expansão de Linhas ==========

function toggleInvoiceExpansion(nfId, btn) {
    const invoice = storageManager.getInvoice(nfId);
    if (!invoice) return;

    const tr = btn.closest('tr');
    const nextRow = tr.nextElementSibling;

    // Se já existe linha expandida, remover
    if (nextRow && nextRow.classList.contains('expanded-row')) {
        nextRow.remove();
        btn.innerHTML = '<i class="bi bi-plus-circle"></i>';
        return;
    }

    // Criar linha expandida
    const expandedRow = document.createElement('tr');
    expandedRow.classList.add('expanded-row');
    expandedRow.innerHTML = createExpandedContent(invoice);

    // Inserir após a linha atual
    tr.after(expandedRow);
    btn.innerHTML = '<i class="bi bi-dash-circle"></i>';
}

function createExpandedContent(invoice) {
    const contract = storageManager.getContract(invoice.contract_id);

    // Detalhamento de impostos
    const impostos = invoice.impostos;
    const taxBreakdown = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="mb-3"><i class="bi bi-receipt me-2"></i>Detalhamento de Impostos</h6>
                <table class="table table-sm table-borderless">
                    <tbody>
                        <tr>
                            <td><strong>ISS:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.iss || 0)}</td>
                            <td class="text-muted small">${contract?.aliquota_iss || 0}%</td>
                        </tr>
                        <tr>
                            <td><strong>PIS:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.pis || 0)}</td>
                            <td class="text-muted small">0.65%</td>
                        </tr>
                        <tr>
                            <td><strong>COFINS:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.cofins || 0)}</td>
                            <td class="text-muted small">3%</td>
                        </tr>
                        <tr>
                            <td><strong>IR:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.ir || 0)}</td>
                            <td class="text-muted small">1.5%</td>
                        </tr>
                        <tr>
                            <td><strong>CSLL:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.csll || 0)}</td>
                            <td class="text-muted small">1.08%</td>
                        </tr>
                        <tr>
                            <td><strong>ICMS:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.icms || 0)}</td>
                            <td class="text-muted small">${contract?.aliquota_icms || 0}%</td>
                        </tr>
                        <tr>
                            <td><strong>INSS:</strong></td>
                            <td class="text-end">${formatCurrency(impostos.inss || 0)}</td>
                            <td class="text-muted small">11%</td>
                        </tr>
                        <tr class="border-top">
                            <td><strong>TOTAL:</strong></td>
                            <td class="text-end"><strong>${formatCurrency(impostos.total)}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="mb-3"><i class="bi bi-info-circle me-2"></i>Informações Adicionais</h6>
                <dl class="row mb-0">
                    <dt class="col-sm-6">Contrato:</dt>
                    <dd class="col-sm-6">${contract?.nome || 'N/A'}</dd>
                    
                    <dt class="col-sm-6">Empresa:</dt>
                    <dd class="col-sm-6">${contract?.empresa || invoice.empresa || 'N/A'}</dd>
                    
                    <dt class="col-sm-6">Valor Bruto:</dt>
                    <dd class="col-sm-6">${formatCurrency(invoice.valor_receita_bruta)}</dd>
                    
                    <dt class="col-sm-6">Total Impostos:</dt>
                    <dd class="col-sm-6 text-danger">${formatCurrency(impostos.total)}</dd>
                    
                    <dt class="col-sm-6">Valor Líquido:</dt>
                    <dd class="col-sm-6 text-success"><strong>${formatCurrency(invoice.valor_liquido)}</strong></dd>
                    
                    ${invoice.numero_equipamentos ? `
                    <dt class="col-sm-6">Equipamentos:</dt>
                    <dd class="col-sm-6">${invoice.numero_equipamentos}</dd>
                    ` : ''}
                    
                    ${invoice.houve_imposto_retido ? `
                    <dt class="col-sm-6">Retenção:</dt>
                    <dd class="col-sm-6">${formatCurrency(invoice.valor_imposto_retido)}</dd>
                    ` : ''}
                </dl>
            </div>
        </div>
    `;

    return `<td colspan="12" class="bg-light p-4">${taxBreakdown}</td>`;
}

// ========== Atualizar ao carregar invoices ==========

// Sobrescrever loadInvoices original para incluir gráficos
const originalLoadInvoices = window.loadInvoices;
window.loadInvoices = function () {
    if (originalLoadInvoices) {
        originalLoadInvoices();
    }
    renderDashboardCharts();
};
