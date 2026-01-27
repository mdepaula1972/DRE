// PeopleBoard JS - CSI MAR BRASIL
const SUPABASE_URL = "https://ngtjhwswbbivqajtpjvg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const db = supabaseClient;

let allEmployees = [];
let isPrivacyActive = true;
let empModal, exportModal, additiveModalObj;
let currentProfileId = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
    setupFilters();
    setupLayout();
    empModal = new bootstrap.Modal(document.getElementById('employeeModal'));
    setupPrivacy();
    console.log("PeopleBoard v27.70 (Blindado) carregado.");

    const btnAdd = document.getElementById('btnAddEmployee');
    if (btnAdd) {
        btnAdd.onclick = () => {
            resetForm();
            document.getElementById('modalTitle').textContent = 'REGISTRO DE PESSOAL';
            empModal.show();
        };
    }
});

function setupPrivacy() {
    const btns = [document.getElementById('btnPrivacy'), document.getElementById('btnPrivacyProfile')];
    btns.forEach(btn => {
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) icon.className = isPrivacyActive ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
        btn.classList.toggle('btn-warning', isPrivacyActive);
        btn.classList.toggle('btn-outline-secondary', !isPrivacyActive && btn.id === 'btnPrivacy');
        btn.classList.toggle('btn-outline-warning', !isPrivacyActive && btn.id === 'btnPrivacyProfile');

        btn.onclick = () => {
            isPrivacyActive = !isPrivacyActive;
            setupPrivacy(); // Recursivo simples para atualizar todos os botões
            renderList();

            const overlay = document.getElementById('profileOverlay');
            if (currentProfileId && overlay && overlay.style.display === 'flex') {
                openProfile(currentProfileId);
            }
        };
    });
}

window.getPageContext = function () {
    const currentEmp = currentProfileId ? allEmployees.find(e => e.id === currentProfileId) : null;
    return {
        pageName: "PeopleBoard (Gestão de Pessoal)",
        totalEmployees: allEmployees.length,
        currentView: currentEmp ? "Perfil Individual" : "Lista Geral",
        activeEmployee: currentEmp ? {
            nome: currentEmp.full_name,
            cargo: currentEmp.job_role,
            setor: currentEmp.department,
            vínculo: currentEmp.employment_type,
            salário: isPrivacyActive ? "OCULTO" : formatCurrency(currentEmp.remuneration),
            empresa: currentEmp.company,
            status: currentEmp.status,
            admissão: formatDate(currentEmp.start_date),
            consignável: isPrivacyActive ? "OCULTO" : formatCurrency((currentEmp.remuneration || 0) - calculateDebt(currentEmp))
        } : null,
        employeesSummary: allEmployees.map(e => ({
            n: e.full_name,
            s: e.department,
            c: e.job_role,
            st: e.status
        })),
        instructions: "Você é a BrisinhAI. Analise os dados do PeopleBoard. Seja direto e executivo."
    };
};

function setupLayout() {
    const btnClose = document.getElementById('sidebarToggleClose');
    const btnOpen = document.getElementById('sidebarToggleOpen');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('mainContent');

    if (btnClose) {
        btnClose.onclick = () => {
            sidebar.classList.add('collapsed');
            main.classList.add('expanded');
        };
    }
    if (btnOpen) {
        btnOpen.onclick = () => {
            sidebar.classList.remove('collapsed');
            main.classList.remove('expanded');
        };
    }

    const btnClear = document.getElementById('btnClearFilters');
    if (btnClear) {
        btnClear.onclick = () => {
            document.getElementById('filterName').value = '';
            document.getElementById('filterCompany').value = '';
            document.getElementById('filterType').value = '';
            document.getElementById('filterStatus').value = '';
            document.getElementById('filterDept').value = '';
            document.getElementById('filterRole').value = '';
            document.getElementById('filterFinancial').value = '';
            renderList();
        };
    }
}

// Helpers para evitar crashes de DOM
function safeVal(id, def = '') {
    const el = document.getElementById(id);
    return el ? el.value : def;
}
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined ? val : '';
}

async function init() {
    await fetchEmployees();
    updateDeptFilter();
    updateRoleFilter();
    renderList();
}

async function fetchEmployees() {
    const { data: employees, error: eError } = await db
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });

    if (eError) { console.error('Error fetching employees:', eError); return; }

    console.log(`[DEBUG] Colaboradores carregados do Banco: ${employees.length}`);
    console.table(employees.map(e => ({ id: e.id, nome: e.full_name, status: e.status })));

    const { data: history, error: hError } = await db
        .from('employee_history')
        .select('employee_id');

    const idsWithAdditive = new Set((history || []).map(h => h.employee_id));

    allEmployees = employees.map(emp => ({
        ...emp,
        has_additive: idsWithAdditive.has(emp.id)
    }));
}

function updateDeptFilter() {
    const depts = [...new Set(allEmployees.map(e => e.department).filter(Boolean))].sort();
    const select = document.getElementById('filterDept');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
    });
    select.value = current;
}

function updateRoleFilter() {
    const roles = [...new Set(allEmployees.map(e => e.job_role).filter(Boolean))].sort();
    const select = document.getElementById('filterRole');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>';
    roles.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        select.appendChild(opt);
    });
    select.value = current;
}

// --- EXPORTAÇÃO PDF PREMIUM ---
window.showExportOptions = function () {
    if (!exportModal) exportModal = new bootstrap.Modal(document.getElementById('exportOptionsModal'));
    exportModal.show();
};

