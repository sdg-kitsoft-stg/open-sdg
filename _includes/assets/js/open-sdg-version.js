window.OPEN_SDG_VERSION = "2.4.0";


const fieldsContainer = document.querySelector('#fields');
console.log('open-sdg-version.js:', {
    fieldsContainer,
    len: fieldsContainer.children.length === 0
})

if (fieldsContainer.children.length === 0) {
    const sidebar = document.getElementById('indicator-sidebar');
    const indicatorMain = document.querySelector('.indicator-main');

    sidebar.style.display = 'none';
    indicatorMain.classList.remove('col-md-8');
    indicatorMain.classList.add('col-md-12');
}
