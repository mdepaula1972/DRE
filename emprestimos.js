// Dashboard de Empréstimos v28.30 — Regras de liberação e Pdf individual
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const db = supabaseClient;

let allEmployees = [];   // employees com _loans injetado
let allLoans = [];       // todos os registros de employee_loans

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupLayout();
});

async function init() {
    try {
        await fetchData();
        // Show debug bar with result
        const bar = document.getElementById('debugBar');
        const msg = document.getElementById('debugMsg');
        if (bar && msg) {
            const withLoans = allEmployees.filter(e => e._loans && e._loans.length > 0);
            msg.textContent = `${allEmployees.length} colaboradores | ${allLoans.length} empréstimos na tabela | ${withLoans.length} com empréstimo`;
            bar.style.display = 'block';
        }
        renderDashboard();
        populateEmployeeSelect();
    } catch (err) {
        const bar = document.getElementById('debugBar');
        if (bar) { bar.className = 'alert alert-danger small mb-3'; bar.style.display = 'block'; bar.textContent = 'ERRO: ' + err.message; }
        console.error('[EMPRESTIMOS] init error:', err);
    }
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────
async function fetchData() {
    // Busca employees normalmente (tabela não afetada pelo auth bug)
    const empRes = await db.from('employees')
        .select('id,full_name,job_role,company,employment_type,remuneration,status,loan_amount,loan_installments,loan_start_cycle,loans_data')
        .order('full_name');

    // Fazemos um fetch() nativo p/ employee_loans para contornar o supabase-js 
    // que injeta o token do localStorage (authenticated role) ignorando a service_key
    let loansFromTable = null;
    let fallbackMsg = '';
    try {
        const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/employee_loans?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (fetchRes.ok) {
            loansFromTable = await fetchRes.json();
        } else {
            fallbackMsg = `Status ${fetchRes.status}: ${await fetchRes.text()}`;
        }
    } catch (e) {
        fallbackMsg = e.message;
    }

    if (empRes.error) { console.error('employees error:', empRes.error); return; }
    if (loansFromTable === null) console.warn('[EMPRESTIMOS] Fallback para dados legados. Erro:', fallbackMsg);

    allLoans = loansFromTable || [];

    allEmployees = (empRes.data || []).map(emp => {
        let loans;
        if (loansFromTable !== null) {
            loans = loansFromTable.filter(l => l.employee_id === emp.id);
        } else {
            // Legacy fallback: build _loans from JSON fields in employees table
            loans = [];
            if ((parseFloat(emp.loan_amount) || 0) > 0) {
                loans.push({ id: null, employee_id: emp.id, amount: emp.loan_amount, installments: emp.loan_installments, start_cycle: emp.loan_start_cycle });
            }
            let ld = emp.loans_data;
            if (typeof ld === 'string') { try { ld = JSON.parse(ld); } catch (e) { ld = []; } }
            if (Array.isArray(ld)) loans.push(...ld.map(l => ({ ...l, employee_id: emp.id })));
        }
        return { ...emp, _loans: loans };
    });

    console.log(`[EMPRESTIMOS] ${allEmployees.length} func. | ${allLoans.length} empréstimos | Tabela nova: ${loansFromTable !== null}`);
}


// ─── FILTER + RENDER ──────────────────────────────────────────────────────────
function renderDashboard() {
    const filterCompany = document.getElementById('filterCompany')?.value || '';
    const filterType = document.getElementById('filterType')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';

    const filtered = allEmployees.filter(emp => {
        if (!emp._loans.length) return false;
        if (filterCompany && emp.company !== filterCompany) return false;
        if (filterType && emp.employment_type !== filterType) return false;
        if (filterStatus) {
            const debt = calculateDebt(emp);
            if (filterStatus === 'ativo' && debt <= 0) return false;
            if (filterStatus === 'quitado' && debt > 0) return false;
        }
        return true;
    });

    updateCounters(filtered);
    renderProjection(filtered);
    renderDetailedTable(filtered);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatCurrency(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d) {
    if (!d) return '---';
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
}

function calculateDebt(emp) {
    const now = new Date();
    let totalDebt = 0;

    emp._loans.forEach(ln => {
        const amount = parseFloat(ln.amount) || 0;
        const inst = parseInt(ln.installments) || 0;
        const sc = ln.start_cycle;
        if (!amount || !inst || !sc) return;

        function getElapsed(cycle) {
            const n = new Date();
            const [y, m] = cycle.split('-').map(Number);
            let e = (n.getFullYear() - y) * 12 + (n.getMonth() - (m - 1));
            if (n.getDate() < 10) e--;
            return Math.max(0, e);
        }

        const paid_inst = parseInt(ln.paid_installments) || 0;
        const paid_extra = parseFloat(ln.amount_paid_extra) || 0;
        const elapsed = getElapsed(sc);

        const totalPaidInstances = Math.max(0, Math.min(elapsed + paid_inst, inst));
        const debt = Math.max(0, amount - (totalPaidInstances * (amount / inst)) - paid_extra);
        totalDebt += debt;
    });
    return totalDebt;
}

function calculateTaken(emp) {
    return (emp._loans || []).reduce((a, ln) => a + (parseFloat(ln.amount) || 0), 0);
}

function getInstallmentForMonth(emp, monthStr) {
    const [ty, tm] = monthStr.split('-').map(Number);
    const targetAbs = ty * 12 + tm;
    let total = 0;

    emp._loans.forEach(ln => {
        const amount = parseFloat(ln.amount) || 0;
        const inst = parseInt(ln.installments) || 0;
        const sc = ln.start_cycle;
        if (!amount || !inst || !sc) return;

        const [sy, sm] = sc.split('-').map(Number);
        const startAbs = sy * 12 + sm;
        const endAbs = startAbs + inst - 1;

        if (targetAbs >= startAbs && targetAbs <= endAbs) {
            total += amount / inst;
        }
    });

    return total;
}

// ─── COUNTERS ────────────────────────────────────────────────────────────────
function updateCounters(filtered) {
    let totalLent = 0, outstandingBalance = 0, monthlyReceivable = 0, activeContracts = 0;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    filtered.forEach(emp => {
        const taken = calculateTaken(emp);
        const debt = calculateDebt(emp);
        totalLent += taken;
        outstandingBalance += debt;
        if (debt > 0) activeContracts++;
        monthlyReceivable += getInstallmentForMonth(emp, currentMonthStr);
    });

    document.getElementById('cardTotalLent').textContent = formatCurrency(totalLent);
    document.getElementById('cardOutstandingBalance').textContent = formatCurrency(outstandingBalance);
    document.getElementById('cardMonthlyReceivable').textContent = formatCurrency(monthlyReceivable);
    document.getElementById('cardActiveContracts').textContent = activeContracts;
    document.getElementById('totalItemsCount').textContent = filtered.length;
}

// ─── PROJECTION TABLE ────────────────────────────────────────────────────────
function renderProjection(filtered) {
    const now = new Date();
    const months = [];
    const headers = ['COLABORADOR', 'TOTAL PROJETADO'];

    // Calcular até qual mês devemos mostrar (último mês de qualquer empréstimo ativo)
    let maxMonthAbs = now.getFullYear() * 12 + (now.getMonth() + 1) + 11; // Mínimo: 12 meses à frente
    
    filtered.forEach(emp => {
        if (!emp._loans || emp._loans.length === 0) return;
        emp._loans.forEach(ln => {
            const amount = parseFloat(ln.amount) || 0;
            const inst = parseInt(ln.installments) || 0;
            const sc = ln.start_cycle;
            if (!amount || !inst || !sc) return;
            
            const [y, m] = sc.split('-').map(Number);
            // Mês final deste empréstimo (start + installments - 1)
            const endAbs = y * 12 + m + inst - 1;
            if (endAbs > maxMonthAbs) {
                maxMonthAbs = endAbs;
            }
        });
    });

    // Gerar array de meses do atual até o máximo
    const currentAbs = now.getFullYear() * 12 + (now.getMonth() + 1);
    const totalMonths = maxMonthAbs - currentAbs + 1;
    
    for (let i = 0; i < totalMonths; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase() + '/' + String(d.getFullYear()).slice(2);
        months.push(mStr);
        headers.push(label);
    }

    document.getElementById('projectionHeader').innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    const body = document.getElementById('projectionBody');
    body.innerHTML = '';
    const totals = new Array(months.length).fill(0);

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        
        // Calcular total projetado (soma das parcelas de todos os meses)
        let totalProjetado = 0;
        months.forEach(mStr => {
            totalProjetado += getInstallmentForMonth(emp, mStr);
        });
        
        let html = `<td class="fw-bold border-end bg-light sticky-col-name" style="min-width:250px;">${emp.full_name}</td>`;
        html += `<td class="fw-bold text-primary text-center bg-light border-end sticky-col-total" style="min-width:130px;">${formatCurrency(totalProjetado)}</td>`;
        
        months.forEach((mStr, idx) => {
            const val = getInstallmentForMonth(emp, mStr);
            totals[idx] += val;
            html += `<td class="month-col ${val > 0 ? 'text-primary' : 'text-muted opacity-25'}" style="font-size:0.75rem;">${val > 0 ? formatCurrency(val) : '---'}</td>`;
        });
        tr.innerHTML = html;
        body.appendChild(tr);
    });

    // Calcular total projetado geral
    let totalProjetadoGeral = totals.reduce((a, b) => a + b, 0);

    document.getElementById('projectionFooter').innerHTML = `
        <tr class="fw-bold">
            <td class="bg-dark text-warning sticky-col-name">TOTAL MENSAL</td>
            <td class="bg-dark text-info text-center sticky-col-total">${formatCurrency(totalProjetadoGeral)}</td>
            ${totals.map(v => `<td class="text-warning text-center">${formatCurrency(v)}</td>`).join('')}
        </tr>`;
}