window.exportPDF = async function (mode) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const logoUrl = 'Mar-Brasil-sem-fundo-preto.png';

    try {
        doc.addImage(logoUrl, 'PNG', 15, 10, 40, 15);
    } catch (e) { console.warn("Logo não encontrado"); }

    doc.setFontSize(22);
    doc.setTextColor(242, 145, 27);
    doc.text("RELATÓRIO DE PESSOAL", 60, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString()} | Versão: ${window.APP_VERSION || 'v27.x'}`, 60, 25);

    if (mode === 'list') {
        const selectedFields = Array.from(document.querySelectorAll('.export-field:checked')).map(cb => cb.value);
        if (selectedFields.length === 0) { alert("Selecione ao menos um campo."); return; }

        const headers = selectedFields.map(f => f.toUpperCase());
        const tableBody = allEmployees.map(emp => {
            return selectedFields.map(field => {
                if (field === 'NOME') return emp.full_name;
                if (field === 'VÍNCULO') return emp.employment_type;
                if (field === 'SETOR') return emp.department;
                if (field === 'FUNÇÃO') return emp.job_role;
                if (field === 'SALÁRIO') return isPrivacyActive ? "•••" : formatCurrency(emp.remuneration);
                if (field === 'STATUS') return emp.status;
                if (field === 'INÍCIO') return formatDate(emp.start_date);
                if (field === 'DOC') return emp.document_id;
                if (field === 'ESCOLARIDADE') return (emp.education_data || []).map(e => e.level).join(", ") || '---';
                if (field === 'FILHOS') return (emp.children_data || []).map(c => c.name).join(", ") || '---';
                if (field === 'ADITIVOS') return emp.has_additive ? 'SIM' : 'NÃO';
                if (field === 'EMPRESA') return emp.company || '---';
                return '---';
            });
        });

        doc.autoTable({
            startY: 35,
            head: [headers],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] },
            styles: { fontSize: 8 }
        });
    } else {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("ANÁLISE ESTRATÉGICA BRISINHAI", 15, 40);

        doc.setFontSize(10);
        const analysis = await window.getBrisinhAIAnalysis();
        const splitText = doc.splitTextToSize(analysis, 260);

        let cursorY = 50;
        splitText.forEach(line => {
            if (cursorY > 185) { doc.addPage(); cursorY = 20; }
            doc.text(line, 15, cursorY);
            cursorY += 6;
        });
    }

    doc.save(`PeopleBoard_Export_${mode}_${Date.now()}.pdf`);
    if (exportModal) exportModal.hide();
};

// --- ADITIVOS ---
window.newAdditive = function () {
    const modalEl = document.getElementById('additiveModal');
    if (!additiveModalObj) additiveModalObj = new bootstrap.Modal(modalEl);
    document.getElementById('adtDate').value = new Date().toISOString().split('T')[0];
    toggleAdditiveFields();
    additiveModalObj.show();
};

window.toggleAdditiveFields = function () {
    const type = document.getElementById('adtType').value;
    const container = document.getElementById('adtFields');
    const emp = allEmployees.find(e => e.id === currentProfileId);
    let html = '';

    if (type === 'Cargo') {
        html = `<label class="small">Alterar de: <b>${emp.job_role || 'NI'}</b> para:</label>
                <input type="text" id="adtNewValue" class="form-control" value="${emp.job_role || ''}">`;
    } else if (type === 'Setor') {
        html = `<label class="small">Alterar de: <b>${emp.department || 'NI'}</b> para:</label>
                <input type="text" id="adtNewValue" class="form-control" value="${emp.department || ''}">`;
    } else if (type === 'Remuneração') {
        html = `<label class="small">Alterar de: <b>${formatCurrency(emp.remuneration)}</b> para:</label>
                <input type="number" id="adtNewValue" class="form-control" step="0.01" value="${emp.remuneration || 0}">`;
    } else {
        html = `<label class="small">Descreva a Alteração</label>
                <input type="text" id="adtNewValue" class="form-control">`;
    }
    container.innerHTML = html;
};

window.saveAdditive = async function () {
    const type = document.getElementById('adtType').value;
    const date = document.getElementById('adtDate').value;
    const newValue = document.getElementById('adtNewValue').value;
    const note = document.getElementById('adtNote').value;
    const emp = allEmployees.find(e => e.id === currentProfileId);

    if (!date || !newValue) { alert("Preencha a data e o novo valor."); return; }

    let oldValue = '';
    if (type === 'Cargo') oldValue = emp.job_role || 'Não Informado';
    if (type === 'Setor') oldValue = emp.department || 'Não Informado';
    if (type === 'Remuneração') oldValue = formatCurrency(emp.remuneration);

    const historyPayload = {
        employee_id: currentProfileId,
        change_date: date,
        event_type: `Aditivo: ${type}`,
        old_salary: type === 'Remuneração' ? emp.remuneration : null,
        new_salary: type === 'Remuneração' ? parseFloat(newValue) : null,
        old_role: type === 'Cargo' ? emp.job_role : (type === 'Setor' ? emp.department : null),
        new_role: (type === 'Cargo' || type === 'Setor') ? newValue : null,
        observations: `[OLD:${oldValue}] [NEW:${type === 'Remuneração' ? formatCurrency(newValue) : newValue}] ${note}`
    };

    const { error: hError } = await db.from('employee_history').insert([historyPayload]);
    if (hError) { alert(hError.message); return; }

    const updatePayload = {};
    if (type === 'Cargo') updatePayload.job_role = newValue;
    if (type === 'Setor') updatePayload.department = newValue;
    if (type === 'Remuneração') updatePayload.remuneration = parseFloat(newValue);

    if (Object.keys(updatePayload).length > 0) {
        await db.from('employees').update(updatePayload).eq('id', currentProfileId);
    }

    if (additiveModalObj) additiveModalObj.hide();
    setTimeout(async () => { await init(); openProfile(currentProfileId); }, 300);
};

// --- CORE ---
function renderList() {
    const list = document.getElementById('employeesList');
    if (!list) return;
    list.innerHTML = '';

    const searchTerm = (document.getElementById('filterName').value || '').toLowerCase();
    const company = document.getElementById('filterCompany').value;
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    const dept = document.getElementById('filterDept').value;
    const role = document.getElementById('filterRole').value;

    const financialView = document.getElementById('filterFinancial').value;

    const filtered = allEmployees.filter(e => {
        const matchesName = (e.full_name || '').toLowerCase().includes(searchTerm) || (e.document_id && e.document_id.includes(searchTerm));
        const matchesCompany = !company || e.company === company;
        const matchesType = !type || e.employment_type === type;
        const matchesStatus = !status || e.status === status;
        const matchesDept = !dept || e.department === dept;
        const matchesRole = !role || e.job_role === role;

        let matchesFinancial = true;
        if (financialView === 'loans') matchesFinancial = (e.loan_amount > 0);
        if (financialView === 'additives') matchesFinancial = e.has_additive;

        return matchesName && matchesCompany && matchesType && matchesStatus && matchesDept && matchesRole && matchesFinancial;
    });

    filtered.forEach(emp => {
        const tr = document.createElement('tr');
        tr.className = 'people-item';
        tr.onclick = (e) => { if (!e.target.closest('button')) openProfile(emp.id); };

        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center">
                    <img src="${emp.photo_url || 'https://via.placeholder.com/40'}" class="rounded-circle me-3" style="width:32px; height:32px; object-fit:cover;">
                    <div>
                        <div class="fw-bold text-dark">${emp.full_name}</div>
                        <div class="small text-muted">${emp.document_id || 'Sem Doc'}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${emp.employment_type}</span></td>
            <td class="small font-monospace ${isPrivacyActive ? 'privacy-text' : ''}">${emp.pix_key || '---'}</td>
            <td class="small">${formatDate(emp.start_date)}</td>
            <td>
                <div class="small fw-bold text-dark">${emp.department || '---'}</div>
                <div class="small text-muted">${emp.job_role || '---'}</div>
            </td>
            <td class="fw-bold font-monospace ${isPrivacyActive ? 'privacy-text' : ''}">${formatCurrency(emp.remuneration)}</td>
            <td class="text-info font-monospace small ${isPrivacyActive ? 'privacy-text' : ''}">${formatCurrency((emp.remuneration || 0) - calculateDebt(emp))}</td>
            <td class="text-warning font-monospace small ${isPrivacyActive ? 'privacy-text' : ''}">${formatCurrency(calculateDebt(emp))}</td>
            <td><span class="badge ${getStatusBadgeClass(emp.status)}">${(emp.status || 'Ativo').toUpperCase()}</span></td>
            <td class="text-center">${emp.has_additive ? '<span class="badge bg-info text-white">A</span>' : '---'}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning" onclick="event.stopPropagation(); editEmployeeDirect('${emp.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        `;
        list.appendChild(tr);
    });
}

