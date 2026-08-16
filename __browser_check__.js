
        let currentUser = null;
        let browserProfile = null;
        let activeTabId = '';
        let blockedUrl = '';

        const quickLinks = [
            { title: 'AZHA Launchpad', url: 'index.html', text: 'Back to your launchpad.' },
            { title: 'Messages', url: 'Message.html', text: 'Open your inbox.' },
            { title: 'Meetings', url: 'Meetings.html', text: 'Jump into meetings.' },
            { title: 'Profile', url: 'Profile.html', text: 'Manage your account.' }
        ];
        const forceExternalHosts = [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'music.youtube.com',
            'google.com',
            'www.google.com',
            'accounts.google.com',
            'microsoft.com',
            'www.microsoft.com',
            'login.microsoftonline.com'
        ];

        function escapeText(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function applyTheme(theme) {
            document.body.className = `theme-${theme || 'midnight'}`;
        }

        function cleanLines(value) {
            return String(value || '')
                .split(/\r?\n/)
                .map((item) => item.trim().toLowerCase())
                .filter(Boolean);
        }

        function normalizeUrl(raw) {
            const value = String(raw || '').trim();
            if (!value) return '';
            if (['index.html', 'Message.html', 'Meetings.html', 'Profile.html', 'contact.html'].includes(value)) return value;
            if (/^https?:\/\//i.test(value)) return value;
            if (value.includes(' ') || !value.includes('.')) return '';
            return `https://${value}`;
        }

        function getHost(url) {
            try {
                return new URL(url, window.location.origin).hostname.toLowerCase();
            } catch (error) {
                return '';
            }
        }

        function ensureProfileShape(profile) {
            return {
                homeUrl: profile?.homeUrl || 'https://start.coderazhaf.local',
                theme: profile?.theme || 'midnight',
                tabs: Array.isArray(profile?.tabs) && profile.tabs.length ? profile.tabs : [{ id: 'home-tab', title: 'Start', url: 'https://start.coderazhaf.local' }],
                activeTabId: profile?.activeTabId || (profile?.tabs?.[0]?.id || 'home-tab'),
                bookmarks: Array.isArray(profile?.bookmarks) ? profile.bookmarks : [],
                history: Array.isArray(profile?.history) ? profile.history : [],
                organization: {
                    name: profile?.organization?.name || '',
                    type: profile?.organization?.type || 'personal',
                    emailDomain: profile?.organization?.emailDomain || '',
                    logoText: profile?.organization?.logoText || 'AZHA',
                    managed: {
                        enabled: Boolean(profile?.organization?.managed?.enabled),
                        by: profile?.organization?.managed?.by || ''
                    },
                    managedBookmarks: Array.isArray(profile?.organization?.managedBookmarks) ? profile.organization.managedBookmarks : []
                },
                controls: {
                    blockedDomains: Array.isArray(profile?.controls?.blockedDomains) ? profile.controls.blockedDomains : [],
                    allowedDomains: Array.isArray(profile?.controls?.allowedDomains) ? profile.controls.allowedDomains : [],
                    strictMode: Boolean(profile?.controls?.strictMode),
                    studentSafeMode: Boolean(profile?.controls?.studentSafeMode)
                },
                updatedAt: profile?.updatedAt || ''
            };
        }

        function getActiveTab() {
            return (browserProfile.tabs || []).find((tab) => tab.id === activeTabId) || browserProfile.tabs[0];
        }

        function shouldBlock(url) {
            const host = getHost(url);
            if (!host) return false;
            const controls = browserProfile.controls || {};
            const blocked = controls.blockedDomains || [];
            const allowed = controls.allowedDomains || [];
            if (blocked.some((item) => host === item || host.endsWith(`.${item}`))) return true;
            if (controls.strictMode && allowed.length && !allowed.some((item) => host === item || host.endsWith(`.${item}`))) return true;
            if (controls.studentSafeMode && /(adult|porn|casino|bet|gambl)/i.test(host)) return true;
            return false;
        }

        function shouldForceExternal(url) {
            const host = getHost(url);
            if (!host) return false;
            return forceExternalHosts.some((item) => host === item || host.endsWith(`.${item}`));
        }

        function buildDestination(query) {
            const directUrl = normalizeUrl(query);
            if (directUrl) {
                return { mode: 'url', title: directUrl, url: directUrl };
            }
            return {
                mode: 'search',
                title: `AZHA Search: ${query}`,
                url: `azha-search:${encodeURIComponent(query)}`
            };
        }

        function buildSearchResults(query) {
            const lower = String(query || '').toLowerCase();
            const managed = browserProfile.organization.managedBookmarks || [];
            const bookmarkMatches = (browserProfile.bookmarks || []).map((item) => ({ ...item, text: item.url }));
            const historyMatches = (browserProfile.history || []).map((item) => ({ ...item, text: item.url }));
            const pool = [...managed, ...quickLinks, ...bookmarkMatches, ...historyMatches];
            const seen = new Set();
            return pool.filter((item) => {
                const key = `${item.title}|${item.url}`;
                if (seen.has(key)) return false;
                const hit = `${item.title} ${item.url} ${item.text || ''}`.toLowerCase().includes(lower);
                if (hit) seen.add(key);
                return hit;
            }).slice(0, 18);
        }

        function renderTiles(items, heading) {
            document.getElementById('resultsHeading').textContent = heading;
            const grid = document.getElementById('resultsGrid');
            if (!items.length) {
                grid.innerHTML = '<div class="empty">No AZHA matches yet. Type a full website like example.com to open it.</div>';
                return;
            }
            grid.innerHTML = items.map((item) => `
                <article class="site-card">
                    <strong>${escapeText(item.title)}</strong>
                    <p>${escapeText(item.text || item.url)}</p>
                    <button type="button" class="secondary" onclick="openSavedLink('${escapeText(item.url)}', '${escapeText(item.title)}')">Open</button>
                </article>
            `).join('');
        }

        function renderTabs() {
            document.getElementById('tabsBar').innerHTML = (browserProfile.tabs || []).map((tab) => `
                <div class="tab-chip ${tab.id === activeTabId ? 'active' : ''}">
                    <strong onclick="switchTab('${escapeText(tab.id)}')">${escapeText(tab.title)}</strong>
                    <button type="button" class="ghost" onclick="closeTab('${escapeText(tab.id)}')">x</button>
                </div>
            `).join('');
        }

        function renderList(targetId, items, emptyText, onOpen, onRemove) {
            const container = document.getElementById(targetId);
            if (!items.length) {
                container.innerHTML = `<div class="empty">${emptyText}</div>`;
                return;
            }
            container.innerHTML = items.map((item) => `
                <article class="list-item">
                    <strong>${escapeText(item.title)}</strong>
                    <p class="note">${escapeText(item.url)}</p>
                    <div class="row">
                        <button type="button" class="secondary" onclick="${onOpen}('${escapeText(item.url)}', '${escapeText(item.title)}')">Open</button>
                        ${onRemove ? `<button type="button" class="ghost" onclick="${onRemove}('${escapeText(item.id)}')">Remove</button>` : ''}
                    </div>
                </article>
            `).join('');
        }

        function updatePanels() {
            const org = browserProfile.organization;
            document.getElementById('workspaceName').value = org.name || '';
            document.getElementById('workspaceType').value = org.type || 'personal';
            document.getElementById('workspaceDomain').value = org.emailDomain || '';
            document.getElementById('workspaceLogoText').value = org.logoText || 'AZHA';
            document.getElementById('themePicker').value = browserProfile.theme || 'midnight';
            document.getElementById('homeUrlInput').value = browserProfile.homeUrl || 'https://start.coderazhaf.local';
            document.getElementById('blockedDomains').value = (browserProfile.controls.blockedDomains || []).join('\n');
            document.getElementById('allowedDomains').value = (browserProfile.controls.allowedDomains || []).join('\n');
            document.getElementById('strictModeToggle').checked = Boolean(browserProfile.controls.strictMode);
            document.getElementById('safeModeToggle').checked = Boolean(browserProfile.controls.studentSafeMode);
            document.getElementById('providerBadge').textContent = `${org.logoText || 'AZHA'} Browser`;
            document.getElementById('browserMeta').textContent = org.name
                ? `${org.name} workspace for ${currentUser.username}${org.managed?.enabled ? `, managed by ${org.managed.by || 'organization'}` : ''}.`
                : `Signed in as ${currentUser.username}.`;
            const managed = Boolean(org.managed?.enabled);
            document.getElementById('workspaceName').disabled = managed;
            document.getElementById('workspaceType').disabled = managed;
            document.getElementById('workspaceDomain').disabled = managed;
            document.getElementById('workspaceLogoText').disabled = managed;
            document.getElementById('saveWorkspaceButton').disabled = managed;
            document.getElementById('blockedDomains').disabled = managed;
            document.getElementById('allowedDomains').disabled = managed;
            document.getElementById('strictModeToggle').disabled = managed;
            document.getElementById('safeModeToggle').disabled = managed;
            document.getElementById('saveControlsButton').disabled = managed;
            document.getElementById('managedLinkTitle').disabled = managed;
            document.getElementById('managedLinkUrl').disabled = managed;
            document.getElementById('addManagedLinkButton').disabled = managed;
            renderTabs();
            renderList('bookmarkList', browserProfile.bookmarks || [], 'No bookmarks yet.', 'openSavedLink', 'removeBookmark');
            renderList('historyList', (browserProfile.history || []).slice(0, 20), 'No history yet.', 'openSavedLink', '');
            renderList('managedLinksList', browserProfile.organization.managedBookmarks || [], 'No managed links yet.', 'openSavedLink', 'removeManagedLink');
            renderTiles([...browserProfile.organization.managedBookmarks, ...quickLinks], 'Start Page');
        }

        async function persistProfile(nextProfile) {
            browserProfile = ensureProfileShape(await updateBrowserProfile(nextProfile));
            applyTheme(browserProfile.theme);
            updatePanels();
        }

        async function addToHistory(page) {
            const nextHistory = [
                {
                    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                    title: page.title,
                    url: page.url,
                    visitedAt: new Date().toISOString()
                },
                ...(browserProfile.history || []).filter((item) => item.url !== page.url)
            ].slice(0, 60);
            await persistProfile({
                ...browserProfile,
                history: nextHistory,
                updatedAt: new Date().toISOString()
            });
        }

        function showBlocked(url, mode = 'blocked') {
            blockedUrl = url;
            document.getElementById('blockedHeading').textContent = mode === 'external' ? 'Open In Tab' : 'Blocked';
            document.getElementById('blockedText').textContent = mode === 'external'
                ? `${url} opens in a tab only.`
                : `${url} is blocked by your controls.`;
            document.getElementById('blockedPanel').classList.remove('hidden');
            document.querySelector('.frame-shell').classList.add('hidden');
        }

        function hideBlocked() {
            document.getElementById('blockedPanel').classList.add('hidden');
            document.querySelector('.frame-shell').classList.remove('hidden');
        }

        async function openPage(url, title, options = {}) {
            const tab = getActiveTab();
            if (!tab) return;
            tab.url = url;
            tab.title = title || url;
            document.getElementById('currentTitle').textContent = tab.title;
            document.getElementById('currentUrl').textContent = tab.url;
            document.getElementById('addressBar').value = tab.url;

            if (url === 'https://start.coderazhaf.local') {
                hideBlocked();
                document.getElementById('browserFrame').src = 'about:blank';
                renderTiles([...browserProfile.organization.managedBookmarks, ...quickLinks], 'Start Page');
            } else if (url.startsWith('azha-search:')) {
                hideBlocked();
                document.getElementById('browserFrame').src = 'about:blank';
                const query = decodeURIComponent(url.replace('azha-search:', ''));
                renderTiles(buildSearchResults(query), `AZHA Search: ${query}`);
            } else if (shouldForceExternal(url)) {
                document.getElementById('browserFrame').src = 'about:blank';
                showBlocked(url, 'external');
            } else if (shouldBlock(url)) {
                document.getElementById('browserFrame').src = 'about:blank';
                showBlocked(url, 'blocked');
            } else {
                hideBlocked();
                renderTiles([...browserProfile.organization.managedBookmarks, ...quickLinks], 'Start Page');
                document.getElementById('browserFrame').src = url;
            }

            await persistProfile({
                ...browserProfile,
                tabs: browserProfile.tabs,
                activeTabId,
                updatedAt: new Date().toISOString()
            });

            if (!options.skipHistory && !url.startsWith('azha-search:') && url !== 'https://start.coderazhaf.local') {
                await addToHistory({ title: tab.title, url: tab.url });
            }
        }

        async function switchTab(id) {
            activeTabId = id;
            browserProfile.activeTabId = id;
            const tab = getActiveTab();
            await openPage(tab.url, tab.title, { skipHistory: true });
        }

        async function createTab(url, title) {
            const tab = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                title: title || 'New tab',
                url: url || browserProfile.homeUrl || 'https://start.coderazhaf.local'
            };
            browserProfile.tabs = [...(browserProfile.tabs || []), tab].slice(-8);
            activeTabId = tab.id;
            browserProfile.activeTabId = tab.id;
            await persistProfile(browserProfile);
            await openPage(tab.url, tab.title, { skipHistory: true });
        }

        async function closeTab(id) {
            if ((browserProfile.tabs || []).length <= 1) {
                showMessage('Keep at least one tab open.', false);
                return;
            }
            browserProfile.tabs = browserProfile.tabs.filter((tab) => tab.id !== id);
            if (activeTabId === id) {
                activeTabId = browserProfile.tabs[0].id;
                browserProfile.activeTabId = activeTabId;
            }
            await persistProfile(browserProfile);
            const tab = getActiveTab();
            await openPage(tab.url, tab.title, { skipHistory: true });
        }

        async function runAddress(openInTab) {
            const query = document.getElementById('addressBar').value.trim();
            if (!query) {
                showMessage('Type a website or search first.', false);
                return;
            }
            const destination = buildDestination(query);
            if (openInTab && destination.mode === 'url') {
                window.open(destination.url, '_blank', 'noopener,noreferrer');
                await addToHistory(destination);
                return;
            }
            if (openInTab) {
                await createTab(destination.url, destination.title);
                return;
            }
            await openPage(destination.url, destination.title);
        }

        async function saveBookmark() {
            const tab = getActiveTab();
            if (!tab?.url || tab.url.startsWith('azha-search:') || tab.url === 'https://start.coderazhaf.local') {
                showMessage('Open a real page first.', false);
                return;
            }
            if ((browserProfile.bookmarks || []).some((item) => item.url === tab.url)) {
                showMessage('That bookmark already exists.', false);
                return;
            }
            const nextBookmarks = [
                {
                    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                    title: tab.title,
                    url: tab.url,
                    createdAt: new Date().toISOString()
                },
                ...(browserProfile.bookmarks || [])
            ].slice(0, 30);
            await persistProfile({
                ...browserProfile,
                bookmarks: nextBookmarks,
                updatedAt: new Date().toISOString()
            });
            showMessage('Bookmark saved.', true);
        }

        async function setHomePage() {
            const tab = getActiveTab();
            if (!tab?.url) return;
            await persistProfile({
                ...browserProfile,
                homeUrl: tab.url,
                updatedAt: new Date().toISOString()
            });
            showMessage('Home saved.', true);
        }

        async function saveWorkspace() {
            await persistProfile({
                ...browserProfile,
                organization: {
                    ...browserProfile.organization,
                    name: document.getElementById('workspaceName').value.trim(),
                    type: document.getElementById('workspaceType').value,
                    emailDomain: document.getElementById('workspaceDomain').value.trim(),
                    logoText: document.getElementById('workspaceLogoText').value.trim() || 'AZHA',
                    managedBookmarks: browserProfile.organization.managedBookmarks || []
                },
                updatedAt: new Date().toISOString()
            });
            showMessage('Workspace saved.', true);
        }

        async function saveHomeAndTheme() {
            await persistProfile({
                ...browserProfile,
                theme: document.getElementById('themePicker').value,
                homeUrl: normalizeUrl(document.getElementById('homeUrlInput').value.trim()) || 'https://start.coderazhaf.local',
                updatedAt: new Date().toISOString()
            });
            showMessage('Theme and home saved.', true);
        }

        async function saveControls() {
            await persistProfile({
                ...browserProfile,
                controls: {
                    blockedDomains: cleanLines(document.getElementById('blockedDomains').value),
                    allowedDomains: cleanLines(document.getElementById('allowedDomains').value),
                    strictMode: document.getElementById('strictModeToggle').checked,
                    studentSafeMode: document.getElementById('safeModeToggle').checked
                },
                updatedAt: new Date().toISOString()
            });
            showMessage('Controls saved.', true);
        }

        async function addManagedLink() {
            const title = document.getElementById('managedLinkTitle').value.trim();
            const url = normalizeUrl(document.getElementById('managedLinkUrl').value.trim());
            if (!title || !url) {
                showMessage('Enter a title and valid URL.', false);
                return;
            }
            const nextLinks = [
                {
                    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                    title,
                    url
                },
                ...(browserProfile.organization.managedBookmarks || [])
            ].slice(0, 12);
            await persistProfile({
                ...browserProfile,
                organization: {
                    ...browserProfile.organization,
                    managedBookmarks: nextLinks
                },
                updatedAt: new Date().toISOString()
            });
            document.getElementById('managedLinkTitle').value = '';
            document.getElementById('managedLinkUrl').value = '';
        }

        async function removeManagedLink(id) {
            await persistProfile({
                ...browserProfile,
                organization: {
                    ...browserProfile.organization,
                    managedBookmarks: (browserProfile.organization.managedBookmarks || []).filter((item) => item.id !== id)
                },
                updatedAt: new Date().toISOString()
            });
        }

        async function removeBookmark(id) {
            await persistProfile({
                ...browserProfile,
                bookmarks: (browserProfile.bookmarks || []).filter((item) => item.id !== id),
                updatedAt: new Date().toISOString()
            });
        }

        async function openSavedLink(url, title) {
            await openPage(normalizeUrl(url) || url, title || url);
        }

        async function initBrowser() {
            if (!checkLogin()) return;
            currentUser = await getCurrentAccountData();
            browserProfile = ensureProfileShape(await getBrowserProfile(currentUser.username));
            activeTabId = browserProfile.activeTabId || browserProfile.tabs[0].id;
            document.getElementById('browserUser').textContent = currentUser.fullName || currentUser.username;
            document.getElementById('browserAvatar').src = currentUser.profilePic || 'azha-logo.png';
            applyTheme(browserProfile.theme);
            updatePanels();
            const tab = getActiveTab();
            await openPage(tab.url || browserProfile.homeUrl || 'https://start.coderazhaf.local', tab.title || 'Start', { skipHistory: true });
        }

        document.getElementById('goButton').addEventListener('click', () => runAddress(false));
        document.getElementById('newTabButton').addEventListener('click', () => runAddress(true));
        document.getElementById('saveBookmarkButton').addEventListener('click', saveBookmark);
        document.getElementById('setHomeButton').addEventListener('click', setHomePage);
        document.getElementById('openExternalButton').addEventListener('click', () => {
            const tab = getActiveTab();
            if (tab?.url) {
                window.open(tab.url, '_blank', 'noopener,noreferrer');
            }
        });
        document.getElementById('addressBar').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                runAddress(false);
            }
        });
        document.getElementById('saveWorkspaceButton').addEventListener('click', saveWorkspace);
        document.getElementById('saveHomeButton').addEventListener('click', saveHomeAndTheme);
        document.getElementById('saveControlsButton').addEventListener('click', saveControls);
        document.getElementById('addManagedLinkButton').addEventListener('click', addManagedLink);
        document.getElementById('blockedOpenButton').addEventListener('click', () => {
            if (blockedUrl) {
                window.open(blockedUrl, '_blank', 'noopener,noreferrer');
            }
        });
        document.getElementById('blockedBackButton').addEventListener('click', async () => {
            hideBlocked();
            await openPage('https://start.coderazhaf.local', 'Start', { skipHistory: true });
        });

        window.switchTab = switchTab;
        window.closeTab = closeTab;
        window.openSavedLink = openSavedLink;
        window.removeManagedLink = removeManagedLink;
        window.removeBookmark = removeBookmark;

        initBrowser();
    