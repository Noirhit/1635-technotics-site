document.addEventListener('DOMContentLoaded', () => {
    // === Mobile nav toggle ===
    const toggle = document.querySelector('.nav-toggle');
    const linksList = document.querySelector('.nav-links');
    if (toggle && linksList) {
        toggle.addEventListener('click', () => linksList.classList.toggle('open'));
    }

    // === Contact form — submits to Web3Forms via fetch, stays on page ===
    const form = document.querySelector('#contact-form');
    if (form) {
        const messageEl = form.querySelector('#form-message');
        const button = form.querySelector('button[type="submit"]');
        const originalText = button ? button.textContent.trim() : 'Send message';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // If access key hasn't been replaced, don't try to hit the API
            const keyField = form.querySelector('input[name="access_key"]');
            if (!keyField || !keyField.value || keyField.value === 'YOUR_ACCESS_KEY_HERE') {
                showMessage(messageEl, '// FORM NOT CONFIGURED — SEE contact.html COMMENT FOR SETUP', 'error');
                return;
            }

            if (button) { button.disabled = true; button.textContent = 'Sending…'; }
            showMessage(messageEl, '', 'clear');

            const data = Object.fromEntries(new FormData(form).entries());

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await res.json();
                if (result.success) {
                    showMessage(messageEl, '// MESSAGE SENT — WE\'LL BE IN TOUCH SOON', 'success');
                    form.reset();
                } else {
                    throw new Error(result.message || 'Send failed');
                }
            } catch (err) {
                showMessage(messageEl, '// SEND FAILED — EMAIL team@1635.example DIRECTLY', 'error');
            } finally {
                if (button) { button.disabled = false; button.textContent = originalText; }
            }
        });
    }
    function showMessage(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className = 'form-message';
        if (type === 'success') el.classList.add('form-message--ok');
        if (type === 'error') el.classList.add('form-message--err');
        el.style.display = text ? 'block' : 'none';
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
            if (current > lastScroll && current > 120) header.classList.add('hidden');
            else header.classList.remove('hidden');
            lastScroll = current;
        });
    }

    // === Year tabs (about page) ===
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
    document.querySelectorAll('.stat-num[data-count], .stat-number[data-count]').forEach((el) => {
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
                postsContainer.innerHTML = '<p class="mono" style="color:var(--fg-3); padding: 40px 0;">// POSTS UNAVAILABLE — RUN A LOCAL SERVER (VS CODE LIVE SERVER)</p>';
            });
    }

    // === Latest 3 blog posts preview on home ===
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
                            <span class="read-more">Read more</span>
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
