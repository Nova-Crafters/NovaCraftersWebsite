// Shared on every page: mobile menu toggle and the footer year.
// Loaded in <head> so the "js" class is set before the page paints;
// without JavaScript the nav links simply stay visible.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const nav = document.querySelector('.site-nav');
    const toggle = nav && nav.querySelector('.menu-toggle');
    if (!toggle) return;

    const desktop = window.matchMedia('(min-width: 768px)');

    function isOpen() {
        return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open, returnFocus) {
        nav.classList.toggle('is-open', open);
        document.documentElement.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close' : 'Menu';
        if (!open && returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
        setOpen(!isOpen());
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) setOpen(false, true);
    });

    // Close when keyboard focus or a click leaves the menu.
    nav.addEventListener('focusout', function (e) {
        if (isOpen() && e.relatedTarget && !nav.contains(e.relatedTarget)) setOpen(false);
    });

    document.addEventListener('click', function (e) {
        if (isOpen() && !nav.contains(e.target)) setOpen(false);
    });

    desktop.addEventListener('change', function (e) {
        if (e.matches && isOpen()) setOpen(false);
    });
});