function setupFilters() {
    ['filterName', 'filterCompany', 'filterType', 'filterStatus', 'filterDept', 'filterRole', 'filterFinancial'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = renderList;
    });
}

// --- CURD & UTIL ---
window.saveEmployee = async function () {
    console.log(">>> [DEBUG] Iniciando saveEmployee...");
    const id = safeVal('empId');
    const payload = {
        full_name: safeVal('empName'),
        company: safeVal('empCompany', 'DZM'),
        employment_type: safeVal('empType', 'CLT'),
        pj_type: safeVal('empPJType', 'MEI'),
        corporate_name: safeVal('empCorporateName'),
        document_id: safeVal('empDoc'),
        phone: safeVal('empPhone'),
        email: safeVal('empEmail'),
        pix_key: safeVal('empPix'),
        zip_code: safeVal('empZip'),
        street: safeVal('empStreet'),
        number: safeVal('empNumber'),
        complement: safeVal('empComplement'),
        neighborhood: safeVal('empNeighborhood'),
        city: safeVal('empCity'),
        state: safeVal('empState'),
        remuneration: parseFloat(safeVal('empRemuneration')) || 0,
        department: safeVal('empDept'),
        job_role: safeVal('empRole'),
        linkedin_url: safeVal('empLinkedin'),
        instagram_url: safeVal('empInstagram'),
        start_date: safeVal('empStart') || null,
        photo_url: safeVal('empPhotoBase64') || null,
        responsible_name: safeVal('empResponsible'),
        responsible_cpf: safeVal('empResponsibleCPF'),
        responsible_rg: safeVal('empResponsibleRG'),
        status: safeVal('empStatus', 'Ativo'),
        status_start_date: safeVal('empStatusStart') || null,
        status_end_date: safeVal('empStatusEnd') || null,
        emergency_contact_name: safeVal('empEmergencyName'),
        emergency_contact_phone: safeVal('empEmergencyPhone'),
        emergency_contact_relation: safeVal('empEmergencyRelation'),
        gender: safeVal('empGender', 'M'),
        marital_status: safeVal('empMaritalStatus', 'Solteiro'),
        children_data: Array.from(document.querySelectorAll('#childrenContainer .d-flex')).map(row => ({
            name: row.querySelector('.child-name').value, dob: row.querySelector('.child-dob').value
        })).filter(c => c.name),
        education_data: Array.from(document.querySelectorAll('#educationContainer .d-flex')).map(row => ({
            level: row.querySelector('.edu-level').value, area: row.querySelector('.edu-area').value
        })).filter(e => e.area),
        loan_amount: parseFloat(safeVal('loanAmount')) || 0,
        loan_installments: parseInt(safeVal('loanInstallments')) || 0,
        loan_start_cycle: safeVal('loanStartCycle') || null,
        loan_request_date: safeVal('loanRequestDate') || null,
        loans_data: Array.from(document.querySelectorAll('#loansList .loan-row')).map(row => ({
            amount: parseFloat(row.querySelector('.ln-amount').value) || 0,
            installments: parseInt(row.querySelector('.ln-inst').value) || 0,
            start_cycle: row.querySelector('.ln-cycle').value,
            request_date: row.querySelector('.ln-request')?.value || null
        })).filter(l => l.amount > 0),
        active: (safeVal('empStatus') === 'Ativo')
    };

    console.log(">>> [PAYLOAD]", payload);

    try {
        const query = id ? db.from('employees').update(payload).eq('id', id) : db.from('employees').insert([payload]);
        console.log(">>> [DB_REQUEST] Enviando para o Supabase...");

        const result = await query;
        console.log(">>> [DB_RESPONSE]", result);

        if (result.error) {
            console.error(">>> [DB_ERROR]", result.error);
            alert(`ERRO AO SALVAR: ${result.error.message}`);
        }
        else {
            console.log(">>> [SUCCESS] Registro salvo com sucesso!");
            empModal.hide();
            await init();
            alert("✅ Registro salvo com sucesso!");
        }
    } catch (e) {
        console.error(">>> [CRITICAL_ERROR]", e);
        alert("Erro fatal ao salvar. Verifique o console do navegador.");
    }
}