// ─── DETAILED TABLE ───────────────────────────────────────────────────────────
function renderDetailedTable(filtered) {
    const body = document.getElementById('detailedLoanBody');
    body.innerHTML = '';
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    filtered.forEach((emp, idx) => {
        const debt = calculateDebt(emp);
        const taken = calculateTaken(emp);
        const currentInstallment = getInstallmentForMonth(emp, currentMonthStr);
        const rowId = `detail-${idx}`;

        const tr = document.createElement('tr');
        tr.className = debt > 0 ? 'active-row' : 'closed-row';
        tr.innerHTML = `
            <td class="ps-2">
                <button class="btn btn-xs btn-outline-warning p-0 px-1 me-2" onclick="toggleLoanDetail('${rowId}')" title="Expandir">
                    <i class="bi bi-plus-circle" id="icon-${rowId}"></i>
                </button>
                <span class="fw-bold">${emp.full_name}</span>
                <div class="small text-muted ps-4">${emp.job_role || '---'}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${emp.company || '---'}</span></td>
            <td>${emp.employment_type || '---'}</td>
            <td class="font-monospace fw-bold">${formatCurrency(taken)}</td>
            <td class="font-monospace text-danger">${formatCurrency(debt)}</td>
            <td class="font-monospace text-primary fw-bold">${formatCurrency(currentInstallment)}</td>
            <td>${emp._loans.length}x op.</td>
            <td><span class="badge ${debt > 0 ? 'bg-success' : 'bg-secondary'}">${debt > 0 ? 'ATIVO' : 'QUITADO'}</span></td>
            <td class="text-center nowrap">
                <button class="btn btn-sm btn-outline-success p-1 px-2 me-1" title="Novo Empréstimo" onclick="openLoanModal('${emp.id}','${emp.full_name.replace(/'/g, "\\'")}')">
                    <i class="bi bi-plus-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary p-1 px-2" title="Abrir Perfil" onclick="window.location.href='people.html?id=${emp.id}'">
                    <i class="bi bi-person-fill"></i>
                </button>
            </td>`;
        body.appendChild(tr);

        // Detail row
        const detailRow = document.createElement('tr');
        detailRow.id = rowId;
        detailRow.style.display = 'none';
        detailRow.className = 'bg-light';

        let detailHTML = '<td colspan="9" class="ps-5 py-2"><div class="row g-2">';
        emp._loans.forEach((ln, i) => {
            const lnDebt = (() => {
                const amount = parseFloat(ln.amount) || 0;
                const inst = parseInt(ln.installments) || 0;
                const sc = ln.start_cycle;
                if (!amount || !inst || !sc) return amount;
                
                function getElapsed(cycle) {
                    const n = new Date();
                    const [y, m] = cycle.split('-').map(Number);
                    let e = (n.getFullYear() - y) * 12 + (n.getMonth() - (m - 1));
                    if (n.getDate() < 10) e--;
                    return Math.max(0, e);
                }

                const paid_inst = parseInt(ln.paid_installments) || 0;
                const paid_extra = parseFloat(ln.amount_paid_extra) || 0;
                const elapsed = getElapsed(sc);
                
                const totalPaidInstances = Math.max(0, Math.min(elapsed + paid_inst, inst));
                return Math.max(0, amount - (totalPaidInstances * (amount / inst)) - paid_extra);
            })();
            detailHTML += `
                <div class="col-auto">
                    <div class="border border-secondary rounded p-2 bg-white ${lnDebt <= 0 ? 'border-success' : ''}" style="min-width:200px;">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <div class="small text-muted fw-bold"><i class="bi bi-cash me-1"></i>OP. #${i + 1}</div>
                            <div class="d-flex align-items-center gap-1">
                                <span class="badge ${lnDebt <= 0 ? 'bg-success' : 'bg-primary'}" style="font-size: 0.6rem;">${lnDebt <= 0 ? 'LIQUIDADO' : 'ATIVO'}</span>
                                <button class="btn btn-xs btn-outline-danger p-0 px-1" onclick="deleteLoan('${ln.id}','${emp.full_name.replace(/'/g, "\\'")}')">
                                    <i class="bi bi-trash" style="font-size:0.65rem;"></i>
                                </button>
                            </div>
                        </div>
                        <div class="small">Valor: <span class="fw-bold text-dark">${formatCurrency(ln.amount)}</span></div>
                        <div class="small">Parcelas: <span class="text-dark">${ln.installments}x = ${formatCurrency(parseFloat(ln.amount) / ln.installments)}/mês</span></div>
                        <div class="small">Início: <span class="text-dark">${ln.start_cycle || '---'}</span></div>
                        <div class="small d-flex align-items-center mt-1">
                            Saldo: <span class="fw-bold ms-1 ${lnDebt <= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(lnDebt)}</span>
                        </div>
                        ${ln.notes ? `<div class="small text-muted mt-1">${ln.notes}</div>` : ''}
                        <div class="mt-2 d-flex gap-1">
                            ${lnDebt > 0 ? `
                                <button class="btn btn-xs btn-success flex-fill" onclick="liquidateLoan('${ln.id}', '${emp.full_name.replace(/'/g, "\\'")}', ${lnDebt})" title="Liquidar empréstimo">
                                    💰 Liquidar
                                </button>
                            ` : `
                                <button class="btn btn-xs btn-outline-secondary flex-fill" disabled title="Empréstimo já liquidado">
                                    ✅ Liquidado
                                </button>
                            `}
                        </div>
                    </div>
                </div>`;
        });
        detailHTML += `
            <div class="col-auto d-flex align-items-center">
                <button class="btn btn-sm btn-outline-success" onclick="openLoanModal('${emp.id}','${emp.full_name.replace(/'/g, "\\'")}')">
                    <i class="bi bi-plus-circle me-1"></i>Novo Empréstimo
                </button>
            </div>`;
        detailHTML += '</div></td>';
        detailRow.innerHTML = detailHTML;
        body.appendChild(detailRow);
    });
}

