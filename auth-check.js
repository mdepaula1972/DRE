(function () {
    const isAuthed = sessionStorage.getItem('dashboard_auth') === 'true';
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('index.html') || path.endsWith('landing.html') || path === '';

    if (!isAuthed && !isLoginPage) {
        window.location.replace('index.html');
    }
})();
