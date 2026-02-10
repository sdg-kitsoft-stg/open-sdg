function addAttrsForLinks(container) {
    const links = container.querySelectorAll('a:not([href="#top"])');

    links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'nofollow noopener noreferrer');
    })
}

const usefulLinksContainer = document.querySelector('.useful-links');
const leadCopyContainer = document.querySelector('.lead-copy');

if (usefulLinksContainer) {
    addAttrsForLinks(usefulLinksContainer);
}

if (leadCopyContainer) {
    addAttrsForLinks(leadCopyContainer);
}