window.toggleLoanDetail = function (rowId) {
    const row = document.getElementById(rowId);
    const icon = document.getElementById('icon-' + rowId);
    if (row) {
        const isHidden = row.style.display === 'none';
        row.style.display = isHidden ? 'table-row' : 'none';
        if (icon) icon.className = isHidden ? 'bi bi-dash-circle' : 'bi bi-plus-circle';
    }
};

// ─── NEW LOAN MODAL ───────────────────────────────────────────────────────────
function populateEmployeeSelect() {
    const select = document.getElementById('loanEmployeeSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o Beneficiário</option>';
    allEmployees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.full_name;
        select.appendChild(opt);
    });
}

window.openLoanModal = function (employeeId = '', employeeName = '') {
    document.getElementById('loanId').value = '';
    document.getElementById('loanEmployeeSelect').value = employeeId;
    document.getElementById('loanAmountInput').value = '';
    document.getElementById('loanInstallmentsInput').value = '';
    document.getElementById('loanStartCycle').value = '';
    document.getElementById('loanRequestDate').value = '';
    document.getElementById('loanNotes').value = '';
    document.getElementById('loanModalTitle').textContent = employeeName ? `Novo Empréstimo — ${employeeName}` : 'Novo Empréstimo';
    // Reset preview
    const preview = document.getElementById('loanPreview');
    if (preview) preview.style.display = 'none';
    new bootstrap.Modal(document.getElementById('modalLoan')).show();
};

