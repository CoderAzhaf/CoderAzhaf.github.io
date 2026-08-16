
// Load the video modal from an external file
fetch('video-modal.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('videoModalContainer').innerHTML = html;
    })
    .catch(error => console.error('Error loading video modal:', error));


// Video Modal Logic
const videoModal = document.getElementById('videoModal');
const closeVideoModal = document.getElementById('closeVideoModal');
const introVideo = document.getElementById('introVideo');

// Show modal on page load
window.addEventListener('load', () => {
    videoModal.style.display = 'flex';
});

// Close modal logic
closeVideoModal.addEventListener('click', () => {
    videoModal.style.display = 'none';
    introVideo.pause();
});

// Show modal after sign-in/sign-up
function showVideoAfterAuth() {
    videoModal.style.display = 'flex';
    introVideo.play();
}

// Example: Call this function after successful sign-in/sign-up
// showVideoAfterAuth();


        const quickLinks = [
            { title: 'Google', description: 'Search, browse, and jump into everyday web tasks quickly.', href: 'https://www.google.com', accent: 'gold' },
            { title: 'ClassLink', description: 'Open your learning dashboard without digging through bookmarks.', href: 'https://launchpad.classlink.com/', accent: 'green' },
            { title: 'YouTube Channel', description: 'Visit the BrosMaxGamerz channel and jump right to your uploads.', href: 'https://www.youtube.com/@BrosMaxGamerz', accent: 'red' },
            { title: 'YouTube', description: 'Open the main YouTube homepage for videos, playlists, and search.', href: 'https://www.youtube.com/', accent: 'blue' },
            { title: 'LaunchPad Pro-Open', description: 'This is an website made when the owner of this web was yonger', href: 'https://coderazhaf.github.io/Pro-Open/', accent: 'violet' }
        ];

        const games = [
            { title: 'Owners House', description: 'A house-themed experience hosted on Vercel.', href: 'https://azhaownershouse.vercel.app', image: 'owners-house.png' },
            { title: 'Hiding Monsters', description: 'A spooky project with a dramatic creature-style preview.', href: 'https://azhahidingmonsters.base44.app', image: 'hiding-monsters.png' },
            { title: 'Aviation Build', description: 'An aviation-themed build with its own custom logo and feel.', href: 'https://azhaaviationbuil.base44.app', image: 'aviation-logo.png' },
            { title: 'Aviation Build Lite', description: 'A lighter aviation build that launches straight from the AZHA games list.', href: 'https://azhaaviationbuillite.bolt.host', image: 'aviation-logo.png' }
        ];

        function openLaunchLink(url) {
            if (/^https?:\/\//i.test(url)) {
                window.open(url, '_blank', 'noopener,noreferrer');
                return false;
            }
            return true;
        }

        function createLinkCard(item) {
            const escapedHref = item.href.replace(/'/g, "\\'");
            return `
                <a class="launch-card accent-${item.accent}" href="${item.href}" target="_blank" rel="noreferrer" onclick="return openLaunchLink('${escapedHref}')">
                    <span class="launch-label">Open</span>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <span class="launch-arrow">Visit site</span>
                </a>
            `;
        }

        function createGameCard(item) {
            return `
                <a class="game-card" href="${item.href}" target="_blank" rel="noreferrer">
                    <img src="${item.image}" alt="${item.title} preview">
                    <div class="game-card-copy">
                        <h3>${item.title}</h3>
                        <p>${item.description}</p>
                        <span>Play now</span>
                    </div>
                </a>
            `;
        }

        document.getElementById('linksGrid').innerHTML = quickLinks.map(createLinkCard).join('');
        document.getElementById('gamesGrid').innerHTML = games.map(createGameCard).join('');

        const currentUser = localStorage.getItem('currentUser');
        const currentUsername = localStorage.getItem('currentUsername');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const welcomeName = document.getElementById('welcomeName');
        const welcomeMeta = document.getElementById('welcomeMeta');
        const logoutButton = document.getElementById('logoutButton');
        const heroActions = document.getElementById('heroActions');
        const profileLogo = document.getElementById('profileLogo');
        const userProfilePic = document.getElementById('userProfilePic');
        const installButton = document.getElementById('installButton');
        let deferredInstallPrompt = null;
        const loaderStartedAt = Date.now();

        if (isLoggedIn && currentUsername) {
            welcomeName.textContent = currentUsername;
            welcomeMeta.textContent = isAdmin
                ? `Signed in as ${currentUser || currentUsername}. Admin tools are available in the admin panel.`
                : `Signed in as ${currentUser || currentUsername}. Your inbox and account tools are ready.`;
            logoutButton.hidden = false;

            if (isAdmin) {
                const adminLink = document.createElement('a');
                adminLink.className = 'button button-secondary';
                adminLink.href = 'Admin.html';
                adminLink.textContent = 'Admin Panel';
                heroActions.insertBefore(adminLink, logoutButton);
            }
        }

        logoutButton?.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentUsername');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('isAdmin');
            window.location.reload();
        });

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredInstallPrompt = event;
            installButton.hidden = false;
        });

        installButton?.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            installButton.hidden = true;
        });

        window.addEventListener('appinstalled', () => {
            installButton.hidden = true;
        });

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                    .then(async (registration) => {
                        await registration.update();
                        const promoteWorker = (worker) => {
                            if (!worker) return;
                            worker.postMessage({ type: 'SKIP_WAITING' });
                        };
                        if (registration.waiting) promoteWorker(registration.waiting);
                        if (registration.installing) promoteWorker(registration.installing);
                        registration.addEventListener('updatefound', () => {
                            promoteWorker(registration.installing);
                        });
                        navigator.serviceWorker.addEventListener('controllerchange', () => {
                            if (sessionStorage.getItem('swReloadedHome') === 'true') return;
                            sessionStorage.setItem('swReloadedHome', 'true');
                            window.location.reload();
                        });
                    })
                    .catch((error) => {
                        console.error('Service worker registration failed', error);
                    });
            });
        }

        async function loadSummary() {
            const query = currentUsername ? `?username=${encodeURIComponent(currentUsername)}` : '';
            try {
                if (currentUsername && typeof getAllUsers === 'function') {
                    const users = await getAllUsers();
                    const currentAccount = users.find((user) => user.username === currentUsername);
                    if (currentAccount?.profilePic) {
                        userProfilePic.src = currentAccount.profilePic;
                        userProfilePic.hidden = false;
                        ['accountToolAvatar', 'messageToolAvatar'].forEach((id) => {
                            const node = document.getElementById(id);
                            if (node) node.src = currentAccount.profilePic;
                        });
                    } else {
                        userProfilePic.hidden = true;
                    }
                }
                const response = await fetch(`/api/site-summary${query}`, { cache: 'no-store' });
                if (!response.ok) throw new Error('Unable to load summary');
                const summary = await response.json();
                document.getElementById('projectCount').textContent = summary.featuredProjects;
                document.getElementById('userCount').textContent = summary.users;
                document.getElementById('storageMode').textContent = summary.storage;
                document.getElementById('storageMode').title = summary.storageDetail || '';
                document.getElementById('messageCount').textContent = summary.messages;
                document.getElementById('unreadCount').textContent = summary.unreadCount;
                document.getElementById('azhaBalance').textContent = summary.currentUserBalance ?? '-';
            } catch (error) {
                document.getElementById('storageMode').textContent = 'offline';
                document.getElementById('storageMode').title = '';
                document.getElementById('messageCount').textContent = '0';
                document.getElementById('unreadCount').textContent = '0';
                document.getElementById('azhaBalance').textContent = '-';
            }
        }

        function escapeText(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[char]));
        }

        function renderNotificationCenter(feed = []) {
            const badge = document.getElementById('notificationBadge');
            const list = document.getElementById('notificationList');
            const unread = feed.filter((entry) => entry.unread).length;
            badge.textContent = unread;
            if (!feed.length) {
                list.innerHTML = `
                    <article class="notification-item">
                        <strong>No notifications yet.</strong>
                        <span class="notification-meta">New messages and meeting invites will appear here.</span>
                    </article>
                `;
                return;
            }
            list.innerHTML = feed.slice(0, 8).map((entry) => `
                <article class="notification-item ${entry.unread ? 'unread' : ''}">
                    <div class="notification-top">
                        <div>
                            <strong>${escapeText(entry.title)}</strong>
                            <span class="notification-meta">${escapeText(entry.body)}<br>${new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        ${entry.unread ? '<span class="mini-badge">new</span>' : ''}
                    </div>
                    <div class="notification-actions">
                        <a class="button button-secondary" href="${entry.url || 'Message.html'}" onclick="markCenterRead('${escapeText(entry.id)}')">Open</a>
                        <button class="button button-ghost" type="button" onclick="dismissCenterItem('${escapeText(entry.id)}')">Dismiss</button>
                    </div>
                </article>
            `).join('');
        }

        function markCenterRead(id) {
            if (!currentUsername || typeof markNotificationAsRead !== 'function') return true;
            markNotificationAsRead(currentUsername, id);
            renderNotificationCenter(getNotificationFeed(currentUsername));
            return true;
        }

        function dismissCenterItem(id) {
            if (!currentUsername || typeof clearNotificationItem !== 'function') return;
            clearNotificationItem(currentUsername, id);
            renderNotificationCenter(getNotificationFeed(currentUsername));
        }

        async function enableHomeNotifications() {
            if (typeof requestNotificationAccess !== 'function') return;
            const permission = await requestNotificationAccess();
            if (permission === 'granted') {
                alert('Notifications are enabled on this device.');
            } else if (permission === 'denied') {
                alert('Notifications are blocked in this browser right now.');
            }
        }

        loadSummary();
        window.openLaunchLink = openLaunchLink;
        window.markCenterRead = markCenterRead;
        window.dismissCenterItem = dismissCenterItem;
        document.getElementById('enableHomeNotifications').addEventListener('click', enableHomeNotifications);
        if (currentUsername && typeof getNotificationFeed === 'function') {
            renderNotificationCenter(getNotificationFeed(currentUsername));
            if (typeof startInboxPolling === 'function') {
                startInboxPolling({
                    username: currentUsername,
                    intervalMs: 2500,
                    onInbox: async (_inbox, feed) => {
                        renderNotificationCenter(feed || getNotificationFeed(currentUsername));
                        loadSummary();
                    }
                });
            }
        }
        window.addEventListener('load', () => {
            const loader = document.getElementById('appLoader');
            const elapsed = Date.now() - loaderStartedAt;
            const delay = Math.max(900 - elapsed, 0);
            window.setTimeout(() => {
                loader.classList.add('is-hidden');
                window.setTimeout(() => loader.remove(), 320);
            }, delay);
        });
    
