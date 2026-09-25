// Shared on every page: mobile menu, header state, scroll reveals,
// stat count-up, 3D card tilt, timeline progress, and the footer year.
// Loaded in <head> so the "js" and "fx" classes are set before the page paints;
// without JavaScript the nav links stay visible and nothing is hidden.
(function () {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.classList.add('js');
    if (!reduceMotion && 'IntersectionObserver' in window) root.classList.add('fx');

    document.addEventListener('DOMContentLoaded', function () {
        const year = document.getElementById('year');
        if (year) year.textContent = new Date().getFullYear();

        initMenu();
        initHeader();
        initReveal();
        initCount();
        initTilt();
        initTimeline();
    });

    function initMenu() {
        const nav = document.querySelector('.site-nav');
        const toggle = nav && nav.querySelector('.menu-toggle');
        if (!toggle) return;

        const desktop = window.matchMedia('(min-width: 768px)');

        function isOpen() {
            return toggle.getAttribute('aria-expanded') === 'true';
        }

        function setOpen(open, returnFocus) {
            nav.classList.toggle('is-open', open);
            root.classList.toggle('menu-open', open);
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
    }

    // Header turns to frosted glass once the page scrolls.
    function initHeader() {
        const header = document.querySelector('.site-header');
        if (!header) return;
        const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    // Elements marked data-reveal fade and rise into place as they enter the view.
    function initReveal() {
        if (!root.classList.contains('fx')) return;
        const items = document.querySelectorAll('[data-reveal]');

        // Stagger siblings slightly so groups arrive one after another.
        items.forEach(function (el) {
            const group = Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal'));
            const index = group.indexOf(el);
            if (index > 0) el.style.setProperty('--reveal-delay', Math.min(index, 5) * 90 + 'ms');
        });

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

        items.forEach(el => observer.observe(el));
    }

    // Stat numbers (data-count) count up from zero the first time they come into view.
    // The real value stays in the HTML, so without motion it simply shows as is.
    function initCount() {
        if (!root.classList.contains('fx')) return;
        const items = document.querySelectorAll('[data-count]');
        if (!items.length) return;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                countUp(entry.target);
            });
        }, { threshold: 0.6 });

        items.forEach(el => observer.observe(el));
    }

    function countUp(el) {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();

        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // Cards marked data-tilt lean toward the pointer (mouse and trackpad only).
    function initTilt() {
        if (!root.classList.contains('fx')) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        document.querySelectorAll('[data-tilt]').forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                el.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
                el.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
                el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
                el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
                el.classList.add('is-tilting');
            });

            el.addEventListener('pointerleave', function () {
                el.classList.remove('is-tilting');
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        });
    }

    // The "How it works" line fills in as you scroll through the steps.
    function initTimeline() {
        const steps = document.querySelector('.steps');
        if (!steps) return;
        const update = function () {
            const r = steps.getBoundingClientRect();
            const progress = (window.innerHeight * 0.65 - r.top) / r.height;
            steps.style.setProperty('--fill', Math.min(1, Math.max(0, progress)).toFixed(3));
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }
})();