window.saveLoan = async function (generateTerm = false) {
    const employeeId = document.getElementById('loanEmployeeSelect').value;
    const amount = parseFloat(document.getElementById('loanAmountInput').value) || 0;
    const installments = parseInt(document.getElementById('loanInstallmentsInput').value) || 0;
    const startCycle = document.getElementById('loanStartCycle').value;
    const requestDate = document.getElementById('loanRequestDate').value || null;
    const notes = document.getElementById('loanNotes').value;

    if (!employeeId || !amount || !installments || !startCycle) {
        alert('Preencha: Beneficiário, Valor, Parcelas e Ciclo de Início.');
        return;
    }

    const emp = allEmployees.find(e => e.id === employeeId);
    if (emp) {
        if (emp.start_date) {
            const startDt = new Date(emp.start_date + 'T00:00:00');
            const now = new Date();
            const months = (now.getFullYear() - startDt.getFullYear()) * 12 + now.getMonth() - startDt.getMonth();
            if (months < 6) {
                if (!confirm(`Atenção: Colaborador tem menos de 6 meses de empresa (Admissão: ${emp.start_date}).\nDeseja liberar o empréstimo mesmo assim?`)) return;
            }
        }

        const remun = parseFloat(emp.remuneration) || 0;
        const taken = calculateTaken(emp);
        const margin = remun > 0 ? (remun - taken) : 0;

        if (remun > 0 && amount > margin) {
            if (!confirm(`Atenção: O valor do empréstimo (R$ ${amount.toFixed(2)}) excede a margem consignável disponível (R$ ${margin.toFixed(2)}).\nSalário: R$ ${remun.toFixed(2)} | Já tomado: R$ ${taken.toFixed(2)}\nDeseja liberar o empréstimo mesmo assim?`)) return;
        }
    }

    const payload = { employee_id: employeeId, amount, installments, start_cycle: startCycle, request_date: requestDate, notes };

    let insertedLoan = null;

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/employee_loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.length > 0) insertedLoan = data[0];
    } catch (e) {
        console.error(e); alert('Erro ao salvar o empréstimo: ' + e.message); return;
    }

    bootstrap.Modal.getInstance(document.getElementById('modalLoan')).hide();
    await fetchData();
    renderDashboard();

    if (generateTerm && insertedLoan && emp) {
        const today = new Date().toISOString().split('T')[0];
        generateTermoPDFForLoan(emp, insertedLoan, today);
    }
};

