// Dashboard de Empréstimos - PeopleBoard v27.80
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const db = supabaseClient;

let allEmployees = [];

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupLayout();
});

async function init() {
    await fetchEmployees();
    renderDashboard();
}

async function fetchEmployees() {
    const { data, error } = await db
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) { console.error('Error fetching employees:', error); return; }
    allEmployees = data || [];
}

function renderDashboard() {
    const filterCompany = document.getElementById('filterCompany')?.value || '';
    const filterType = document.getElementById('filterType')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';

    const filtered = allEmployees.filter(emp => {
        const matchCompany = !filterCompany || emp.company === filterCompany;
        const matchType = !filterType || emp.employment_type === filterType;
        const hasLoan = (emp.loan_amount > 0) || (emp.loans_data && emp.loans_data.length > 0);

        // Filtro por status do empréstimo
        if (filterStatus) {
            const debt = calculateDebt(emp);
            if (filterStatus === 'ativo' && debt <= 0) return false;
            if (filterStatus === 'quitado' && debt > 0) return false;
        }

        return matchCompany && matchType && hasLoan;
    });

    updateCounters(filtered);
    renderProjection(filtered);
    renderDetailedTable(filtered);
}

function formatCurrency(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function updateCounters(filtered) {
    let totalLent = 0;
    let outstandingBalance = 0;
    let monthlyReceivable = 0;
    let activeContracts = 0;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    filtered.forEach(emp => {
        const debt = calculateDebt(emp);
        const lent = (emp.loan_amount || 0) + (emp.loans_data ? emp.loans_data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0);

        totalLent += lent;
        outstandingBalance += debt;

        if (debt > 0) activeContracts++;

        // Calcular parcela do mês atual
        monthlyReceivable += getInstallmentForMonth(emp, currentMonthStr);
    });

    document.getElementById('cardTotalLent').textContent = formatCurrency(totalLent);
    document.getElementById('cardOutstandingBalance').textContent = formatCurrency(outstandingBalance);
    document.getElementById('cardMonthlyReceivable').textContent = formatCurrency(monthlyReceivable);
    document.getElementById('cardActiveContracts').textContent = activeContracts;
    document.getElementById('totalItemsCount').textContent = filtered.length;
}

function calculateDebt(emp) {
    let totalPaid = 0;
    const calcPaidForOne = (amount, inst, startCycle) => {
        if (!amount || !inst || !startCycle) return 0;
        const start = new Date(startCycle + '-01');
        const now = new Date();
        let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < 10) elapsed--;
        elapsed = Math.max(0, Math.min(elapsed, inst));
        return elapsed * (amount / inst);
    };

    totalPaid += calcPaidForOne(emp.loan_amount, emp.loan_installments, emp.loan_start_cycle);
    if (emp.loans_data && Array.isArray(emp.loans_data)) {
        emp.loans_data.forEach(ln => {
            totalPaid += calcPaidForOne(ln.amount, ln.installments, ln.start_cycle);
        });
    }

    const totalAmount = (emp.loan_amount || 0) + (emp.loans_data ? emp.loans_data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0);
    return Math.max(0, totalAmount - totalPaid);
}

function getInstallmentForMonth(emp, monthStr) {
    let total = 0;

    // Converte "YYYY-MM" para número de meses absoluto (ex: 2026-01 = 2026*12+1 = 24313)
    const toAbsoluteMonth = (ym) => {
        if (!ym) return 0;
        const [y, m] = ym.split('-').map(Number);
        return y * 12 + m;
    };

    const targetMonth = toAbsoluteMonth(monthStr);

    const checkInstallment = (amount, inst, startCycle) => {
        if (!amount || !inst || !startCycle) return 0;

        const startMonth = toAbsoluteMonth(startCycle);
        const endMonth = startMonth + inst - 1; // Última parcela

        if (targetMonth >= startMonth && targetMonth <= endMonth) {
            return amount / inst;
        }
        return 0;
    };

    total += checkInstallment(emp.loan_amount, emp.loan_installments, emp.loan_start_cycle);
    if (emp.loans_data && Array.isArray(emp.loans_data)) {
        emp.loans_data.forEach(ln => {
            total += checkInstallment(ln.amount, ln.installments, ln.start_cycle);
        });
    }
    return total;
}

function renderProjection(filtered) {
    const list = [];
    const now = new Date();
    const headers = ['COLABORADOR'];
    const months = [];

    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase() + '/' + String(d.getFullYear()).substring(2);
        months.push(mStr);
        headers.push(label);
    }

    // Header
    const headerRow = document.getElementById('projectionHeader');
    headerRow.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    // Body
    const body = document.getElementById('projectionBody');
    body.innerHTML = '';

    const totalsPerMonth = new Array(12).fill(0);

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        let html = `<td class="fw-bold border-end bg-light">${emp.full_name}</td>`;

        months.forEach((mStr, idx) => {
            const val = getInstallmentForMonth(emp, mStr);
            totalsPerMonth[idx] += val;
            html += `<td class="month-col ${val > 0 ? 'text-primary' : 'text-muted opacity-25'}" style="font-size: 0.75rem;">${val > 0 ? formatCurrency(val) : '---'}</td>`;
        });

        tr.innerHTML = html;
        body.appendChild(tr);
    });

    // Footer
    const footer = document.getElementById('projectionFooter');
    footer.innerHTML = `
        <tr class="fw-bold">
            <td class="bg-dark text-warning">TOTAL MENSAL</td>
            ${totalsPerMonth.map(v => `<td class="text-warning text-center">${formatCurrency(v)}</td>`).join('')}
        </tr>
    `;
}

