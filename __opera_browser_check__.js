
        const STORE_KEY = 'azha-opera-browser';
        const forceOpenTabHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'accounts.google.com', 'google.com', 'www.google.com', 'login.microsoftonline.com'];
        const state = loadState();
        let blockedUrl = '';

        function loadState() {
            try {
                const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
                return {
                    tabs: Array.isArray(saved.tabs) && saved.tabs.length ? saved.tabs : [{ id: crypto.randomUUID(), title: 'Start', url: 'azha:start' }],
                    activeTabId: saved.activeTabId || '',
                    bookmarks: Array.isArray(saved.bookmarks) ? saved.bookmarks : [],
                    history: Array.isArray(saved.history) ? saved.history.slice(0, 40) : []
                };
            } catch {
                return { tabs: [{ id: crypto.randomUUID(), title: 'Start', url: 'azha:start' }], activeTabId: '', bookmarks: [], history: [] };
            }
        }

        function saveState() {
            localStorage.setItem(STORE_KEY, JSON.stringify(state));
        }

        function activeTab() {
            return state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
        }

        function ensureTabs() {
            if (!state.tabs.length) {
                state.tabs = [{ id: crypto.randomUUID(), title: 'Start', url: 'azha:start' }];
            }
            if (!state.activeTabId || !state.tabs.some((tab) => tab.id === state.activeTabId)) {
                state.activeTabId = state.tabs[0].id;
            }
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[char]));
        }

        function normalizeUrl(input) {
            const raw = String(input || '').trim();
            if (!raw) return 'azha:start';
            if (/^[a-z]+:/i.test(raw)) return raw;
            if (raw.includes('.') && !raw.includes(' ')) return `https://${raw}`;
            return `azha:search:${encodeURIComponent(raw)}`;
        }

        function hostNeedsTab(url) {
            try {
                const host = new URL(url).hostname.toLowerCase();
                return forceOpenTabHosts.some((item) => host === item || host.endsWith(`.${item}`));
            } catch {
                return false;
            }
        }

        function renderTabs() {
            ensureTabs();
            document.getElementById('tabsBar').innerHTML = state.tabs.map((tab) => `
                <div class="tab ${tab.id === state.activeTabId ? 'active' : ''}">
                    <strong onclick="switchTab('${tab.id}')">${escapeHtml(tab.title || 'Tab')}</strong>
                    <button type="button" class="secondary" onclick="closeTab('${tab.id}')">X</button>
                </div>
            `).join('');
        }

        function renderList(targetId, items, emptyText, onOpenName, onRemoveName) {
            const el = document.getElementById(targetId);
            if (!items.length) {
                el.innerHTML = `<p class="tiny muted">${emptyText}</p>`;
                return;
            }
            el.innerHTML = items.map((item, index) => `
                <div class="link-item">
                    <div>
                        <strong>${escapeHtml(item.title || item.url)}</strong>
                        <p class="tiny muted">${escapeHtml(item.url)}</p>
                    </div>
                    <div class="row">
                        <button type="button" class="secondary" onclick="${onOpenName}(${index})">Open</button>
                        <button type="button" class="secondary" onclick="${onRemoveName}(${index})">Remove</button>
                    </div>
                </div>
            `).join('');
        }

        function renderSaved() {
            renderList('bookmarksList', state.bookmarks, 'No bookmarks yet.', 'openBookmark', 'removeBookmark');
            renderList('historyList', state.history, 'No history yet.', 'openHistory', 'removeHistory');
        }

        function addHistory(title, url) {
            if (!url || url.startsWith('azha:start')) return;
            state.history = [{ title, url }, ...state.history.filter((item) => item.url !== url)].slice(0, 40);
            saveState();
            renderSaved();
        }

        function showBlocked(url) {
            blockedUrl = url;
            document.getElementById('blockedText').textContent = `${url} opens better in a normal Opera tab.`;
            document.getElementById('blockedCard').classList.remove('hidden');
            document.getElementById('viewerShell').classList.add('hidden');
        }

        function hideBlocked() {
            document.getElementById('blockedCard').classList.add('hidden');
            document.getElementById('viewerShell').classList.remove('hidden');
        }

        function renderStart() {
            hideBlocked();
            document.getElementById('viewer').srcdoc = `
                <style>
                    body{margin:0;font-family:Georgia,serif;background:#061019;color:#f2efe6;display:grid;place-items:center;min-height:100vh;padding:32px}
                    .box{max-width:760px;text-align:center}
                    h1{margin:0 0 12px}
                    .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
                    a{display:inline-block;padding:12px 16px;border-radius:12px;background:#f6c453;color:#111;text-decoration:none;font-weight:bold}
                    p{margin:0;color:#c2ccd2;line-height:1.6}
                </style>
                <div class="box">
                    <h1>AZHA Browser</h1>
                    <p>This is your single-file Opera browser page. Some big websites still open better in a real Opera tab.</p>
                    <div class="row">
                        <a href="https://azha-lanchpad.vercel.app" target="_top">AZHA Launchpad</a>
                        <a href="https://openai.com" target="_top">OpenAI</a>
                        <a href="https://vercel.com" target="_top">Vercel</a>
                    </div>
                </div>
            `;
        }

        function renderSearch(query) {
            hideBlocked();
            const clean = decodeURIComponent(query || '').trim();
            const matches = [...state.bookmarks, ...state.history].filter((item) => `${item.title} ${item.url}`.toLowerCase().includes(clean.toLowerCase())).slice(0, 12);
            document.getElementById('viewer').srcdoc = `
                <style>
                    body{margin:0;font-family:Georgia,serif;background:#061019;color:#f2efe6;padding:24px}
                    h1{margin:0 0 12px}
                    p{margin:0 0 16px;color:#c2ccd2}
                    .card{padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);margin-bottom:10px}
                    a{color:#f6c453;text-decoration:none}
                </style>
                <h1>AZHA Search</h1>
                <p>Results for ${escapeHtml(clean)}</p>
                ${matches.length ? matches.map((item) => `<div class="card"><strong>${escapeHtml(item.title || item.url)}</strong><div><a href="${escapeHtml(item.url)}" target="_top">${escapeHtml(item.url)}</a></div></div>`).join('') : '<div class="card">No saved AZHA results yet. Type a full website URL to open it.</div>'}
            `;
        }

        async function openInActiveTab(input, titleHint = '') {
            ensureTabs();
            const url = normalizeUrl(input);
            const tab = activeTab();
            tab.url = url;
            tab.title = titleHint || (url.startsWith('azha:search:') ? 'AZHA Search' : (url.startsWith('azha:start') ? 'Start' : new URL(url).hostname.replace(/^www\./, '')));
            state.activeTabId = tab.id;
            saveState();
            renderTabs();
            document.getElementById('addressBar').value = url.startsWith('azha:search:') ? decodeURIComponent(url.replace('azha:search:', '')) : (url === 'azha:start' ? '' : url);
            document.getElementById('quickInput').value = document.getElementById('addressBar').value;

            if (url === 'azha:start') {
                renderStart();
                return;
            }
            if (url.startsWith('azha:search:')) {
                renderSearch(url.replace('azha:search:', ''));
                return;
            }
            if (hostNeedsTab(url)) {
                showBlocked(url);
                return;
            }
            hideBlocked();
            document.getElementById('viewer').src = url;
            addHistory(tab.title, url);
        }

        function newTab(url = 'azha:start', title = 'Start') {
            state.tabs.push({ id: crypto.randomUUID(), title, url });
            state.activeTabId = state.tabs[state.tabs.length - 1].id;
            saveState();
            renderTabs();
            openInActiveTab(url, title);
        }

        function closeTab(tabId) {
            state.tabs = state.tabs.filter((tab) => tab.id !== tabId);
            ensureTabs();
            saveState();
            renderTabs();
            openInActiveTab(activeTab().url, activeTab().title);
        }

        function switchTab(tabId) {
            state.activeTabId = tabId;
            saveState();
            renderTabs();
            openInActiveTab(activeTab().url, activeTab().title);
        }

        function saveBookmark() {
            const tab = activeTab();
            if (!tab || !tab.url || tab.url.startsWith('azha:')) return;
            state.bookmarks = [{ title: tab.title, url: tab.url }, ...state.bookmarks.filter((item) => item.url !== tab.url)].slice(0, 30);
            saveState();
            renderSaved();
        }

        function openBookmark(index) {
            const item = state.bookmarks[index];
            if (item) openInActiveTab(item.url, item.title);
        }

        function removeBookmark(index) {
            state.bookmarks.splice(index, 1);
            saveState();
            renderSaved();
        }

        function openHistory(index) {
            const item = state.history[index];
            if (item) openInActiveTab(item.url, item.title);
        }

        function removeHistory(index) {
            state.history.splice(index, 1);
            saveState();
            renderSaved();
        }

        document.getElementById('quickOpenButton').addEventListener('click', () => openInActiveTab(document.getElementById('quickInput').value));
        document.getElementById('quickTabButton').addEventListener('click', () => {
            const url = normalizeUrl(document.getElementById('quickInput').value);
            window.open(url.startsWith('azha:search:') ? `data:text/html,AZHA Search only works inside this file.` : url, '_blank', 'noopener,noreferrer');
        });
        document.getElementById('addressBar').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') openInActiveTab(event.target.value);
        });
        document.getElementById('quickInput').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') openInActiveTab(event.target.value);
        });
        document.getElementById('backButton').addEventListener('click', () => {
            try { document.getElementById('viewer').contentWindow.history.back(); } catch {}
        });
        document.getElementById('forwardButton').addEventListener('click', () => {
            try { document.getElementById('viewer').contentWindow.history.forward(); } catch {}
        });
        document.getElementById('reloadButton').addEventListener('click', () => {
            const tab = activeTab();
            if (tab) openInActiveTab(tab.url, tab.title);
        });
        document.getElementById('bookmarkButton').addEventListener('click', saveBookmark);
        document.getElementById('newTabButton').addEventListener('click', () => newTab());
        document.getElementById('closeTabButton').addEventListener('click', () => closeTab(activeTab().id));
        document.getElementById('blockedOpenButton').addEventListener('click', () => {
            if (blockedUrl) window.open(blockedUrl, '_blank', 'noopener,noreferrer');
        });
        document.getElementById('blockedHomeButton').addEventListener('click', () => openInActiveTab('azha:start', 'Start'));

        window.switchTab = switchTab;
        window.closeTab = closeTab;
        window.openBookmark = openBookmark;
        window.removeBookmark = removeBookmark;
        window.openHistory = openHistory;
        window.removeHistory = removeHistory;

        ensureTabs();
        renderTabs();
        renderSaved();
        openInActiveTab(activeTab().url, activeTab().title);
    
