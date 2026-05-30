document.addEventListener('DOMContentLoaded', () => {
    // === Mobile nav toggle ===
    const toggle = document.querySelector('.nav-toggle');
    const linksList = document.querySelector('.nav-links');
    if (toggle && linksList) {
        toggle.addEventListener('click', () => linksList.classList.toggle('open'));
    }

    // === Contact form (placeholder — replace with Formspree/Web3Forms) ===
    const form = document.querySelector('.contact-form');
    if (form && !form.action) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Message sent! (placeholder — connect a form service to receive real submissions)');
            form.reset();
        });
    }

    // === Slideshow ===
    document.querySelectorAll('.slideshow').forEach((show) => {
        const slides = show.querySelectorAll('.slide');
        if (slides.length < 2) return;
        let i = 0;
        setInterval(() => {
            slides[i].classList.remove('active');
            i = (i + 1) % slides.length;
            slides[i].classList.add('active');
        }, 4000);
    });

    // === Hide header on scroll down, show on scroll up ===
    const header = document.querySelector('.site-header');
    if (header) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const current = window.scrollY;
            if (current > lastScroll && current > 100) header.classList.add('hidden');
            else header.classList.remove('hidden');
            lastScroll = current;
        });
    }

    // === Sliding nav pill ===
    const navList = document.querySelector('.nav-links');
    if (navList) {
        const navAnchors = navList.querySelectorAll('a');
        const activeLink = navList.querySelector('a.active');

        function movePillTo(link) {
            if (!link) { navList.style.setProperty('--pill-opacity', '0'); return; }
            const r = link.getBoundingClientRect();
            const lr = navList.getBoundingClientRect();
            navList.style.setProperty('--pill-width', `${r.width}px`);
            navList.style.setProperty('--pill-x', `${r.left - lr.left}px`);
            navList.style.setProperty('--pill-opacity', '1');
        }
        requestAnimationFrame(() => movePillTo(activeLink));
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => movePillTo(activeLink));
        }
        navAnchors.forEach((link) => {
            link.addEventListener('mouseenter', () => movePillTo(link));
        });
        navList.addEventListener('mouseleave', () => movePillTo(activeLink));
        window.addEventListener('resize', () => movePillTo(activeLink));
    }

    // === Year tabs (about page team roster) ===
    document.querySelectorAll('.year-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const year = tab.dataset.year;
            document.querySelectorAll('.year-tab').forEach((t) => t.classList.remove('active'));
            document.querySelectorAll('.team-year').forEach((y) => y.classList.remove('active'));
            tab.classList.add('active');
            const target = document.querySelector(`.team-year[data-year="${year}"]`);
            if (target) target.classList.add('active');
        });
    });

    // === Stat counter (counts up when scrolled into view) ===
    document.querySelectorAll('.stat-number').forEach((el) => {
        const target = parseFloat(el.dataset.count);
        if (isNaN(target)) return;
        const suffix = el.dataset.suffix || '';
        let played = false;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !played) {
                    played = true;
                    const duration = 1500;
                    const start = performance.now();
                    function tick(now) {
                        const t = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - t, 3);
                        const value = Math.round(target * eased);
                        el.textContent = value + suffix;
                        if (t < 1) requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                }
            });
        }, { threshold: 0.3 });
        obs.observe(el);
    });

    // === Blog post rendering (from data/posts.json) ===
    const postsContainer = document.querySelector('#posts-container');
    if (postsContainer) {
        fetch('data/posts.json')
            .then((r) => r.json())
            .then((posts) => {
                // newest first
                posts.sort((a, b) => new Date(b.date) - new Date(a.date));
                postsContainer.innerHTML = posts.map((p, i) => `
                    <article class="card" data-post-index="${i}">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="card-body">
                            <p class="post-meta">${formatDate(p.date)} · ${p.author}</p>
                            <h3>${p.title}</h3>
                            <p>${p.excerpt}</p>
                            <span class="read-more">Read more</span>
                        </div>
                    </article>
                `).join('');
                postsContainer.querySelectorAll('.card').forEach((card) => {
                    card.addEventListener('click', () => openPostModal(posts[card.dataset.postIndex]));
                });
            })
            .catch(() => {
                postsContainer.innerHTML = '<p style="color:#888;text-align:center;">Posts could not be loaded. Make sure you are running a local server (VS Code Live Server).</p>';
            });
    }

    // === Latest 3 blog post previews on home ===
    const homePreview = document.querySelector('#blog-preview-container');
    if (homePreview) {
        fetch('data/posts.json')
            .then((r) => r.json())
            .then((posts) => {
                posts.sort((a, b) => new Date(b.date) - new Date(a.date));
                const latest = posts.slice(0, 3);
                homePreview.innerHTML = latest.map((p) => `
                    <a class="card" href="blog.html">
                        <img src="${p.image}" alt="${p.title}">
                        <div class="card-body">
                            <p class="post-meta">${formatDate(p.date)}</p>
                            <h3>${p.title}</h3>
                            <p>${p.excerpt}</p>
                        </div>
                    </a>
                `).join('');
            })
            .catch(() => { /* silent fail on home */ });
    }
});

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso; }
}

function openPostModal(post) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
        <div class="modal">
            <button class="modal-close" aria-label="Close">&times;</button>
            <img src="${post.image}" alt="${post.title}">
            <p class="post-meta">${formatDate(post.date)} · ${post.author}</p>
            <h2>${post.title}</h2>
            ${post.body}
        </div>
    `;
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    const close = () => { backdrop.remove(); document.body.style.overflow = ''; };
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
}
