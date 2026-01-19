function goTo500(error) {
    if (!location.pathname.includes('/500')) {
        location.href = '/500.html';
    }
}

window.addEventListener('error', e => goTo500(e.error));
window.addEventListener('unhandledrejection', e => goTo500(e.reason));