window.editEmployee = function () {
    const id = safeVal('empId') || currentProfileId;
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    setVal('empId', emp.id);
    setVal('empName', emp.full_name);
    setVal('empCompany', emp.company);
    setVal('empType', emp.employment_type);
    setVal('empPJType', emp.pj_type);
    setVal('empCorporateName', emp.corporate_name);
    setVal('empDoc', emp.document_id);
    setVal('empPhone', emp.phone);
    setVal('empEmail', emp.email);
    setVal('empPix', emp.pix_key);
    setVal('empZip', emp.zip_code);
    setVal('empStreet', emp.street);
    setVal('empNumber', emp.number);
    setVal('empComplement', emp.complement);
    setVal('empNeighborhood', emp.neighborhood);
    setVal('empCity', emp.city);
    setVal('empState', emp.state);
    setVal('empRemuneration', emp.remuneration);
    setVal('empDept', emp.department);
    setVal('empRole', emp.job_role);
    setVal('empLinkedin', emp.linkedin_url);
    setVal('empInstagram', emp.instagram_url);
    setVal('empStart', emp.start_date);
    setVal('empPhotoBase64', emp.photo_url);

    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview) photoPreview.innerHTML = emp.photo_url ? 'Foto carregada' : 'Sem foto';

    setVal('empResponsible', emp.responsible_name);
    setVal('empStatus', emp.status);
    setVal('empStatusStart', emp.status_start_date);
    setVal('empStatusEnd', emp.status_end_date);
    setVal('empEmergencyName', emp.emergency_contact_name);
    setVal('empEmergencyPhone', emp.emergency_contact_phone);
    setVal('empEmergencyRelation', emp.emergency_contact_relation);
    setVal('empGender', emp.gender);
    setVal('empMaritalStatus', emp.marital_status);
    setVal('empRG', emp.document_rg);
    setVal('empResponsibleCPF', emp.responsible_cpf);
    setVal('empResponsibleRG', emp.responsible_rg);

    const childrenContainer = document.getElementById('childrenContainer');
    if (childrenContainer) {
        childrenContainer.innerHTML = '';
        if (emp.children_data) emp.children_data.forEach(c => addChildRow(c.name, c.dob));
    }

    const educationContainer = document.getElementById('educationContainer');
    if (educationContainer) {
        educationContainer.innerHTML = '';
        if (emp.education_data) emp.education_data.forEach(e => addEducationRow(e.level, e.area));
    }

    setVal('loanAmount', emp.loan_amount);
    setVal('loanInstallments', emp.loan_installments);
    setVal('loanStartCycle', emp.loan_start_cycle);
    setVal('loanRequestDate', emp.loan_request_date);

    const loansList = document.getElementById('loansList');
    if (loansList) {
        loansList.innerHTML = '';
        if (emp.loans_data && Array.isArray(emp.loans_data)) {
            emp.loans_data.forEach(ln => addLoanRow(ln.amount, ln.installments, ln.start_cycle, ln.request_date));
            if (emp.loans_data.length > 0) document.getElementById('loansContainer').style.display = 'block';
        }
    }

    togglePJFields();
    toggleStatusDates();

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'EDITAR CADASTRO :: ' + (emp.full_name || '').toUpperCase();

    if (document.getElementById('profileOverlay').style.display !== 'none') closeProfile();
    empModal.show();
}

async function openProfile(id) {
    currentProfileId = id;
    const emp = allEmployees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('profileOverlay').style.display = 'flex';
    scrambleText('profileName', emp.full_name || 'NI-NOME');
    scrambleText('profileID', (emp.id || '---').substring(0, 8).toUpperCase());

    setTimeout(() => {
        scrambleText('profileCompany', emp.company || '---');
        scrambleText('profileType', emp.employment_type || '---');
        scrambleText('profileDept', emp.department || '---');
        scrambleText('profileRole', emp.job_role || '---');
        scrambleText('profileEmail', emp.email || '---');
        scrambleText('profileStart', formatDate(emp.start_date));
        scrambleText('profileRemuneration', isPrivacyActive ? 'R$ ••••••' : formatCurrency(emp.remuneration));
        scrambleText('profileDoc', isPrivacyActive ? '•••.•••.•••-••' : (emp.document_id || '---'));
        scrambleText('profileStatus', (emp.status || 'Ativo').toUpperCase());

        const debt = calculateDebt(emp);
        scrambleText('profileConsignable', isPrivacyActive ? 'R$ •••' : formatCurrency((emp.remuneration || 0) - debt));
        scrambleText('profileDebtBalance', isPrivacyActive ? 'R$ •••' : formatCurrency(debt));
    }, 200);

    document.getElementById('profilePhoto').src = emp.photo_url || 'https://via.placeholder.com/350?text=NO+IMAGE';
    document.getElementById('profileCreated').textContent = "CRIADO: " + formatDate(emp.created_at);
    document.getElementById('empId').value = id;

    const pjSection = document.getElementById('profilePJSection');
    if (emp.employment_type === 'PJ') {
        pjSection.style.display = 'block';
        scrambleText('profileCorporate', `${emp.corporate_name || '-'} (${emp.pj_type})`);
    } else { pjSection.style.display = 'none'; }
    scrambleText('profileResponsible', emp.responsible_name || 'NI-RESPONSAVEL');

    const { data: history } = await db.from('employee_history').select('*').eq('employee_id', id).order('change_date', { ascending: false });
    renderHistory(history, genExtraInfo(emp));
}

