// ============================================
// AUTH.JS - Middleware de Autenticação v17
// Incluir em todas as páginas protegidas
// ============================================

(function () {
    'use strict';

    // Configuração Supabase
    const SUPABASE_URL = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

    // Inicializar Supabase se não existir
    if (!window.authSupabase) {
        window.authSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // Mapeamento de páginas para módulos
    const PAGE_MODULES = {
        'index.html': 'dre',
        'dre.html': 'dre',
        'landing.html': 'landing',
        'analise-setorial.html': 'analise-setorial',
        'indicadores-gestao.html': 'indicadores',
        'indicadores_v2.html': 'indicadores',
        'parcelamentos.html': 'parcelamentos',
        'seguros.html': 'seguros',
        'contratos.html': 'contratos',
        'comissoes.html': 'comissoes',
        'people.html': 'peopleboard',
        'emprestimos.html': 'emprestimos',
        'admin/users.html': 'admin'
    };

    // Dados do usuário atual
    window.currentUser = null;
    window.userProfile = null;
    window.userPermissions = {};

    // Verificar autenticação ao carregar
    async function checkAuth() {
        // AUTH DESATIVADO TEMPORARIAMENTE
        window.userPermissions = { _isAdmin: true };
        return true;

        try {
            const { data: { session }, error } = await window.authSupabase.auth.getSession();

            if (error || !session) {
                redirectToLogin();
                return false;
            }

            window.currentUser = session.user;

            // Carregar perfil do usuário
            await loadUserProfile(session.user.id);

            // Verificar se usuário está ativo
            if (!window.userProfile || !window.userProfile.is_active) {
                alert('Usuário desativado. Contate o administrador.');
                await logout();
                return false;
            }

            // Carregar permissões
            await loadUserPermissions(session.user.id);

            // Verificar permissão para página atual
            const currentPage = getCurrentPage();
            const moduleSlug = PAGE_MODULES[currentPage];

            if (moduleSlug && !hasPermission(moduleSlug, 'view')) {
                showAccessDenied();
                return false;
            }

            // Aplicar restrições de UI baseadas em permissão
            applyPermissionRestrictions(moduleSlug);

            return true;

        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            redirectToLogin();
            return false;
        }
    }

    // Carregar perfil do usuário
    async function loadUserProfile(userId) {
        console.log('🔍 Carregando perfil para userId:', userId);
        try {
            const { data, error } = await window.authSupabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            console.log('📋 Resultado do perfil:', { data, error });

            if (error) {
                console.error('❌ Erro ao buscar perfil:', error);
                // Se não encontrar perfil, criar um básico
                if (error.code === 'PGRST116') {
                    console.log('⚠️ Perfil não encontrado. Criando perfil básico...');
                    const { data: newProfile, error: createError } = await window.authSupabase
                        .from('user_profiles')
                        .insert({
                            id: userId,
                            full_name: window.currentUser?.email?.split('@')[0] || 'Usuário',
                            role: 'user',
                            is_active: true
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error('❌ Erro ao criar perfil:', createError);
                    } else {
                        console.log('✅ Perfil criado:', newProfile);
                        window.userProfile = newProfile;
                        return;
                    }
                }
                throw error;
            }

            console.log('✅ Perfil carregado:', data);
            window.userProfile = data;

        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            window.userProfile = null;
        }
    }

    // Carregar permissões do usuário
    async function loadUserPermissions(userId) {
        try {
            // Admins têm acesso total
            if (window.userProfile?.role === 'admin') {
                window.userPermissions = { _isAdmin: true };
                return;
            }

            const { data, error } = await window.authSupabase
                .from('user_permissions')
                .select(`
                    can_view,
                    can_create,
                    can_edit,
                    can_delete,
                    modules(slug)
                `)
                .eq('user_id', userId);

            if (error) throw error;

            // Organizar por módulo
            window.userPermissions = {};
            data.forEach(perm => {
                if (perm.modules?.slug) {
                    window.userPermissions[perm.modules.slug] = {
                        view: perm.can_view,
                        create: perm.can_create,
                        edit: perm.can_edit,
                        delete: perm.can_delete
                    };
                }
            });

        } catch (error) {
            console.error('Erro ao carregar permissões:', error);
            window.userPermissions = {};
        }
    }

    // Verificar permissão específica
    function hasPermission(moduleSlug, action = 'view') {
        // Admin tem tudo
        if (window.userPermissions._isAdmin) return true;

        // Landing sempre acessível para usuários autenticados
        if (moduleSlug === 'landing') return true;

        const modulePerm = window.userPermissions[moduleSlug];
        if (!modulePerm) return false;

        return modulePerm[action] === true;
    }

    // Aplicar restrições de UI
    function applyPermissionRestrictions(moduleSlug) {
        if (!moduleSlug) return;

        document.addEventListener('DOMContentLoaded', () => {
            // Ocultar botões de criar se não tem permissão
            if (!hasPermission(moduleSlug, 'create')) {
                hideElements('[data-permission="create"]');
                hideElements('.btn-create, .btn-add, #btnAddEmployee, #btnAdd');
            }

            // Ocultar botões de editar
            if (!hasPermission(moduleSlug, 'edit')) {
                hideElements('[data-permission="edit"]');
                hideElements('.btn-edit');
            }

            // Ocultar botões de excluir
            if (!hasPermission(moduleSlug, 'delete')) {
                hideElements('[data-permission="delete"]');
                hideElements('.btn-delete, .btn-remove');
            }

            // Adicionar indicador de usuário logado
            addUserIndicator();
        });
    }

    // Ocultar elementos
    function hideElements(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
        });
    }

    // Adicionar indicador de usuário
    function addUserIndicator() {
        const header = document.querySelector('header, .dashboard-header');
        if (!header || document.getElementById('userIndicator')) return;

        const userName = window.userProfile?.full_name || window.currentUser?.email;
        const userRole = window.userProfile?.role || 'user';

        const indicator = document.createElement('div');
        indicator.id = 'userIndicator';
        indicator.className = 'd-flex align-items-center gap-2 ms-3';
        indicator.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-1"></i>
                    <span class="d-none d-md-inline">${userName}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><span class="dropdown-item-text small text-muted">${userRole.toUpperCase()}</span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Sair</a></li>
                </ul>
            </div>
        `;

        // Inserir antes dos botões de ação
        const actionsDiv = header.querySelector('.d-flex.gap-2, .actions, .header-actions');
        if (actionsDiv) {
            actionsDiv.prepend(indicator);
        } else {
            header.appendChild(indicator);
        }
    }

    // Página atual
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return page;
    }

    // Redirecionar para login
    function redirectToLogin() {
        const currentPage = getCurrentPage();
        if (currentPage !== 'login.html') {
            window.location.href = 'login.html';
        }
    }

    // Mostrar acesso negado
    function showAccessDenied() {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0d0d0d;color:white;font-family:Outfit,sans-serif;">
                <div style="text-align:center;">
                    <i class="bi bi-shield-exclamation" style="font-size:4rem;color:#F2911B;"></i>
                    <h1 style="margin-top:20px;">Acesso Negado</h1>
                    <p style="color:rgba(255,255,255,0.6);">Você não tem permissão para acessar esta página.</p>
                    <a href="landing.html" style="color:#F2911B;text-decoration:none;">← Voltar ao Menu</a>
                </div>
            </div>
        `;
    }

    // Logout
    window.logout = async function () {
        try {
            await window.authSupabase.auth.signOut();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
        window.location.href = 'login.html';
    };

    // Expor funções globalmente
    window.checkAuth = checkAuth;
    window.hasPermission = hasPermission;
    window.isAdmin = () => window.userPermissions._isAdmin === true;

    // Executar verificação automaticamente
    checkAuth();

})();
