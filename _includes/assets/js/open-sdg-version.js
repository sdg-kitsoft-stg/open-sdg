window.OPEN_SDG_VERSION = "2.4.0";


const fieldsContainerLength = document.querySelectorAll('.variable-selector').length;

if (fieldsContainerLength === 0) {
    const sidebar = document.getElementById('indicator-sidebar');
    const indicatorMain = document.querySelector('.indicator-main');

    sidebar.style.display = 'none';
    indicatorMain.classList.remove('col-md-8');
    indicatorMain.classList.add('col-md-12');
}