function genExtraInfo(emp) {
    return `
        <div class="row mt-3 g-3">
            <div class="col-md-6">
                <div class="data-row"><span class="label">TELEFONE</span><span class="value">${emp.phone || '---'}</span></div>
                <div class="data-row"><span class="label">PIX</span><span class="value font-monospace small ${isPrivacyActive ? 'privacy-text' : ''}">${emp.pix_key || '---'}</span></div>
                <div class="data-row"><span class="label">SEXO/CIVIL</span><span class="value">${emp.gender || 'M'} / ${emp.marital_status || 'Solteiro'}</span></div>
            </div>
            <div class="col-md-6">
                <div class="data-row"><span class="label">EMERGÊNCIA</span><span class="value">${emp.emergency_contact_name || '---'} (${emp.emergency_contact_phone || '-'})</span></div>
                <div class="data-row"><span class="label">ENDEREÇO</span><span class="value small text-white-50">${emp.street || ''}, ${emp.number || ''}</span></div>
                <div class="data-row">
                    <span class="label">FORMAÇÃO ACADÊMICA</span>
                    <div class="value small text-white-50">
                        ${(emp.education_data && emp.education_data.length > 0)
            ? `<ul class="ps-3 mb-0">` + emp.education_data.map(e => `<li><b>${e.level}:</b> ${e.area}</li>`).join('') + `</ul>`
            : '---'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderHistory(history, extraInfo = '') {
    const container = document.getElementById('profileHistory');
    container.innerHTML = extraInfo + '<hr class="border-secondary mt-3">';
    if (!history || history.length === 0) { container.innerHTML += '<p class="text-muted small">Sem aditivos.</p>'; return; }

    history.forEach((h, idx) => {
        const div = document.createElement('div');
        div.className = 'hud-panel mb-2 p-2 position-relative additive-item';

        let compareHtml = '';
        let displayNote = h.observations || '';
        let oldVal = null;
        let newVal = null;

        // 1. Tentar extrair do formato de tags [OLD:...] [NEW:...] (Legado)
        const oldMatch = (h.observations || '').match(/\[OLD:(.*?)\]/);
        const newMatch = (h.observations || '').match(/\[NEW:(.*?)\]/);

        if (oldMatch && newMatch) {
            oldVal = oldMatch[1];
            newVal = newMatch[1];
            displayNote = displayNote.replace(/\[OLD:.*?\]\s*\[NEW:.*?\]\s*/, '').trim();
        }

        // 2. Engrenagem v27.50: Priorizar colunas estruturadas do banco
        if (h.old_salary !== null || h.new_salary !== null) {
            newVal = formatCurrency(h.new_salary);
            oldVal = formatCurrency(h.old_salary || 0);
        } else if (h.old_role || h.new_role) {
            newVal = h.new_role;
            oldVal = h.old_role || '---';
        }

        // 3. Montagem do Hover HUD amarelado
        if (newVal) {
            compareHtml = `
                <div class="additive-hover-info">
                    <div class="small fw-bold text-warning mb-1" style="font-size: 0.65rem;">
                        <i class="bi bi-info-circle-fill me-1"></i> COMPARATIVO DE ALTERAÇÃO
                    </div>
                    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
                        <div class="compare-val-old"><b>DE:</b> ${oldVal}</div>
                        <i class="bi bi-arrow-right text-info"></i>
                        <div class="compare-val-new"><b>PARA:</b> ${newVal}</div>
                    </div>
                    ${displayNote ? `<div class="mt-2 text-white-50 border-top border-secondary pt-1" style="font-size: 0.73rem; line-height: 1.3;"><b>Nota:</b> ${displayNote}</div>` : ''}
                </div>
            `;
        } else {
            compareHtml = `
                <div class="additive-hover-info">
                    <div class="small fw-bold text-warning mb-1" style="font-size: 0.65rem;">
                        <i class="bi bi-info-circle-fill me-1"></i> NOTA DO REGISTRO
                    </div>
                    <div class="text-white small" style="opacity: 0.9; font-style: italic;">
                        ${displayNote || 'Aditivo contratual aplicado.'}
                    </div>
                </div>
            `;
        }

        // 4. Interface Executiva: Nenhuma nota externa (conforme pedido)
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start h-100">
                <span class="fw-bold text-info" style="font-size: 0.85rem;">${formatDate(h.change_date)}</span>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-white text-dark border border-light" style="font-size:0.65rem; text-transform: uppercase; font-weight: 700;">${h.event_type}</span>
                    <button class="btn btn-sm btn-outline-danger border-0 p-0 px-1" onclick="deleteHistoryItem('${h.id}')" title="Excluir Aditivo">
                        <i class="bi bi-trash small"></i>
                    </button>
                </div>
            </div>
            ${compareHtml}
        `;
        container.appendChild(div);
    });
}

window.deleteHistoryItem = async function (id) {
    if (confirm("Excluir?")) {
        const { error } = await db.from('employee_history').delete().eq('id', id);
        if (!error) openProfile(currentProfileId);
    }
};

window.closeProfile = () => document.getElementById('profileOverlay').style.display = 'none';

function calculateDebt(emp) {
    let totalPaid = 0;

    // Helper para cálculo indivual
    const calcPaidForOne = (amount, inst, startCycle) => {
        if (!amount || !inst || !startCycle) return 0;
        const start = new Date(startCycle + '-01');
        const now = new Date();
        let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < 10) elapsed--;
        elapsed = Math.max(0, Math.min(elapsed, inst));
        return elapsed * (amount / inst);
    };

    // Principal
    totalPaid += calcPaidForOne(emp.loan_amount, emp.loan_installments, emp.loan_start_cycle);

    // Diversos
    if (emp.loans_data && Array.isArray(emp.loans_data)) {
        emp.loans_data.forEach(ln => {
            totalPaid += calcPaidForOne(ln.amount, ln.installments, ln.start_cycle);
        });
    }

    const totalAmount = (emp.loan_amount || 0) + (emp.loans_data ? emp.loans_data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0);
    return Math.max(0, totalAmount - totalPaid);
}
function calculateMargin(emp) {
    const base = (emp.remuneration || 0) * 0.3; // 30% de margem padrão
    const debt = calculateDebt(emp);
    const installment = emp.loan_amount ? (emp.loan_amount / emp.loan_installments) : 0;
    const margin = base - installment;

    if (margin <= 0) {
        console.warn(`[FINANCEIRO] Margem zerada ou negativa para ${emp.full_name}: ${margin}`);
    }

    return Math.max(0, margin);
}

function formatCurrency(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatDate(d) { if (!d) return '---'; const [y, m, day] = d.split('T')[0].split('-'); return `${day}/${m}/${y}`; }
function scrambleText(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const chars = "!<>-_\\/[]{}—=+*^?#________";
    let iter = 0;
    const interval = setInterval(() => {
        el.innerText = val.split("").map((c, i) => i < iter ? val[i] : chars[Math.floor(Math.random() * chars.length)]).join("");
        if (iter >= val.length) clearInterval(interval);
        iter += 1 / 8;
    }, 40);
}

// --- UTILITÁRIOS DE FORMULÁRIO E MÁSCARAS ---
function getStatusBadgeClass(status) {
    if (status === 'Férias') return 'bg-warning text-dark';
    if (status === 'Inativo') return 'bg-danger';
    return 'bg-success';
}

window.maskDoc = function (i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    i.value = v;
};

window.maskPhone = function (i) {
    let v = i.value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2");
    i.value = v;
};

window.maskCEP = function (i) {
    let v = i.value.replace(/\D/g, '');
    v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    i.value = v;
};

window.searchCEP = async function () {
    let cep = document.getElementById('empZip').value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if (d.erro) { alert("CEP não encontrado."); return; }
        document.getElementById('empStreet').value = d.logradouro;
        document.getElementById('empNeighborhood').value = d.bairro;
        document.getElementById('empCity').value = d.localidade;
        document.getElementById('empState').value = d.uf;
        document.getElementById('empNumber').focus();
    } catch (e) { console.error("Erro ViaCEP:", e); }
};

window.copyDocToPix = function () {
    document.getElementById('empPix').value = document.getElementById('empDoc').value;
};

window.handlePhotoUpload = function (input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        document.getElementById('empPhotoBase64').value = base64;
        document.getElementById('photoPreview').innerHTML = `<img src="${base64}" style="max-height: 50px;" class="rounded mt-1"> Foto carregada!`;
    };
    reader.readAsDataURL(file);
};