function renderDetailedTable(filtered) {
    const body = document.getElementById('detailedLoanBody');
    body.innerHTML = '';

    filtered.forEach((emp, idx) => {
        const tr = document.createElement('tr');
        const debt = calculateDebt(emp);
        const totalLent = (emp.loan_amount || 0) + (emp.loans_data ? emp.loans_data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0);
        const currentInstallment = getInstallmentForMonth(emp, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

        // Verifica se tem múltiplos empréstimos
        const hasMultiple = (emp.loan_amount > 0 && emp.loans_data && emp.loans_data.length > 0) || (emp.loans_data && emp.loans_data.length > 1);
        const rowId = `detail-${idx}`;

        tr.className = debt > 0 ? 'active-row' : 'closed-row';
        tr.innerHTML = `
            <td class="ps-2">
                ${hasMultiple ? `<button class="btn btn-xs btn-outline-warning p-0 px-1 me-2" onclick="toggleLoanDetail('${rowId}')" title="Expandir"><i class="bi bi-plus-circle" id="icon-${rowId}"></i></button>` : '<span style="width:28px;display:inline-block;"></span>'}
                <span class="fw-bold">${emp.full_name}</span>
                <div class="small text-muted ps-4">${emp.job_role || '---'}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${emp.company || '---'}</span></td>
            <td>${emp.employment_type || '---'}</td>
            <td class="font-monospace fw-bold">${formatCurrency(totalLent)}</td>
            <td class="font-monospace text-danger">${formatCurrency(debt)}</td>
            <td class="font-monospace text-primary">${formatCurrency(currentInstallment)}</td>
            <td>${emp.loan_installments || '---'}x</td>
            <td><span class="badge ${debt > 0 ? 'bg-success' : 'bg-secondary'}">${debt > 0 ? 'ATIVO' : 'QUITADO'}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary p-1 px-2" title="Abrir Perfil" onclick="window.location.href='people.html?id=${emp.id}'">
                    <i class="bi bi-person-fill"></i>
                </button>
            </td>
        `;
        body.appendChild(tr);

        // Linha de detalhamento (oculta por padrão)
        if (hasMultiple || emp.loan_amount > 0) {
            const detailRow = document.createElement('tr');
            detailRow.id = rowId;
            detailRow.style.display = 'none';
            detailRow.className = 'bg-dark';

            let detailHTML = '<td colspan="9" class="ps-5 py-2"><div class="row g-2">';

            // Empréstimo Principal
            if (emp.loan_amount > 0) {
                detailHTML += `
                    <div class="col-auto">
                        <div class="border border-warning rounded p-2 bg-dark-subtle" style="min-width:200px;">
                            <div class="small text-warning fw-bold mb-1"><i class="bi bi-star-fill me-1"></i>PRINCIPAL</div>
                            <div class="small">Valor: <span class="text-white fw-bold">${formatCurrency(emp.loan_amount)}</span></div>
                            <div class="small">Parcelas: <span class="text-white">${emp.loan_installments}x</span></div>
                            <div class="small">Início: <span class="text-white">${emp.loan_start_cycle || '---'}</span></div>
                        </div>
                    </div>
                `;
            }

            // Empréstimos Diversos
            if (emp.loans_data && emp.loans_data.length > 0) {
                emp.loans_data.forEach((ln, i) => {
                    detailHTML += `
                        <div class="col-auto">
                            <div class="border border-secondary rounded p-2 bg-dark-subtle" style="min-width:200px;">
                                <div class="small text-muted fw-bold mb-1"><i class="bi bi-cash me-1"></i>ADICIONAL #${i + 1}</div>
                                <div class="small">Valor: <span class="text-white fw-bold">${formatCurrency(ln.amount)}</span></div>
                                <div class="small">Parcelas: <span class="text-white">${ln.installments}x</span></div>
                                <div class="small">Início: <span class="text-white">${ln.start_cycle || '---'}</span></div>
                            </div>
                        </div>
                    `;
                });
            }

            detailHTML += '</div></td>';
            detailRow.innerHTML = detailHTML;
            body.appendChild(detailRow);
        }
    });
}

window.toggleLoanDetail = function (rowId) {
    const row = document.getElementById(rowId);
    const icon = document.getElementById('icon-' + rowId);
    if (row) {
        const isHidden = row.style.display === 'none';
        row.style.display = isHidden ? 'table-row' : 'none';
        if (icon) {
            icon.className = isHidden ? 'bi bi-dash-circle' : 'bi bi-plus-circle';
        }
    }
};

function setupLayout() {
    const btnClose = document.getElementById('sidebarToggleClose');
    const btnOpen = document.getElementById('sidebarToggleOpen');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');

    if (btnClose) btnClose.onclick = () => { sidebar.classList.add('collapsed'); main.classList.add('expanded'); };
    if (btnOpen) btnOpen.onclick = () => { sidebar.classList.remove('collapsed'); main.classList.remove('expanded'); };
}

window.exportLoansPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(20);
    doc.setTextColor(242, 145, 27);
    doc.text("RELATÓRIO CONSOLIDADO DE EMPRÉSTIMOS", 15, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()} | PeopleBoard v27.80`, 15, 25);

    const data = allEmployees
        .filter(emp => (emp.loan_amount > 0) || (emp.loans_data && emp.loans_data.length > 0))
        .map(emp => [
            emp.full_name,
            emp.company,
            formatCurrency(emp.loan_amount),
            emp.loan_installments + 'x',
            formatCurrency(calculateDebt(emp)),
            emp.status
        ]);

    doc.autoTable({
        startY: 35,
        head: [['COLABORADOR', 'EMPRESA', 'TOTAL', 'PARC.', 'SALDO', 'STATUS']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save(`Relatorio_Emprestimos_${Date.now()}.pdf`);
};
