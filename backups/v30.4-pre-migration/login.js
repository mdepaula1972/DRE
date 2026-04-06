// ============================================
// LOGIN.JS - Sistema de Autenticação v17
// ============================================

// Configuração Supabase  
const SUPABASE_URL = 'https://ngtjhwswbbivqajtpjvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ndGpod3N3YmJpdnFhanRwanZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4MjM2MCwiZXhwIjoyMDg0NzU4MzYwfQ.2TPnOfnAzeWG23Y-VuDKxxzQ9QdbHwrnHdVBhS9hU28';

// Cliente Supabase (usando nome único para evitar conflito)
let sbClient;

// Inicialização após DOM carregar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Login.js carregado');

    // Inicializar Supabase
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Elementos DOM
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const btnLogin = document.getElementById('btnLogin');
    const alertContainer = document.getElementById('alertContainer');

    // Verificar se já está logado
    try {
        const { data: { session } } = await sbClient.auth.getSession();
        console.log('Sessão atual:', session);
        if (session) {
            console.log('Usuário já logado, redirecionando...');
            window.location.href = 'landing.html';
            return;
        }
    } catch (err) {
        console.error('Erro ao verificar sessão:', err);
    }

    // Atualizar versão
    if (window.APP_VERSION) {
        const versionEl = document.getElementById('versionDisplay');
        if (versionEl) versionEl.textContent = window.APP_VERSION;
    }

    // Toggle para mostrar/ocultar senha
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            console.log('Toggle senha clicado');
            const currentType = passwordInput.getAttribute('type');
            const newType = currentType === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', newType);

            const icon = this.querySelector('i');
            if (icon) {
                if (newType === 'text') {
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                } else {
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
            }
        });
    }

    // Formulário de Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Formulário de login submetido');

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            console.log('Email:', email);

            if (!email || !password) {
                showAlert(alertContainer, 'Preencha todos os campos.', 'danger');
                return;
            }

            setLoading(btnLogin, true);
            clearAlerts(alertContainer);

            try {
                console.log('Tentando login com Supabase...');
                const { data, error } = await sbClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                console.log('Resposta do Supabase:', { data, error });

                if (error) {
                    throw error;
                }

                // Login bem-sucedido
                showAlert(alertContainer, 'Login realizado com sucesso! Redirecionando...', 'success');

                // Atualizar último login
                try {
                    await sbClient
                        .from('user_profiles')
                        .update({ last_login: new Date().toISOString() })
                        .eq('id', data.user.id);
                } catch (err) {
                    console.warn('Erro ao atualizar último login:', err);
                }

                // Redirecionar
                setTimeout(() => {
                    window.location.href = 'landing.html';
                }, 1000);

            } catch (error) {
                console.error('Erro no login:', error);

                let message = 'Erro ao realizar login. Tente novamente.';
                if (error.message) {
                    if (error.message.includes('Invalid login credentials')) {
                        message = 'E-mail ou senha incorretos.';
                    } else if (error.message.includes('Email not confirmed')) {
                        message = 'E-mail não confirmado. Verifique sua caixa de entrada.';
                    } else if (error.message.includes('Too many requests')) {
                        message = 'Muitas tentativas. Aguarde alguns minutos.';
                    } else {
                        message = error.message;
                    }
                }

                showAlert(alertContainer, message, 'danger');
            } finally {
                setLoading(btnLogin, false);
            }
        });
    }

    // Formulário de Recuperação de Senha
    if (forgotForm) {
        const forgotAlertContainer = document.getElementById('forgotAlertContainer');
        const btnForgot = document.getElementById('btnForgot');

        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('forgotEmail').value.trim();

            if (!email) {
                showAlert(forgotAlertContainer, 'Preencha o e-mail.', 'danger');
                return;
            }

            setLoading(btnForgot, true);
            clearAlerts(forgotAlertContainer);

            try {
                const { error } = await sbClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html'
                });

                if (error) {
                    throw error;
                }

                showAlert(forgotAlertContainer, 'Link de recuperação enviado! Verifique seu e-mail.', 'success');

                // Limpar e fechar após 3 segundos
                setTimeout(() => {
                    document.getElementById('forgotEmail').value = '';
                    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotModal'));
                    if (modal) modal.hide();
                }, 3000);

            } catch (error) {
                console.error('Erro na recuperação:', error);
                showAlert(forgotAlertContainer, 'Erro ao enviar e-mail. Tente novamente.', 'danger');
            } finally {
                setLoading(btnForgot, false);
            }
        });
    }
});

// Funções auxiliares
function showAlert(container, message, type) {
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${type} d-flex align-items-center" role="alert">
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2"></i>
            ${message}
        </div>
    `;
}

function clearAlerts(container) {
    if (container) container.innerHTML = '';
}

function setLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}