window.toggleStatusDates = function () {
    const el = document.getElementById('empStatus');
    const status = el ? el.value : 'Ativo';
    document.querySelectorAll('.group-status-date').forEach(g => g.style.display = (status === 'Ativo') ? 'none' : 'block');
};

window.togglePJFields = function () {
    const elType = document.getElementById('empType');
    const isPJ = elType ? (elType.value === 'PJ') : false;
    const gpPJ = document.getElementById('groupPJType');
    const gpCorp = document.getElementById('groupCorporateName');
    if (gpPJ) gpPJ.style.display = isPJ ? 'block' : 'none';
    if (gpCorp) gpCorp.style.display = isPJ ? 'block' : 'none';
};

// Global Exports (No final para garantir carregamento)
window.saveEmployee = saveEmployee;
window.editEmployee = editEmployee;
window.toggleModalFinancials = function () {
    const ids = ['empRemuneration', 'loanAmount'];
    const btn = document.getElementById('btnPrivacyModal');
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.type = el.type === 'password' ? 'number' : 'password';
        }
    });
    if (btn) {
        const isHidden = document.getElementById(ids[0]).type === 'password';
        btn.querySelector('i').className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
        btn.classList.toggle('btn-info', !isHidden);
        btn.classList.toggle('btn-warning', isHidden);
    }
};
window.toggleLoansContainer = () => {
    const el = document.getElementById('loansContainer');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
window.addLoanRow = (amount = '', inst = '', cycle = '', reqDate = '') => {
    const list = document.getElementById('loansList');
    const div = document.createElement('div');
    div.className = 'loan-row row g-1 mb-2 align-items-center p-1 border border-warning-subtle rounded bg-dark';
    div.innerHTML = `
        <div class="col-md-3">
            <label class="form-label text-warning small mb-0">Valor (R$)</label>
            <input type="number" class="form-control form-control-sm ln-amount border-warning" placeholder="0.00" step="0.01" value="${amount}">
        </div>
        <div class="col-md-2">
            <label class="form-label text-warning small mb-0">Parcelas</label>
            <input type="number" class="form-control form-control-sm ln-inst border-warning" placeholder="12" value="${inst}">
        </div>
        <div class="col-md-3">
            <label class="form-label text-warning small mb-0">Início Pgto</label>
            <input type="month" class="form-control form-control-sm ln-cycle border-warning" value="${cycle}">
        </div>
        <div class="col-md-3">
            <label class="form-label text-warning small mb-0">Solicitação</label>
            <input type="date" class="form-control form-control-sm ln-request border-warning" value="${reqDate}">
        </div>
        <div class="col-md-1 text-center">
            <label class="form-label small mb-0 text-transparent">X</label>
            <button type="button" class="btn btn-xs btn-outline-danger border-0 p-0 px-2" onclick="this.closest('.loan-row').remove()">×</button>
        </div>
    `;
    list.appendChild(div);
};
window.editEmployeeDirect = (id) => { currentProfileId = id; editEmployee(); };
window.addChildRow = (nome, dob) => _addChildRow(nome, dob);
window.addEducationRow = (level, area) => _addEducationRow(level, area);

function resetForm() {
    const form = document.getElementById('employeeForm');
    if (form) form.reset();
    setVal('empId', '');
    setVal('empPhotoBase64', '');
    const preview = document.getElementById('photoPreview');
    if (preview) preview.innerHTML = 'A imagem será salva no banco de dados.';
    const childCont = document.getElementById('childrenContainer');
    if (childCont) childCont.innerHTML = '';
    const eduCont = document.getElementById('educationContainer');
    if (eduCont) eduCont.innerHTML = '';
    const loansList = document.getElementById('loansList');
    if (loansList) loansList.innerHTML = '';
    const loansCont = document.getElementById('loansContainer');
    if (loansCont) loansCont.style.display = 'none';
}

function _addChildRow(nome = '', dob = '') {
    console.log("Chamando _addChildRow...");
    const container = document.getElementById('childrenContainer');
    const div = document.createElement('div');
    div.className = 'd-flex gap-2 mb-2';
    div.innerHTML = `
        <input type="text" class="form-control form-control-sm child-name" placeholder="Nome" value="${nome}">
        <input type="date" class="form-control form-control-sm child-dob" value="${dob}">
        <button type="button" class="btn btn-sm btn-outline-danger border-0 p-0 px-2" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

function _addEducationRow(level = '', area = '') {
    console.log("Chamando _addEducationRow...");
    const container = document.getElementById('educationContainer');
    const div = document.createElement('div');
    div.className = 'd-flex gap-2 mb-2';
    div.innerHTML = `
        <select class="form-select form-select-sm edu-level" style="width: 140px;">
            <option value="Médio" ${level === 'Médio' ? 'selected' : ''}>Ens. Médio</option>
            <option value="Superior" ${level === 'Superior' ? 'selected' : ''}>Superior</option>
            <option value="Pós / MBA" ${level === 'Pós / MBA' ? 'selected' : ''}>Pós/MBA</option>
            <option value="Mestrado" ${level === 'Mestrado' ? 'selected' : ''}>Mestrado</option>
            <option value="Doutorado" ${level === 'Doutorado' ? 'selected' : ''}>Doutorado</option>
        </select>
        <input type="text" class="form-control form-control-sm edu-area" placeholder="Área / Curso" value="${area}">
        <button type="button" class="btn btn-sm btn-outline-danger border-0 p-0 px-2" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}

window.generateDebtTermPDF = async function () {
    const emp = allEmployees.find(e => e.id === currentProfileId);
    if (!emp || !emp.loan_amount) {
        alert("Este colaborador não possui empréstimo registrado para gerar o termo.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date();
    const fullAddress = `${emp.street || ''}, ${emp.number || ''}, ${emp.neighborhood || ''}, ${emp.city || ''} - ${emp.state || ''}, CEP: ${emp.zip_code || ''}`;
    const installmentValue = (emp.loan_amount / emp.loan_installments);

    // Helper para formatar moeda
    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Carregar Timbrado
    const loadImg = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });

    try {
        const timbrado = await loadImg('Timbrado Mar Brasil.png');

        const addPageWithTimbrado = () => {
            doc.addImage(timbrado, 'PNG', 0, 0, 210, 297);
        };

        addPageWithTimbrado();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        // doc.text("TERMO DE CONFISSÃO DE DÍVIDA", 105, 55, { align: "center" }); // Removido para evitar duplicidade

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const texto = `DEVEDOR: ${emp.employment_type === 'PJ' ? emp.corporate_name : emp.full_name}, inscrito no ${emp.pj_type || 'CPF'}, estabelecido na ${fullAddress}, inscrita no CNPJ: sob o n.º ${emp.document_id}, neste ato representada por ${emp.responsible_name || emp.full_name}, inscrito pelo CPF sob o n.º ${emp.responsible_cpf || emp.document_id} e RG: sob o n.º ${emp.responsible_rg || emp.document_rg || '---'}.

CREDOR: MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 02.233.923/0001-19, com sede em Rua Tupi, nº 782, Vila Tupi, Praia Grande - SP, neste ato representada por sua sócia administradora, a Sra. Priscilla Coelho Monteiro, brasileira, casada, empresária, inscrita no CPF sob n.º 320.421.118-56.

As partes acima qualificadas, por este instrumento particular e na melhor forma de direito, confessam e assumem como líquida e certa a dívida a seguir descrita, sujeitando-se às cláusulas e condições que se seguem:

CLÁUSULA PRIMEIRA – DO OBJETO DA DÍVIDA
1.1. O(A) DEVEDOR(A) confessa e declara dever ao(à) CREDOR(A) a importância líquida, certa e exigível de ${fmt(emp.loan_amount)}, referente ao empréstimo concedido pela MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA. ao(à) DEVEDOR(A) em ${formatDate(today.toISOString())}.

CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO
2.1. O valor confessado na Cláusula Primeira será quitado pelo(a) DEVEDOR(A) por meio de descontos nas futuras notas fiscais de prestação de serviços emitidas à MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., em ${emp.loan_installments} parcelas mensais e sucessivas, no valor de ${fmt(installmentValue)} cada uma, com vencimento no dia 10 de cada mês, a partir de ${formatDate(emp.loan_start_cycle + '-10')}.

2.2. O ciclo de referência desta confissão é ${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][today.getMonth()]} de ${today.getFullYear()}. Os descontos serão aplicados automaticamente pela CREDORA no momento do processamento das notas fiscais, e o valor líquido a ser pago ao(à) DEVEDOR(A) será o resultado da nota fiscal menos o valor da parcela do empréstimo.

CLÁUSULA TERCEIRA – DA INADIMPLÊNCIA
3.1. O não pagamento de qualquer parcela na data estipulada, implicará no vencimento antecipado de todo o saldo devedor, que se tornará imediatamente exigível pela CREDORA.
3.2. Em caso de inadimplência, sobre o saldo devedor vencido e não pago incidirão: a) Multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso ou sobre o saldo devedor em caso de vencimento antecipado. b) Juros de mora de 1% (um por cento) ao mês, ou fração, calculados pro rata die sobre o saldo devedor atualizado. c) Correção monetária pelo IGP-M (Índice Geral de Preços do Mercado) ou outro índice que o substitua, desde a data do vencimento até a data do efetivo pagamento.
3.3. A CREDORA se reserva o direito de promover a execução judicial deste Termo de Confissão de Dívida, que é título executivo extrajudicial, abrangendo o saldo devedor principal, acrescido de todos os encargos moratórios, custas processuais e honorários advocatícios.
3.4. A eventual tolerância à infringência de qualquer das cláusulas deste instrumento ou o não exercício de qualquer direito nele previsto constituirá mera liberalidade da CREDORA, não implicando em novação ou transação de qualquer espécie.
3.5. As partes concordam que o valor solicitado está vinculado exclusivamente à prestação do serviço. Com o término desta, as parcelas restantes serão automaticamente consideradas vencidas.

CLÁUSULA QUARTA – DA QUITAÇÃO ANTECIPADA
4.1. O(A) DEVEDOR(A) poderá solicitar a quitação antecipada total ou parcial do empréstimo a qualquer momento, mediante o pagamento do saldo devedor atualizado até a data da quitação, com a devida redução proporcional dos juros e demais acréscimos.

CLÁUSULA QUINTA – DAS DISPOSIÇÕES GERAIS
5.1. As partes declaram ter lido e compreendido todas as cláusulas e condições deste Termo, concordando com o seu teor.
5.2. Fica eleito o foro da comarca da sede da Mar Brasil para dirimir quaisquer dúvidas ou litígios decorrentes deste Termo, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, as partes assinam o presente Termo em 2 (duas) vias de igual teor e forma, na presença das 2 (duas) testemunhas abaixo.

Praia Grande - SP, ${today.getDate()} de ${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][today.getMonth()]} de ${today.getFullYear()}.

___________________________________________
DEVEDOR(A): ${emp.employment_type === 'PJ' ? emp.corporate_name : emp.full_name}
Representante Legal: ${emp.responsible_name || emp.full_name}

___________________________________________
CREDORA: MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA

TESTEMUNHAS:
1. ___________________ CPF: ________________
2. ___________________ CPF: ________________`;

        const margin = 20;
        const pageWidth = 210;
        const contentWidth = pageWidth - (margin * 2) - 10; // Aumentando recuo à direita (+10mm de margem extra)
        let cursorY = 35; // Margem superior reduzida a pedido (era 55)

        // Título Centralizado
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("TERMO DE CONFISSÃO DE DÍVIDA", pageWidth / 2, cursorY, { align: "center" });
        cursorY += 15;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        // Função para texto justificado
        const addJustifiedText = (text) => {
            const paragraphs = text.split('\n');
            paragraphs.forEach(p => {
                if (!p.trim()) {
                    cursorY += 5;
                    return;
                }
                const lines = doc.splitTextToSize(p, contentWidth);
                lines.forEach((line, index) => {
                    if (cursorY > 260) {
                        doc.addPage();
                        addPageWithTimbrado();
                        cursorY = 55;
                    }

                    // Se for a última linha do parágrafo, não justifica (alinha à esquerda)
                    if (index === lines.length - 1) {
                        doc.text(line, margin, cursorY);
                    } else {
                        doc.text(line, margin, cursorY, { align: 'justify', maxWidth: contentWidth });
                    }
                    cursorY += 6;
                });
                cursorY += 2; // Espaço entre parágrafos
            });
        };

        const corpoTexto = `DEVEDOR: ${emp.employment_type === 'PJ' ? emp.corporate_name : emp.full_name}, ${emp.employment_type === 'PJ' ? 'pessoa jurídica de direito privado' : 'pessoa física'}, inscrito no ${emp.pj_type || 'CPF'} sob o n.º ${emp.document_id}, estabelecido na ${fullAddress}, neste ato representada por ${emp.responsible_name || emp.full_name}, inscrito no CPF sob o n.º ${emp.responsible_cpf || emp.document_id} e RG n.º ${emp.responsible_rg || emp.document_rg || '---'}.

CREDOR: MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 02.233.923/0001-19, com sede em Rua Tupi, nº 782, Vila Tupi, Praia Grande - SP, neste ato representada por sua sócia administradora, a Sra. Priscilla Coelho Monteiro, brasileira, casada, empresária, inscrita no CPF sob n.º 320.421.118-56.

As partes acima qualificadas, por este instrumento particular e na melhor forma de direito, confessam e assumem como líquida e certa a dívida a seguir descrita, sujeitando-se às cláusulas e condições que se seguem:

CLÁUSULA PRIMEIRA – DO OBJETO DA DÍVIDA
1.1. O(A) DEVEDOR(A) confessa e declara dever ao(à) CREDOR(A) a importância líquida, certa e exigível de ${fmt(emp.loan_amount)}, referente ao empréstimo concedido pela MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA. ao(à) DEVEDOR(A) em ${formatDate(emp.loan_request_date || today.toISOString())}.

CLÁUSULA SEGUNDA – DA FORMA DE PAGAMENTO
2.1. O valor confessado na Cláusula Primeira será quitado pelo(a) DEVEDOR(A) por meio de descontos nas futuras notas fiscais de prestação de serviços emitidas à MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA., em ${emp.loan_installments} parcelas mensais e sucessivas, no valor de ${fmt(installmentValue)} cada uma, no dia 10 de cada mês, a partir de ${formatDate(emp.loan_start_cycle + '-10')}.

2.2. O ciclo de referência desta confissão é ${["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][today.getMonth()]} de ${today.getFullYear()}. Os descontos serão aplicados automaticamente pela CREDORA no momento do processamento das notas fiscais, e o valor líquido a ser pago ao(à) DEVEDOR(A) será o resultado da nota fiscal menos o valor da parcela do empréstimo.

CLÁUSULA TERCEIRA – DA INADIMPLÊNCIA
3.1. O não pagamento de qualquer parcela na data estipulada, implicará no vencimento antecipado de todo o saldo devedor, que se tornará imediatamente exigível pela CREDORA.
3.2. Em caso de inadimplência, sobre o saldo devedor vencido e não pago incidirão: a) Multa moratória de 2% (dois por cento) sobre o valor da parcela em atraso ou sobre o saldo devedor em caso de vencimento antecipado. b) Juros de mora de 1% (um por cento) ao mês, calculados pro rata die. c) Correção monetária pelo IGP-M ou outro índice que o substitua.
3.3. A CREDORA se reserva o direito de promover a execução judicial deste Termo, que é título executivo extrajudicial.
3.4. A eventual tolerância não implicará em novação ou transação.
3.5. O valor solicitado está vinculado exclusivamente à prestação do serviço. Com o término desta, as parcelas restantes serão automaticamente consideradas vencidas.

CLÁUSULA QUARTA – DA QUITAÇÃO ANTECIPADA
4.1. O(A) DEVEDOR(A) poderá solicitar a quitação antecipada total ou parcial do empréstimo a qualquer momento.

CLÁUSULA QUINTA – DAS DISPOSIÇÕES GERAIS
5.1. As partes declaram ter lido e compreendido todas as cláusulas deste Termo.
5.2. Fica eleito o foro da comarca de Praia Grande - SP para dirimir quaisquer dúvidas.`;

        addJustifiedText(corpoTexto);

        // Finalização e Assinaturas
        cursorY += 10;
        if (cursorY > 230) {
            doc.addPage();
            addPageWithTimbrado();
            cursorY = 55;
        }

        const signatureDate = emp.loan_request_date ? new Date(emp.loan_request_date + 'T12:00:00') : today;
        const signatureDay = signatureDate.getDate();
        const signatureMonth = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][signatureDate.getMonth()];
        const signatureYear = signatureDate.getFullYear();

        doc.text(`Praia Grande - SP, ${signatureDay} de ${signatureMonth} de ${signatureYear}.`, margin, cursorY);

        cursorY += 25;

        // Blocos de Assinatura
        doc.line(margin, cursorY, margin + 75, cursorY);
        doc.line(margin + 95, cursorY, margin + 170, cursorY);

        doc.setFontSize(8);
        doc.text("DEVEDOR(A)", margin, cursorY + 4);
        doc.text(emp.employment_type === 'PJ' ? emp.corporate_name : emp.full_name, margin, cursorY + 8);
        doc.text(`Rep: ${emp.responsible_name || emp.full_name}`, margin, cursorY + 12);
        doc.text(`CNPJ/CPF: ${emp.document_id}`, margin, cursorY + 16);

        doc.text("CREDORA", margin + 95, cursorY + 4);
        doc.text("MAR BRASIL SERVIÇOS E LOCAÇÕES LTDA", margin + 95, cursorY + 8);
        doc.text("Rep: Priscilla Coelho Monteiro", margin + 95, cursorY + 12);
        doc.text("CNPJ: 02.233.923/0001-19", margin + 95, cursorY + 16);

        cursorY += 30;
        doc.setFontSize(10);
        doc.text("TESTEMUNHAS:", margin, cursorY);
        cursorY += 15;

        doc.line(margin, cursorY, margin + 75, cursorY);
        doc.line(margin + 95, cursorY, margin + 170, cursorY);
        doc.setFontSize(8);
        doc.text("Nome:", margin, cursorY + 4);
        doc.text("CPF:", margin, cursorY + 8);
        doc.text("Nome:", margin + 95, cursorY + 4);
        doc.text("CPF:", margin + 95, cursorY + 8);

        doc.save(`Termo_Divida_${emp.full_name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);

    } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        alert("Erro ao carregar o papel timbrado. Verifique se o arquivo 'Timbrado Mar Brasil.png' está na pasta raiz.");
    }
};

window.analyzeCurrentPerson = async () => {
    const emp = allEmployees.find(e => e.id === currentProfileId);
    if (emp && typeof window.sendMessage === 'function') {
        const input = document.getElementById('brisinhaiInput');
        if (input) {
            input.value = `Análise executiva completa: ${emp.full_name}, ${emp.job_role}, ${emp.department}. Considere o empréstimo de ${formatCurrency(emp.loan_amount)}.`;
            window.sendMessage();
        }
    }
};
