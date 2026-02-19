document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.goal-icon-image').forEach(img => {
        const normal = img.dataset.default;
        const hover = img.dataset.hover;

        if (!hover) {
            return;
        }

        img.addEventListener('mouseenter', () => {
            img.src = hover;
        });

        img.addEventListener('mouseleave', () => {
            img.src = normal;
        });
    });

    if (window.OPEN_SDG_VERSION) {
        const siteVersion = document.querySelector('.site_version');

        siteVersion.textContent = siteVersion.textContent + ' (' + window.OPEN_SDG_VERSION + ')';
    }
});