window.populateTermoLoans = function () {
    const empId = document.getElementById('termoEmployeeSelect').value;
    const loanSelect = document.getElementById('termoLoanSelect');
    if (!loanSelect) return;
    loanSelect.innerHTML = '<option value="">Selecione o empréstimo...</option>';
    if (!empId) return;

    const emp = allEmployees.find(e => e.id === empId);
    if (emp && emp._loans) {
        emp._loans.forEach((loan, idx) => {
            const opt = document.createElement('option');
            opt.value = idx; // index within array
            opt.textContent = `Empréstimo R$ ${loan.amount} - ${loan.installments}x (Início: ${loan.start_cycle})`;
            loanSelect.appendChild(opt);
        });
    }
};

window.deleteLoan = async function (loanId, empName) {
    if (!confirm(`Remover este empréstimo de ${empName}?`)) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/employee_loans?id=eq.${loanId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (!res.ok) throw new Error(await res.text());
    } catch (e) {
        console.error(e); alert('Erro ao remover: ' + e.message); return;
    }
    await fetchData();
    renderDashboard();
};

// ─── LOAN LIQUIDATION ─────────────────────────────────────────────────────────────
window.liquidateLoan = async function(loanId, empName, currentBalance) {
    if (!confirm(`Deseja liquidar totalmente este empréstimo de ${empName}?\n\nValor a pagar: ${formatCurrency(currentBalance)}\n\nEsta ação é irreversível!`)) return;
    
    try {
        const btn = document.querySelector(`[onclick*="liquidateLoan('${loanId}'"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>PROCESSANDO...';
        }

        // Buscar dados atuais do empréstimo
        const { data: loan, error: fetchErr } = await db.from('employee_loans')
            .select('*')
            .eq('id', loanId)
            .single();
        
        if (fetchErr) throw fetchErr;
        if (!loan) throw new Error('Empréstimo não encontrado');

        // Calcular valor total já pago + pagamento extra para liquidar
        const installmentValue = parseFloat(loan.amount) / loan.installments;
        const paidValue = (loan.paid_installments || 0) * installmentValue;
        const extraPayment = currentBalance; // Saldo restante para liquidar
        
        // Atualizar empréstimo
        const { error: updateErr } = await db.from('employee_loans')
            .update({
                amount_paid_extra: (parseFloat(loan.amount_paid_extra) || 0) + extraPayment,
                notes: (loan.notes || '') + `\n[LIQUIDADO em ${new Date().toLocaleDateString('pt-BR')}]`
            })
            .eq('id', loanId);
        
        if (updateErr) throw updateErr;

        // Registrar no histórico
        await db.from('employee_history').insert({
            employee_id: loan.employee_id,
            change_date: new Date().toISOString().split('T')[0],
            event_type: 'Liquidação Empréstimo',
            observations: `[${empName}] [LID:${loanId}] Empréstimo liquidado totalmente. Valor pago: ${formatCurrency(extraPayment)}`
        });

        alert('✅ Empréstimo liquidado com sucesso!');
        await fetchData();
        renderDashboard();
        
    } catch (err) {
        alert('❌ Erro ao liquidar empréstimo: ' + err.message);
        // Restaurar botão
        const btn = document.querySelector(`[onclick*="liquidateLoan('${loanId}'"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💰 Liquidar';
        }
    }
};

// ─── PDF TERMO ────────────────────────────────────────────────────────────────
// ─── PDF TERMO INDIVIDUALIZADO ────────────────────────────────────────────────
window.generateTermoPDF = async function () {
    const employeeId = document.getElementById('termoEmployeeSelect').value;
    const loanIdx = document.getElementById('termoLoanSelect').value;
    const dataContrato = document.getElementById('termoData').value;
    if (!employeeId || !dataContrato || !loanIdx) { alert('Selecione o beneficiário, o empréstimo e a data do contrato.'); return; }

    const emp = allEmployees.find(e => e.id === employeeId);
    if (!emp || !emp._loans || !emp._loans[loanIdx]) return;
    const loan = emp._loans[loanIdx];

    generateTermoPDFForLoan(emp, loan, dataContrato);
};

window.generateTermoPDFForLoan = async function (emp, ln, dataContrato) {
    const timbrado = window.TIMBRADO_B64;
    if (!timbrado) { alert('Erro: timbrado não carregado.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = 210, marginLeft = 20, marginRight = 20, contentWidth = pageWidth - marginLeft - marginRight;
    let y = 60;

    const addPage = () => { doc.addPage(); doc.addImage(timbrado, 'JPEG', 0, 0, 210, 297); y = 40; };
    const checkPage = (need) => { if (y + need > 270) addPage(); };
    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const dtContract = new Date(dataContrato + 'T12:00:00');
    const dataFormatada = `${dtContract.getDate()} de ${months[dtContract.getMonth()]} de ${dtContract.getFullYear()}`;

    const totalValor = parseFloat(ln.amount) || 0;
    const isPJ = emp.employment_type === 'PJ';

    function valorPorExtenso(v) {
        if (v === 0) return 'zero reais';
        const intPart = Math.floor(v);
        const decPart = Math.round((v - intPart) * 100);
        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
        function convertGroup(n) {
            if (n === 0) return '';
            if (n === 100) return 'cem';
            let r = '';
            if (n >= 100) { r += centenas[Math.floor(n / 100)]; n %= 100; if (n) r += ' e '; }
            if (n >= 20) { r += dezenas[Math.floor(n / 10)]; n %= 10; if (n) r += ' e '; }
            if (n > 0) r += unidades[n];
            return r;
        }
        let result = '';
        if (intPart >= 1000) {
            const mil = Math.floor(intPart / 1000);
            result += (mil === 1 ? 'mil' : convertGroup(mil) + ' mil');
            const rem = intPart % 1000;
            if (rem) result += ' e ' + convertGroup(rem);
        } else {
            result = convertGroup(intPart);
        }
        result += (intPart === 1 ? ' real' : ' reais');
        if (decPart) result += ` e ${convertGroup(decPart)} centavos`;
        return result.replace(/  /g, ' ').trim();
    }

    doc.addImage(timbrado, 'JPEG', 0, 0, 210, 297);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TERMO DE CONFISSÃO DE DÍVIDA", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Devedor Text
    let addrParts = [
        emp.street ? `${emp.street}, ${emp.number || 'S/N'}` : '',
        emp.neighborhood || '',
        (emp.city || emp.state) ? `${emp.city || ''}/${emp.state || ''}`.replace(/^\/|\/$/g, '') : ''
    ].filter(Boolean);
    const addressStr = addrParts.join(' – ') || 'endereço não informado';

    let devedorTxt = '';
    const nomeOuRazao = (isPJ && emp.corporate_name) ? emp.corporate_name : emp.full_name;
    const cpfOuCnpj = emp.document_id || '---';
    const rg = emp.responsible_rg || '---';
    const cpfResp = emp.responsible_cpf || '---';
    const nomeResp = (emp.responsible_name && emp.responsible_name.trim()) ? emp.responsible_name : emp.full_name;

    if (isPJ) {
        devedorTxt = `${nomeOuRazao}, ${emp.pj_type ? emp.pj_type + ', ' : ''}estabelecida na ${addressStr}, inscrita no CNPJ sob o n.º ${cpfOuCnpj}, neste ato representada por ${nomeResp}, inscrito(a) no CPF sob o n.º ${cpfResp}.`;
    } else {
        devedorTxt = `${nomeOuRazao}, portador(a) do RG n.º ${rg} e inscrito(a) no CPF sob o n.º ${cpfOuCnpj}, residente e domiciliado(a) na ${addressStr}.`;
    }

    const credorTxt = `MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 02.233.923/0001-19, com sede em Rua Tupi, nº 782, Vila Tupi, Praia Grande - SP, neste ato representada por sua sócia administradora, a Sra. Priscilla Coelho Monteiro, brasileira, casada, empresária, inscrita no CPF sob n.º 320.421.118-56.`;

    doc.setFont("helvetica", "bold");
    doc.text("DEVEDOR(A): ", marginLeft, y);
    doc.setFont("helvetica", "normal");
    let splitDev = doc.splitTextToSize(devedorTxt, contentWidth - 25);
    doc.text(splitDev, marginLeft + 23, y);
    y += splitDev.length * 4.5 + 5;

    doc.setFont("helvetica", "bold");
    doc.text("CREDOR(A): ", marginLeft, y);
    doc.setFont("helvetica", "normal");
    let splitCred = doc.splitTextToSize(credorTxt, contentWidth - 25);
    doc.text(splitCred, marginLeft + 23, y);
    y += splitCred.length * 4.5 + 5;

    const confText = `As partes acima qualificadas, por este instrumento particular e na melhor forma de direito, confessam e assumem como líquida e certa a dívida a seguir descrita, sujeitando-se às cláusulas e condições que se seguem:`;
    let splitConf = doc.splitTextToSize(confText, contentWidth);
    doc.text(splitConf, marginLeft, y);
    y += splitConf.length * 4.5 + 5;

    // Clausula 1
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA PRIMEIRA – DO OBJETO DA DÍVIDA", marginLeft, y); y += 6;
    doc.setFont("helvetica", "normal");
    const cl1 = `1.1. O(A) DEVEDOR(A) confessa e declara dever ao(à) CREDOR(A) a importância líquida, certa e exigível de ${fmt(totalValor)} (${valorPorExtenso(totalValor)}), referente ao empréstimo concedido pela MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA. ao(à) DEVEDOR(A) em ${dataFormatada}.`;
    let splitCl1 = doc.splitTextToSize(cl1, contentWidth);
    doc.text(splitCl1, marginLeft, y);
    y += splitCl1.length * 4.5 + 5;

    // Clausula 2
    checkPage(40);
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO", marginLeft, y); y += 6;
    doc.setFont("helvetica", "normal");
    const parcela = (totalValor / ln.installments).toFixed(2);
    const scParts = (ln.start_cycle || '').split('-');
    const formattedCycle = scParts.length === 2 ? `${scParts[1]}/${scParts[0]}` : (ln.start_cycle || '---');

    const formaPagto = isPJ ? 'notas fiscais de prestação de serviços emitidas à MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA.' : 'holerites ou recibos de salário';
    const cl2_1 = `2.1. O valor confessado na Cláusula Primeira será quitado pelo(a) DEVEDOR(A) por meio de descontos nas futuras ${formaPagto}, em ${ln.installments} parcelas mensais e sucessivas, no valor de ${fmt(parseFloat(parcela))} (${valorPorExtenso(parseFloat(parcela))}) cada uma, com vencimento/desconto mensal a partir do ciclo de ${formattedCycle}.`;
    let cl2_2 = "";
    if (isPJ) {
        cl2_2 = `2.2. Os descontos serão aplicados automaticamente pela CREDORA no momento do processamento das notas fiscais, e o valor líquido a ser pago ao(à) DEVEDOR(A) será o resultado da nota fiscal menos o valor da parcela do empréstimo.`;
    } else {
        cl2_2 = `2.2. Os descontos serão aplicados automaticamente pela CREDORA/EMPREGADORA diretamente nos recebíveis do(a) DEVEDOR(A) (recibos ou guias), conforme limites da Lei.`;
    }
    let splitCl2_1 = doc.splitTextToSize(cl2_1, contentWidth); doc.text(splitCl2_1, marginLeft, y); y += splitCl2_1.length * 4.5 + 3;
    let splitCl2_2 = doc.splitTextToSize(cl2_2, contentWidth); doc.text(splitCl2_2, marginLeft, y); y += splitCl2_2.length * 4.5 + 5;

    // Clausulas Inadimplencia (3, 4, 5)
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA TERCEIRA – DA INADIMPLÊNCIA", marginLeft, y); y += 6;
    doc.setFont("helvetica", "normal");

    const inad = [
        `3.1. O não pagamento de qualquer parcela na data estipulada, ou o término do contrato de prestação de serviços/trabalho, implicará no vencimento antecipado de todo o saldo devedor, que se tornará imediatamente exigível pela CREDORA.`,
        `3.2. Em caso de inadimplência, sobre o saldo devedor vencido e não pago incidirão: a) Multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso ou sobre o saldo devedor em caso de vencimento antecipado. b) Juros de mora de 1% (um por cento) ao mês, ou fração, calculados pro rata die sobre o saldo devedor atualizado. c) Correção monetária.`,
        `3.3. A CREDORA se reserva o direito de promover a execução judicial deste Termo de Confissão de Dívida, que é título executivo extrajudicial, abrangendo o saldo devedor principal, acrescido de todos os encargos moratórios, custas processuais e honorários advocatícios.`,
        `3.4. A eventual tolerância à infringência de qualquer das cláusulas deste instrumento ou o não exercício de qualquer direito nele previsto constituirá mera liberalidade da CREDORA, não implicando em novação ou transação de qualquer espécie.`,
        `3.5. As partes concordam que o valor solicitado está vinculado exclusivamente à prestação do serviço/trabalho. Com o término deste, as parcelas restantes serão automaticamente consideradas vencidas.`
    ];
    inad.forEach(c => {
        checkPage(15);
        let s = doc.splitTextToSize(c, contentWidth);
        doc.text(s, marginLeft, y);
        y += s.length * 4.5 + 3;
    });

    checkPage(20);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA QUARTA – DA QUITAÇÃO ANTECIPADA", marginLeft, y); y += 6;
    doc.setFont("helvetica", "normal");
    let sc4 = doc.splitTextToSize("4.1. O(A) DEVEDOR(A) poderá solicitar a quitação antecipada total ou parcial do empréstimo a qualquer momento, mediante o pagamento do saldo devedor atualizado.", contentWidth);
    doc.text(sc4, marginLeft, y); y += sc4.length * 4.5 + 4;

    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.text("CLÁUSULA QUINTA – DAS DISPOSIÇÕES GERAIS", marginLeft, y); y += 6;
    doc.setFont("helvetica", "normal");
    const disp = [
        "5.1. As partes declaram ter lido e compreendido todas as cláusulas e condições deste Termo, concordando com o seu teor.",
        "5.2. Fica eleito o foro da comarca da sede da Mar Brasil para dirimir quaisquer dúvidas ou litígios decorrentes deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.",
        "E, por estarem assim justos e contratados, as partes assinam o presente Termo em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo."
    ];
    disp.forEach(c => {
        checkPage(15);
        let s = doc.splitTextToSize(c, contentWidth);
        doc.text(s, marginLeft, y);
        y += s.length * 4.5 + 3;
    });

    y += 10;
    checkPage(50);
    doc.text(`Praia Grande - SP, ${dataFormatada}`, marginLeft, y);
    y += 20;

    checkPage(60);
    doc.setFont("helvetica", "bold");
    doc.text(nomeOuRazao.toUpperCase(), marginLeft, y);
    doc.setFont("helvetica", "normal");
    let devDoc = isPJ ? `CNPJ: ${cpfOuCnpj}` : `CPF: ${cpfOuCnpj}`;
    doc.text(devDoc, marginLeft, y + 4);
    let responsibleOffset = 8;
    if (isPJ) {
        doc.text(`Responsável: ${nomeResp}`, marginLeft, y + responsibleOffset);
        responsibleOffset += 4;
    }
    doc.text("DEVEDOR(A)", marginLeft, y + responsibleOffset);

    // Credora column
    doc.setFont("helvetica", "bold");
    doc.text("MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA", marginLeft + 90, y);
    doc.setFont("helvetica", "normal");
    doc.text("CNPJ: 02.233.923/0001-19", marginLeft + 90, y + 4);
    doc.text("Responsável: Priscilla Coelho Monteiro", marginLeft + 90, y + 8);
    doc.text("CREDORA", marginLeft + 90, y + 12);

    y += 30; // Mais espaço para as testemunhas
    doc.setFont("helvetica", "bold");
    doc.text("TESTEMUNHAS:", marginLeft, y); y += 12;
    doc.setFont("helvetica", "normal");
    doc.text("Nome: _________________________________________   CPF: ___________________", marginLeft, y); y += 12;
    doc.text("Nome: _________________________________________   CPF: ___________________", marginLeft, y); y += 8;

    doc.save(`Termo_Confissao_Divida_${emp.full_name.replace(/\s+/g, '_')}_${dataContrato}.pdf`);
    bootstrap.Modal.getInstance(document.getElementById('modalTermo'))?.hide();
};

// ─── PDF EXPORT LOANS SUMMARY ─────────────────────────────────────────────────
window.exportLoansPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.setTextColor(242, 145, 27);
    doc.text("RELATÓRIO CONSOLIDADO DE EMPRÉSTIMOS", 15, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()} | PeopleBoard v28.00`, 15, 26);

    const now = new Date();
    const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const data = allEmployees
        .filter(emp => emp._loans.length > 0)
        .map(emp => [
            emp.full_name,
            emp.company || '---',
            Number(calculateTaken(emp)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            emp._loans.length + ' op.',
            Number(calculateDebt(emp)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            Number(getInstallmentForMonth(emp, mStr)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            calculateDebt(emp) > 0 ? 'ATIVO' : 'QUITADO'
        ]);

    doc.autoTable({
        startY: 32,
        head: [['COLABORADOR', 'EMPRESA', 'TOMADO', 'OPS', 'SALDO DEVEDOR', 'PARCELA MÊS', 'STATUS']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] }
    });
    doc.save(`Relatorio_Emprestimos_${Date.now()}.pdf`);
};

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
function setupLayout() {
    document.getElementById('sidebarToggle')?.addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('mainContent').classList.toggle('expanded');
        const icon = this.querySelector('i');
        icon.classList.toggle('bi-chevron-left');
        icon.classList.toggle('bi-chevron-right');
    });
}

window.clearFilters = function () {
    ['filterCompany', 'filterType', 'filterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderDashboard();
};
