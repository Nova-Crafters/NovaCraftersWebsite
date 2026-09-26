// Shared on every page: mobile menu, header state, fly-through scroll depth,
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
        initDepth();
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

    // Fly-through depth for elements marked data-reveal: they approach from the
    // distance near the bottom of the screen, settle in the middle, and pass by
    // as they leave the top. Positions are measured once (and again whenever the
    // layout changes), so scrolling only writes styles and never forces a layout.
    function initDepth() {
        if (!root.classList.contains('fx')) return;
        const items = Array.from(document.querySelectorAll('[data-reveal]'));

        // The intro plays in once on load; stagger siblings so they arrive in turn
        items.forEach(function (el) {
            const group = Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal'));
            const index = group.indexOf(el);
            if (index > 0) el.style.setProperty('--reveal-delay', Math.min(index, 5) * 90 + 'ms');
        });

        const clamp = x => Math.min(1, Math.max(0, x));
        const ease = x => x * x * (3 - 2 * x);
        let boxes = [];
        let vh = window.innerHeight;
        let queued = false;

        function measure() {
            items.forEach(function (el) {
                el.style.translate = '';
                el.style.scale = '';
                el.style.opacity = '';
            });
            vh = window.innerHeight;
            const y = window.scrollY;
            boxes = items.map(function (el) {
                const r = el.getBoundingClientRect();
                const sticky = getComputedStyle(el).position === 'sticky';
                // The opening screen (headline, stats) is already there on arrival,
                // so it never starts "far away"; it only flies past as you scroll on
                const intro = !!el.closest('.page-hero');
                return { top: r.top + y, bottom: r.bottom + y, sticky: sticky, intro: intro, lag: 0 };
            });
            // Cards side by side in a row arrive in a slight cascade
            boxes.forEach(function (box, i) {
                const el = items[i];
                const before = items.slice(0, i).filter((other, j) => other.parentElement === el.parentElement && Math.abs(boxes[j].top - box.top) < 4);
                box.lag = before.length * vh * 0.05;
            });
            update();
        }

        function update() {
            queued = false;
            const y = window.scrollY;
            items.forEach(function (el, i) {
                const box = boxes[i];
                let scale = 1, shift = 0, opacity = 1;
                // Sticky headings and whatever has keyboard focus stay put and fully visible
                if (box && !box.sticky && !el.contains(document.activeElement)) {
                    const top = box.top - y + box.lag;
                    const bottom = box.bottom - y;
                    const enter = box.intro ? 0 : clamp((top - vh * 0.62) / (vh * 0.38));
                    const leave = clamp((vh * 0.22 - bottom) / (vh * 0.22));
                    if (enter > 0) {
                        const e = ease(enter);
                        scale = 1 - 0.16 * e;
                        shift = 90 * e;
                        opacity = 1 - 0.95 * e;
                    } else if (leave > 0) {
                        const l = ease(leave);
                        scale = 1 + 0.1 * l;
                        shift = -30 * l;
                        opacity = 1 - 0.9 * l;
                    }
                }
                el.style.scale = scale === 1 ? '' : scale.toFixed(4);
                el.style.translate = shift === 0 ? '' : '0 ' + shift.toFixed(1) + 'px';
                el.style.opacity = opacity === 1 ? '' : opacity.toFixed(3);
            });
        }

        function queue() {
            if (!queued) {
                queued = true;
                requestAnimationFrame(update);
            }
        }

        window.addEventListener('scroll', queue, { passive: true });
        window.addEventListener('resize', measure);
        document.addEventListener('focusin', queue);
        if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
        measure();
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
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();

        function step(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
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
