// @ts-nocheck

console.log('Using backend-first account helpers with local fallback');

const apiBaseUrl = window.location.origin;
let backendAvailable = null;
const MEMBERSHIP_PLANS = {
    PLUS: { key: 'PLUS', label: 'Plus', azincCost: 1, dailyRewardAmount: 35, rewardAmount: 35, rewardInterval: 'day', features: [] },
    PRO: { key: 'PRO', label: 'Pro', azincCost: 2, dailyRewardAmount: 1555, rewardAmount: 1555, rewardInterval: 'day', features: ['messages'] },
    MAX: { key: 'MAX', label: 'MAX', azincCost: 2, dailyRewardAmount: 10555, rewardAmount: 2555, rewardInterval: 'day', features: ['messages'] },
    AZHA: { key: 'AZHA', label: 'AZHA', azincCost: 5, dailyRewardAmount: 99999999999999999, rewardAmount: 99999999999999999, rewardInterval: 'day', features: ['messages', 'meetings', 'shared-storage', 'admin-access'] }
};

const defaultAccounts = {
    AZHA: {
        username: 'AZHA',
        password: 'AZ MOH',
        fullName: 'AZHAFUDDiN MOHAMMED',
        profilePic: '',
        isAdmin: true,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    },
    'Vivvan Dash': {
        username: 'Vivvan Dash',
        password: 'dashpro',
        fullName: 'Vivvan Dash',
        profilePic: '',
        isAdmin: false,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    },
    Alyanuddin: {
        username: 'Alyanuddin',
        password: 'alyanpro',
        fullName: 'Alyanuddin Mohammed',
        profilePic: '',
        isAdmin: false,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    },
    Hacker: {
        username: 'Hacker',
        password: 'Hacker',
        fullName: 'Hacker',
        profilePic: '',
        isAdmin: false,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    },
    Umar: {
        username: 'Umar',
        password: 'Umar',
        fullName: 'Umar Suhail',
        profilePic: '',
        isAdmin: false,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    },
    Suleman: {
        username: 'Suleman',
        password: 'Suleman',
        fullName: 'Suleman Ahsan',
        profilePic: '',
        isAdmin: false,
        warnings: 0,
        status: 'active',
        presenceStatus: 'offline',
        lastSeenAt: ''
    }
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function mergeAccounts(accounts = {}) {
    return {
        ...clone(defaultAccounts),
        ...accounts
    };
}

function mergeBalances(balances = {}, accounts = {}) {
    const validUsers = new Set(['AZHA']);
    Object.values(accounts).forEach((account) => {
        validUsers.add(account.username);
    });
    const merged = {};
    Object.keys({ AZHA: 'INF', ...balances }).forEach((username) => {
        if (!validUsers.has(username)) return;
        merged[username] = username === 'AZHA' ? 'INF' : balances[username];
    });
    validUsers.forEach((username) => {
        if (!Object.prototype.hasOwnProperty.call(merged, username)) {
            merged[username] = username === 'AZHA' ? 'INF' : 0;
        }
    });
    Object.keys(merged).forEach((username) => {
        if (username === 'AZHA') {
            merged[username] = 'INF';
            return;
        }
        if (merged[username] === 'INF' || Number.isNaN(Number(merged[username]))) {
            merged[username] = 0;
            return;
        }
        merged[username] = Number(merged[username] || 0);
    });
    return merged;
}

function getMembershipPlan(planKey) {
    return MEMBERSHIP_PLANS[String(planKey || '').toUpperCase()] || null;
}

function addMembershipInterval(dateInput, interval, count = 1) {
    const next = new Date(dateInput);
    if (Number.isNaN(next.getTime())) return new Date();
    if (interval === 'day') next.setDate(next.getDate() + count);
    else if (interval === 'week') next.setDate(next.getDate() + (7 * count));
    else next.setMonth(next.getMonth() + count);
    return next;
}

function normalizeMembershipView(membership = {}) {
    const plan = getMembershipPlan(membership.planKey);
    return {
        planKey: plan?.key || '',
        label: plan?.label || 'None',
        active: Boolean(plan && membership.status === 'active' && membership.expiresAt && new Date(membership.expiresAt).getTime() > Date.now()),
        expiresAt: String(membership.expiresAt || ''),
        nextRewardAt: String(membership.nextRewardAt || ''),
        rewardAmount: Number(membership.rewardAmount ?? plan?.rewardAmount ?? 0) || 0,
        rewardInterval: String(membership.rewardInterval || plan?.rewardInterval || ''),
        features: Array.isArray(membership.features) ? membership.features : (plan?.features || []),
        azincCost: Number(membership.azincCost ?? plan?.azincCost ?? 0) || 0,
        source: String(membership.source || '')
    };
}

function hasMembershipFeature(account, feature) {
    if (!account) return false;
    if (account.username === 'AZHA') return true;
    const membership = normalizeMembershipView(account.membership || {});
    return membership.active && membership.features.includes(feature);
}

function isManagedOrganizationAccount(account) {
    const org = account?.browserProfile?.organization || {};
    return Boolean(org?.managed?.enabled && ['school', 'work'].includes(String(org?.type || '').toLowerCase()));
}

function sanitizeDisplayBalance(username, balance) {
    if (username === 'AZHA') return 'INF';
    if (balance === 'INF' || Number.isNaN(Number(balance))) return 0;
    return Number(balance || 0);
}

function decorateAccountForClient(account, balance) {
    return {
        ...account,
        membership: normalizeMembershipView(account.membership || {}),
        storagePreference: {
            mode: account.storagePreference?.mode || 'shared',
            status: account.storagePreference?.status || 'shared',
            lastCheckedAt: account.storagePreference?.lastCheckedAt || '',
            lastError: account.storagePreference?.lastError || '',
            supabaseUrl: account.storagePreference?.supabaseUrl || '',
            hasKey: Boolean(account.storagePreference?.supabaseKey),
            sharedAllowed: account.username === 'AZHA' || hasMembershipFeature(account, 'shared-storage')
        },
        accountType: ['school', 'work'].includes(String(account?.browserProfile?.organization?.type || '').toLowerCase())
            ? String(account.browserProfile.organization.type).toLowerCase()
            : 'personal',
        managedAccount: isManagedOrganizationAccount(account),
        presenceStatus: effectivePresenceStatus(account),
        lastSeenAt: account.lastSeenAt || '',
        featureAccess: {
            messages: hasMembershipFeature(account, 'messages'),
            meetings: hasMembershipFeature(account, 'meetings'),
            sharedStorage: hasMembershipFeature(account, 'shared-storage')
        },
        balance: sanitizeDisplayBalance(account.username, balance)
    };
}

function initializeAccounts() {
    localStorage.removeItem('currentProfilePic');
    const existingAccounts = localStorage.getItem('accounts');
    const normalizedAccounts = mergeAccounts(existingAccounts ? JSON.parse(existingAccounts) : {});
    localStorage.setItem('accounts', JSON.stringify(normalizedAccounts));
    if (!localStorage.getItem('messages')) {
        localStorage.setItem('messages', JSON.stringify([]));
    }
    const existingBalances = localStorage.getItem('balances');
    localStorage.setItem('balances', JSON.stringify(mergeBalances(existingBalances ? JSON.parse(existingBalances) : {}, normalizedAccounts)));
    if (!localStorage.getItem('friendsData')) {
        localStorage.setItem('friendsData', JSON.stringify({ requests: [], friendships: [] }));
    }
    if (!localStorage.getItem('chatMessages')) {
        localStorage.setItem('chatMessages', JSON.stringify([]));
    }
}

initializeAccounts();

let serviceWorkerRegistered = false;
let serviceWorkerReloadArmed = false;

async function registerAppServiceWorker() {
    if (serviceWorkerRegistered) return;
    serviceWorkerRegistered = true;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
        await registration.update();

        const promoteWorker = (worker) => {
            if (!worker) return;
            worker.postMessage({ type: 'SKIP_WAITING' });
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                    serviceWorkerReloadArmed = true;
                }
            });
        };

        if (registration.waiting) {
            promoteWorker(registration.waiting);
        }
        if (registration.installing) {
            promoteWorker(registration.installing);
        }

        registration.addEventListener('updatefound', () => {
            promoteWorker(registration.installing);
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!serviceWorkerReloadArmed) return;
            if (sessionStorage.getItem('swReloaded') === 'true') return;
            sessionStorage.setItem('swReloaded', 'true');
            window.location.reload();
        });
    } catch (error) {
        console.warn('Service worker registration failed:', error);
    }
}

registerAppServiceWorker();

function readAccounts() {
    return mergeAccounts(JSON.parse(localStorage.getItem('accounts') || '{}'));
}

function writeAccounts(accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
}

function readMessagesLocal() {
    return JSON.parse(localStorage.getItem('messages') || '[]');
}

function writeMessagesLocal(messages) {
    localStorage.setItem('messages', JSON.stringify(messages));
}

function readFriendsDataLocal() {
    try {
        const raw = JSON.parse(localStorage.getItem('friendsData') || '{"requests":[],"friendships":[]}');
        return {
            requests: Array.isArray(raw?.requests) ? raw.requests : [],
            friendships: Array.isArray(raw?.friendships) ? raw.friendships : []
        };
    } catch (error) {
        return { requests: [], friendships: [] };
    }
}

function writeFriendsDataLocal(data) {
    localStorage.setItem('friendsData', JSON.stringify({
        requests: Array.isArray(data?.requests) ? data.requests : [],
        friendships: Array.isArray(data?.friendships) ? data.friendships : []
    }));
}

function readChatMessagesLocal() {
    try {
        const raw = JSON.parse(localStorage.getItem('chatMessages') || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        return [];
    }
}

function writeChatMessagesLocal(messages) {
    localStorage.setItem('chatMessages', JSON.stringify(Array.isArray(messages) ? messages : []));
}

function friendshipKey(left, right) {
    return [String(left || '').trim().toLowerCase(), String(right || '').trim().toLowerCase()].sort().join('::');
}

function effectivePresenceStatus(account) {
    const raw = String(account?.presenceStatus || 'offline').toLowerCase();
    const lastSeen = Date.parse(String(account?.lastSeenAt || ''));
    if (raw !== 'offline' && (!lastSeen || (Date.now() - lastSeen) > 5 * 60 * 1000)) {
        return 'offline';
    }
    return ['online', 'busy', 'offline'].includes(raw) ? raw : 'offline';
}

function normalizeClientMessage(message = {}) {
    return {
        id: String(message.id || ''),
        from: String(message.from || ''),
        to: String(message.to || ''),
        text: String(message.text || ''),
        kind: String(message.kind || 'message'),
        timestamp: String(message.timestamp || ''),
        read: Boolean(message.read),
        meta: message.meta && typeof message.meta === 'object'
            ? {
                roomCode: String(message.meta.roomCode || ''),
                title: String(message.meta.title || ''),
                startsAt: String(message.meta.startsAt || ''),
                host: String(message.meta.host || ''),
                note: String(message.meta.note || ''),
                joinUrl: String(message.meta.joinUrl || ''),
                replyTo: message.meta.replyTo && typeof message.meta.replyTo === 'object'
                    ? {
                        id: String(message.meta.replyTo.id || ''),
                        from: String(message.meta.replyTo.from || ''),
                        text: String(message.meta.replyTo.text || '')
                    }
                    : null,
                forwardedFrom: message.meta.forwardedFrom && typeof message.meta.forwardedFrom === 'object'
                    ? {
                        id: String(message.meta.forwardedFrom.id || ''),
                        from: String(message.meta.forwardedFrom.from || ''),
                        to: String(message.meta.forwardedFrom.to || ''),
                        text: String(message.meta.forwardedFrom.text || '')
                    }
                    : null
            }
            : {},
        attachments: Array.isArray(message.attachments) ? message.attachments.slice(0, 4) : []
    };
}

function getNotificationSeenKey(username) {
    return `notifiedMessages:${username}`;
}

function getNotificationFeedKey(username) {
    return `notificationFeed:${username}`;
}

function readSeenNotificationIds(username) {
    try {
        return new Set(JSON.parse(localStorage.getItem(getNotificationSeenKey(username)) || '[]'));
    } catch (error) {
        return new Set();
    }
}

function writeSeenNotificationIds(username, ids) {
    localStorage.setItem(getNotificationSeenKey(username), JSON.stringify(Array.from(ids).slice(-300)));
}

function readNotificationFeed(username) {
    try {
        const raw = JSON.parse(localStorage.getItem(getNotificationFeedKey(username)) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (error) {
        return [];
    }
}

function writeNotificationFeed(username, feed) {
    localStorage.setItem(getNotificationFeedKey(username), JSON.stringify(feed.slice(0, 100)));
}

function syncNotificationFeedFromInbox(username, inbox = []) {
    const existing = readNotificationFeed(username);
    const byId = new Map(existing.map((entry) => [entry.id, entry]));
    inbox
        .map(normalizeClientMessage)
        .sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0))
        .forEach((message) => {
            const isInvite = message.kind === 'meeting-invite';
            const previous = byId.get(message.id) || {};
            byId.set(message.id, {
                id: message.id,
                kind: message.kind,
                title: isInvite ? `Meeting invite from ${message.from}` : `New message from ${message.from}`,
                body: isInvite
                    ? (message.meta?.title || message.text || 'Open this invite to join the meeting.')
                    : (message.text || (message.attachments?.length ? 'Sent an attachment.' : 'You received a new message.')),
                from: message.from,
                timestamp: message.timestamp,
                url: isInvite && message.meta?.roomCode
                    ? `/Meetings.html?meeting=${encodeURIComponent(message.meta.roomCode)}`
                    : '/Message.html',
                unread: !message.read,
                roomCode: message.meta?.roomCode || '',
                startsAt: message.meta?.startsAt || '',
                host: message.meta?.host || '',
                dismissed: Boolean(previous.dismissed)
            });
        });
    const nextFeed = Array.from(byId.values())
        .filter((entry) => !entry.dismissed)
        .sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0))
        .slice(0, 100);
    writeNotificationFeed(username, nextFeed);
    return nextFeed;
}

function getNotificationFeed(username) {
    return readNotificationFeed(username);
}

function getUnreadNotificationCount(username) {
    return readNotificationFeed(username).filter((entry) => entry.unread).length;
}

function markNotificationAsRead(username, notificationId) {
    const feed = readNotificationFeed(username).map((entry) => (
        entry.id === notificationId ? { ...entry, unread: false } : entry
    ));
    writeNotificationFeed(username, feed);
    return true;
}

function clearNotificationItem(username, notificationId) {
    const feed = readNotificationFeed(username).filter((entry) => entry.id !== notificationId);
    writeNotificationFeed(username, feed);
    return true;
}

async function requestNotificationAccess() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.requestPermission();
}

async function showDeviceNotification(title, options = {}) {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const permission = Notification.permission === 'granted' ? 'granted' : await requestNotificationAccess();
    if (permission !== 'granted') return false;
    const payload = {
        body: options.body || '',
        icon: 'AZHA.PNG',
        badge: 'channels4profile.jpg',
        image: 'AZHA.PNG',
        tag: options.tag,
        data: { url: options.url || '' },
        renotify: true,
        requireInteraction: Boolean(options.requireInteraction)
    };
    try {
        if (navigator.serviceWorker?.getRegistration) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration?.showNotification) {
                await registration.showNotification(title, payload);
                return true;
            }
        }
        const notification = new Notification(title, payload);
        if (options.url) {
            notification.onclick = () => {
                window.focus();
                window.location.href = options.url;
            };
        }
        return true;
    } catch (error) {
        console.warn('Notification display failed:', error);
        return false;
    }
}

let inboxPollingHandle = null;
let inboxPollingUser = '';
let inboxPollingInitialized = false;

async function startInboxPolling(options = {}) {
    const username = options.username || localStorage.getItem('currentUsername');
    if (!username) return null;
    if (inboxPollingHandle && inboxPollingUser === username) return inboxPollingHandle;
    if (inboxPollingHandle) {
        clearInterval(inboxPollingHandle);
    }
    inboxPollingUser = username;
    inboxPollingInitialized = false;

    const poll = async () => {
        try {
            const inbox = await getInbox(username);
            const normalizedInbox = inbox.map(normalizeClientMessage);
            const notificationFeed = syncNotificationFeedFromInbox(username, normalizedInbox);
            if (typeof options.onInbox === 'function') {
                await options.onInbox(normalizedInbox, notificationFeed);
            }
            const seenIds = readSeenNotificationIds(username);
            if (!inboxPollingInitialized) {
                normalizedInbox.forEach((message) => seenIds.add(message.id));
                writeSeenNotificationIds(username, seenIds);
                inboxPollingInitialized = true;
                return;
            }
            const newUnread = normalizedInbox.filter((message) => !message.read && !seenIds.has(message.id));
            for (const message of newUnread) {
                seenIds.add(message.id);
                const isInvite = message.kind === 'meeting-invite';
                const title = isInvite ? `Meeting invite from ${message.from}` : `New message from ${message.from}`;
                const body = isInvite
                    ? (message.meta?.title || message.text || 'Tap to open your invite.')
                    : (message.text || 'You received a new attachment or message.');
                const targetUrl = isInvite && message.meta?.roomCode
                    ? `/Meetings.html?meeting=${encodeURIComponent(message.meta.roomCode)}`
                    : '/Message.html';
                await showDeviceNotification(title, {
                    body,
                    url: targetUrl,
                    tag: `message-${message.id}`
                });
                showMessage(title, true);
            }
            writeSeenNotificationIds(username, seenIds);
        } catch (error) {
            console.warn('Inbox polling failed:', error);
        }
    };

    await poll();
    inboxPollingHandle = window.setInterval(poll, options.intervalMs || 4000);
    window.addEventListener('focus', poll);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            poll();
        }
    });
    return inboxPollingHandle;
}

function stopInboxPolling() {
    if (inboxPollingHandle) {
        clearInterval(inboxPollingHandle);
        inboxPollingHandle = null;
    }
}

function readBalancesLocal() {
    return mergeBalances(JSON.parse(localStorage.getItem('balances') || '{}'), readAccounts());
}

function writeBalancesLocal(balances) {
    localStorage.setItem('balances', JSON.stringify(balances));
}

function findAccount(username) {
    if (!username) return undefined;
    const lowered = String(username).trim().toLowerCase();
    return Object.values(readAccounts()).find((account) => account.username.toLowerCase() === lowered);
}

async function getAllUsers() {
    if (await hasBackend()) {
        return apiRequest('/api/users');
    }

    const accounts = Object.values(readAccounts());
    const balances = readBalancesLocal();
    return accounts.map((account) => decorateAccountForClient(account, balances[account.username]));
}

function showMessage(message, isSuccess) {
    const div = document.createElement('div');
    div.textContent = message;
    div.className = `message ${isSuccess ? 'success' : 'error'}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        cache: 'no-store',
        ...options
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new Error(payload?.error || 'Request failed');
    }

    return payload;
}

async function hasBackend() {
    if (backendAvailable !== null) return backendAvailable;
    try {
        await apiRequest('/api/health');
        backendAvailable = true;
    } catch (error) {
        backendAvailable = false;
    }
    return backendAvailable;
}

function setSession(account) {
    localStorage.setItem('currentUser', account.fullName);
    localStorage.setItem('currentUsername', account.username);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('isAdmin', account.isAdmin ? 'true' : 'false');
    localStorage.setItem('currentFeatureAccess', JSON.stringify(account.featureAccess || {}));
    localStorage.setItem('currentMembership', JSON.stringify(account.membership || {}));
}

function clearSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('currentFeatureAccess');
    localStorage.removeItem('currentMembership');
}

async function getCurrentAccountData() {
    const username = localStorage.getItem('currentUsername');
    if (!username) return null;
    if (await hasBackend()) {
        const current = await apiRequest(`/api/account/${encodeURIComponent(username)}`);
        setSession(current);
        return current;
    }
    const account = findAccount(username);
    if (!account) return null;
    const balances = readBalancesLocal();
    return decorateAccountForClient(account, balances[account.username]);
}

async function refreshSessionFromServer(username) {
    const currentUsername = localStorage.getItem('currentUsername');
    if (!username || currentUsername !== username) return;
    try {
        const current = await getCurrentAccountData();
        if (!current) return;
        setSession({
            username: current.username,
            fullName: current.fullName,
            isAdmin: current.isAdmin,
            membership: current.membership,
            featureAccess: current.featureAccess
        });
    } catch (error) {
        console.warn('Could not refresh current session state:', error);
    }
}

async function getMembershipPlans() {
    if (await hasBackend()) {
        return apiRequest('/api/membership/plans');
    }
    return Object.values(MEMBERSHIP_PLANS);
}

async function ensureFeatureAccess(feature, options = {}) {
    const current = await getCurrentAccountData();
    const allowed = Boolean(current?.featureAccess?.[feature] || hasMembershipFeature(current, feature));
    if (!allowed && !options.silent) {
        const target = feature === 'meetings' ? 'AZHA' : 'Pro or AZHA';
        showMessage(`${feature[0].toUpperCase() + feature.slice(1)} are locked. Upgrade to ${target}.`, false);
    }
    return { allowed, account: current };
}

async function beginMembershipCheckout(planKey) {
    const username = localStorage.getItem('currentUsername');
    if (!username) {
        showMessage('Sign in first before buying a membership.', false);
        return false;
    }
    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/membership/buy', {
                method: 'POST',
                body: JSON.stringify({ username, planKey })
            });
            if (result?.account && result.account.username === username) {
                setSession(result.account);
            }
        } else {
            const accounts = readAccounts();
            const account = accounts[username];
            const plan = getMembershipPlan(planKey);
            if (!account || !plan) throw new Error('Unable to buy membership right now.');
            const balances = readBalancesLocal();
            const currentBalance = Number(balances[username] || 0);
            if (username !== 'AZHA' && currentBalance < plan.azincCost) {
                throw new Error(`You need ${plan.azincCost} AZHA to buy ${plan.label}.`);
            }
            if (username !== 'AZHA') {
                balances[username] = currentBalance - plan.azincCost;
                writeBalancesLocal(balances);
            }
            account.membership = {
                planKey: plan.key,
                status: 'active',
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                nextRewardAt: new Date().toISOString(),
                rewardInterval: plan.rewardInterval,
                rewardAmount: plan.rewardAmount,
                features: plan.features,
                azincCost: plan.azincCost,
                source: 'azha'
            };
            writeAccounts(accounts);
        }
        await refreshSessionFromServer(username);
        showMessage(`${planKey} membership bought with AZHA.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function claimMembershipReward() {
    const username = localStorage.getItem('currentUsername');
    if (!username) {
        showMessage('Sign in first.', false);
        return null;
    }

    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/membership/claim', {
                method: 'POST',
                body: JSON.stringify({ username })
            });
            showMessage(`Claimed ${result.claimedAmount} AZHA.`, true);
            return result;
        }

        const accounts = readAccounts();
        const account = accounts[username];
        if (!account) throw new Error('User not found');
        const membership = normalizeMembershipView(account.membership || {});
        if (!membership.active) throw new Error('You do not have an active membership to claim from.');
        const expiresAt = new Date(membership.expiresAt);
        let nextRewardAt = new Date(membership.nextRewardAt || new Date().toISOString());
        let claimCount = 0;
        const now = new Date();
        while (nextRewardAt <= now && nextRewardAt < expiresAt && claimCount < 500) {
            claimCount += 1;
            nextRewardAt = addMembershipInterval(nextRewardAt, membership.rewardInterval);
        }
        if (!claimCount) throw new Error(`Next reward is available on ${new Date(membership.nextRewardAt).toLocaleString()}.`);
        const balances = readBalancesLocal();
        balances[username] = Number(balances[username] || 0) + (membership.rewardAmount * claimCount);
        writeBalancesLocal(balances);
        account.membership = {
            ...(account.membership || {}),
            nextRewardAt: nextRewardAt.toISOString()
        };
        writeAccounts(accounts);
        const result = {
            claimedAmount: membership.rewardAmount * claimCount,
            balance: balances[username],
            membership: normalizeMembershipView(account.membership)
        };
        showMessage(`Claimed ${result.claimedAmount} AZHA.`, true);
        return result;
    } catch (error) {
        showMessage(error.message, false);
        return null;
    }
}

async function claimDailyReward() {
    const username = localStorage.getItem('currentUsername');
    if (!username) {
        showMessage('Sign in first.', false);
        return null;
    }

    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/claim-daily-reward', {
                method: 'POST',
                body: JSON.stringify({ username })
            });
            showMessage(`Claimed ${result.rewardAmount} AZHA!`, true);
            return result;
        } else {
            showMessage('Backend not available for daily rewards.', false);
            return null;
        }
    } catch (error) {
        showMessage(error.message, false);
        return null;
    }
}

async function grantFreeMembership(username, planKey) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/admin/membership/grant', {
                method: 'POST',
                body: JSON.stringify({ actor, username, planKey })
            });
            if (result?.account && result.account.username === localStorage.getItem('currentUsername')) {
                setSession(result.account);
            }
        } else {
            if (actor !== 'AZHA') throw new Error('Only AZHA can grant free memberships.');
            const accounts = readAccounts();
            const target = Object.values(accounts).find((entry) => entry.username.toLowerCase() === username.toLowerCase());
            if (!target) throw new Error('User not found');
            const plan = getMembershipPlan(planKey);
            if (!plan) throw new Error('Unknown membership plan');
            target.membership = {
                planKey: plan.key,
                status: 'active',
                expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                nextRewardAt: new Date().toISOString(),
                rewardInterval: plan.rewardInterval,
                rewardAmount: plan.rewardAmount,
                features: plan.features,
                azincCost: plan.azincCost,
                source: 'admin_free'
            };
            writeAccounts(accounts);
        }
        await refreshSessionFromServer(username);
        showMessage(`${planKey} membership granted to ${username}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function clearMembership(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/admin/membership/clear', {
                method: 'POST',
                body: JSON.stringify({ actor, username })
            });
            if (result?.account && result.account.username === localStorage.getItem('currentUsername')) {
                setSession(result.account);
            }
        } else {
            if (actor !== 'AZHA') throw new Error('Only AZHA can remove memberships.');
            const accounts = readAccounts();
            const target = Object.values(accounts).find((entry) => entry.username.toLowerCase() === username.toLowerCase());
            if (!target) throw new Error('User not found');
            target.membership = {};
            writeAccounts(accounts);
        }
        await refreshSessionFromServer(username);
        showMessage(`Membership removed from ${username}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function cancelOwnMembership() {
    const username = localStorage.getItem('currentUsername');
    if (!username) {
        showMessage('Sign in first.', false);
        return false;
    }
    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/membership/cancel', {
                method: 'POST',
                body: JSON.stringify({ username })
            });
            if (result?.account) {
                setSession(result.account);
            }
        } else {
            const accounts = readAccounts();
            const account = accounts[username];
            if (!account) throw new Error('User not found');
            account.membership = {};
            writeAccounts(accounts);
            setSession(decorateAccountForClient(account, readBalancesLocal()[username]));
        }
        showMessage('Membership cancelled.', true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

function isUserLoggedIn() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const hasUsername = !!localStorage.getItem('currentUsername');
    return isLoggedIn && hasUsername;
}

function checkLogin() {
    if (!isUserLoggedIn()) {
        window.location.href = 'Getin.html';
        return false;
    }
    startPresenceHeartbeat('online');
    return true;
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showMessage('Please enter both username and password', false);
        return;
    }

    try {
        if (await hasBackend()) {
            const account = await apiRequest('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            setSession(account);
        } else {
            const account = findAccount(username);
            if (!account || account.password !== password) {
                throw new Error('Invalid username or password');
            }
            if (account.status === 'banned') {
                throw new Error('This account has been banned');
            }
            setSession(account);
        }

        showMessage('Login successful! Redirecting...', true);
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        setPresenceStatus('online').catch(() => {});
        // Show intro video on login
        sessionStorage.setItem('showIntroVideoOnLoad', 'true');
        setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } catch (error) {
        showMessage(error.message, false);
    }
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showSignup() {
    if (window.__managedSignupLocked) {
        showMessage('School and work accounts cannot create new accounts.', false);
        return;
    }
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

async function signup() {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const fullName = document.getElementById('signup-fullname').value.trim();

    if (!username || !password || !fullName) {
        showMessage('Please fill in all fields', false);
        return;
    }

    const actor = localStorage.getItem('currentUsername') || '';
    if (actor) {
        const current = await getCurrentAccountData();
        if (current?.managedAccount) {
            showMessage('School and work accounts cannot create new accounts.', false);
            return;
        }
    }

    try {
        if (await hasBackend()) {
            await apiRequest('/api/signup', {
                method: 'POST',
                body: JSON.stringify({ username, password, fullName, actor })
            });
        } else {
            if (actor) {
                const current = findAccount(actor);
                if (current && isManagedOrganizationAccount(current)) {
                    throw new Error('School and work accounts cannot create new accounts.');
                }
            }
            if (findAccount(username)) {
                throw new Error('Username already exists');
            }
            const accounts = readAccounts();
            accounts[username] = { username, password, fullName, profilePic: '', isAdmin: false, warnings: 0, status: 'active', presenceStatus: 'offline', lastSeenAt: '', membership: {}, browserProfile: { organization: { type: 'personal', managed: { enabled: false, by: '' }, managedBookmarks: [] } } };
            writeAccounts(accounts);
            const balances = readBalancesLocal();
            balances[username] = 0;
            writeBalancesLocal(balances);
        }

        showMessage('Account created successfully! You can now login.', true);
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-password').value = '';
        document.getElementById('signup-fullname').value = '';
        showLogin();
    } catch (error) {
        showMessage(error.message, false);
    }
}

function logout() {
    setPresenceStatus('offline').catch(() => {});
    clearSession();
    showMessage('Logged out successfully. Redirecting...', true);
    setTimeout(() => { window.location.href = 'Getin.html'; }, 800);
}

async function makeAdmin(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/makeadmin', {
                method: 'POST',
                body: JSON.stringify({ actor, username })
            });
        } else {
            if (actor !== 'AZHA') throw new Error('Only AZHA can give admin access.');
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            accounts[key].isAdmin = true;
            writeAccounts(accounts);
        }
        showMessage(`${username} is now an admin!`, true);
        if (typeof showAdminPanel === 'function') showAdminPanel();
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function removeAdmin(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/removeadmin', {
                method: 'POST',
                body: JSON.stringify({ actor, username })
            });
        } else {
            if (actor !== 'AZHA') throw new Error('Only AZHA can remove admin access.');
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            if (accounts[key].username === 'AZHA') throw new Error('Cannot remove admin from AZHA');
            accounts[key].isAdmin = false;
            writeAccounts(accounts);
        }
        showMessage(`${username} is no longer an admin.`, true);
        if (typeof showAdminPanel === 'function') showAdminPanel();
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function warnUser(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/warn', {
                method: 'POST',
                body: JSON.stringify({ actor, username })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            accounts[key].warnings = (accounts[key].warnings || 0) + 1;
            writeAccounts(accounts);
        }
        showMessage(`Warning issued to ${username}.`, true);
        if (typeof showAdminPanel === 'function') showAdminPanel();
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function toggleBan(username, action) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/ban', {
                method: 'POST',
                body: JSON.stringify({ actor, username, action })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            accounts[key].status = action === 'unban' ? 'active' : 'banned';
            writeAccounts(accounts);
        }
        showMessage(`${username} has been ${action === 'unban' ? 'active' : 'banned'}.`, true);
        if (typeof showAdminPanel === 'function') showAdminPanel();
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function deleteUserAccount(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest(`/api/users/${encodeURIComponent(username)}`, {
                method: 'DELETE',
                body: JSON.stringify({ actor })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            if (accounts[key].username === 'AZHA') throw new Error('Cannot delete AZHA');
            delete accounts[key];
            writeAccounts(accounts);
            const balances = readBalancesLocal();
            delete balances[username];
            writeBalancesLocal(balances);
        }
        showMessage(`Account ${username} deleted.`, true);
        if (typeof showAdminPanel === 'function') showAdminPanel();
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function getBalance(username) {
    if (await hasBackend()) {
        const data = await apiRequest(`/api/balances?username=${encodeURIComponent(username)}`);
        return data[username] || 0;
    }
    const balances = readBalancesLocal();
    return balances[username] || 0;
}

async function giveAZINC(targetUsername, amount) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/azinc', {
                method: 'POST',
                body: JSON.stringify({ actor, username: targetUsername, amount })
            });
        } else {
            if (localStorage.getItem('isAdmin') !== 'true') throw new Error('Only admins can give AZHA.');
            const balances = readBalancesLocal();
            if (targetUsername === 'AZHA') {
                balances.AZHA = 'INF';
            } else {
                const current = Number(balances[targetUsername] || 0);
                balances[targetUsername] = current + amount;
            }
            writeBalancesLocal(balances);
        }
        showMessage(`Gave ${amount} AZHA to ${targetUsername}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function resetAZINC(targetUsername) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/reset-balance', {
                method: 'POST',
                body: JSON.stringify({ actor, username: targetUsername })
            });
        } else {
            if (localStorage.getItem('isAdmin') !== 'true') throw new Error('Only admins can reset AZHA.');
            const balances = readBalancesLocal();
            if (targetUsername === 'AZHA') {
                balances.AZHA = 'INF';
            } else {
                balances[targetUsername] = 0;
            }
            writeBalancesLocal(balances);
        }
        showMessage(`${targetUsername}'s AZHA has been reset.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function setExactAZHABalance(targetUsername, amount) {
    const actor = localStorage.getItem('currentUsername');
    let nextAmount;
    
    if (amount === 'INF') {
        nextAmount = 'INF';
    } else {
        nextAmount = Math.max(0, Math.floor(Number(amount) || 0));
    }
    
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/set-balance', {
                method: 'POST',
                body: JSON.stringify({ actor, username: targetUsername, amount: nextAmount })
            });
        } else {
            if (actor !== 'AZHA') throw new Error('Only AZHA can set exact AZHA balances.');
            const balances = readBalancesLocal();
            balances[targetUsername] = nextAmount;
            writeBalancesLocal(balances);
        }
        const displayAmount = nextAmount === 'INF' ? '∞ (Infinite)' : nextAmount;
        showMessage(`${targetUsername}'s AZHA is now ${displayAmount}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function updateUserFromAdmin(originalUsername, payload) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest(`/api/admin/users/${encodeURIComponent(originalUsername)}`, {
                method: 'PUT',
                body: JSON.stringify({ actor, ...payload })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === originalUsername.toLowerCase());
            if (!key) throw new Error('User not found');
            const target = accounts[key];
            const nextUsername = String(payload.username || '').trim();
            const nextPassword = String(payload.password || '').trim() || (actor === 'AZHA' ? target.password : '');
            if (!nextUsername || !nextPassword) throw new Error('Password is required unless AZHA leaves it blank to keep the current one');
            const duplicate = Object.values(accounts).find((account) => account.username.toLowerCase() === nextUsername.toLowerCase() && account.username !== target.username);
            if (duplicate) throw new Error('Username already exists');

            delete accounts[key];
            accounts[nextUsername] = {
                ...target,
                username: nextUsername,
                fullName: payload.fullName || target.fullName,
                password: nextPassword,
                profilePic: payload.profilePic ?? target.profilePic ?? '',
                browserProfile: payload.browserProfile ?? target.browserProfile ?? undefined
            };
            writeAccounts(accounts);

            const balances = readBalancesLocal();
            if (Object.prototype.hasOwnProperty.call(balances, target.username)) {
                balances[nextUsername] = balances[target.username];
                delete balances[target.username];
                writeBalancesLocal(balances);
            }

            const messages = readMessagesLocal().map((message) => ({
                ...message,
                from: message.from === target.username ? nextUsername : message.from,
                to: message.to === target.username ? nextUsername : message.to
            }));
            writeMessagesLocal(messages);
        }
        showMessage(`${originalUsername} updated successfully.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function createManagedAccount(payload) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/admin/create-managed-account', {
                method: 'POST',
                body: JSON.stringify({ actor, ...payload })
            });
        } else {
            const accounts = readAccounts();
            const username = String(payload.username || '').trim();
            const password = String(payload.password || '').trim();
            const fullName = String(payload.fullName || '').trim();
            const accountType = String(payload.accountType || '').trim().toLowerCase();
            if (!username || !password || !fullName) throw new Error('Username, password, and full name are required');
            if (!['school', 'work'].includes(accountType)) throw new Error('Choose school or work account type');
            if (findAccount(username)) throw new Error('Username already exists');
            accounts[username] = {
                username,
                password,
                fullName,
                profilePic: '',
                isAdmin: false,
                warnings: 0,
                status: 'active',
                membership: {},
                browserProfile: {
                    organization: {
                        name: String(payload.orgName || '').trim(),
                        type: accountType,
                        emailDomain: String(payload.orgDomain || '').trim(),
                        logoText: String(payload.orgLogoText || 'AZHA').trim() || 'AZHA',
                        managed: { enabled: true, by: actor || 'Admin' },
                        managedBookmarks: []
                    }
                }
            };
            writeAccounts(accounts);
            const balances = readBalancesLocal();
            balances[username] = 0;
            writeBalancesLocal(balances);
        }
        showMessage('Managed account created.', true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function updateOwnProfile(payload) {
    const actor = localStorage.getItem('currentUsername');
    try {
        let result;
        if (await hasBackend()) {
            result = await apiRequest('/api/profile', {
                method: 'PUT',
                body: JSON.stringify({ actor, ...payload })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === actor.toLowerCase());
            if (!key) throw new Error('User not found');
            const target = accounts[key];
            const nextUsername = String(payload.username || '').trim();
            if (!nextUsername || !payload.password || !payload.fullName) {
                throw new Error('Username, password, and full name are required');
            }
            const duplicate = Object.values(accounts).find((account) => account.username.toLowerCase() === nextUsername.toLowerCase() && account.username !== target.username);
            if (duplicate) throw new Error('Username already exists');

            delete accounts[key];
            accounts[nextUsername] = {
                ...target,
                username: nextUsername,
                fullName: payload.fullName,
                password: payload.password,
                profilePic: payload.profilePic ?? target.profilePic ?? ''
            };
            writeAccounts(accounts);

            const balances = readBalancesLocal();
            if (Object.prototype.hasOwnProperty.call(balances, target.username)) {
                balances[nextUsername] = balances[target.username];
                delete balances[target.username];
                writeBalancesLocal(balances);
            }

            const messages = readMessagesLocal().map((message) => ({
                ...message,
                from: message.from === target.username ? nextUsername : message.from,
                to: message.to === target.username ? nextUsername : message.to
            }));
            writeMessagesLocal(messages);

            result = {
                username: nextUsername,
                fullName: payload.fullName,
                profilePic: payload.profilePic ?? '',
                isAdmin: accounts[nextUsername].isAdmin,
                membership: normalizeMembershipView(accounts[nextUsername].membership || {}),
                featureAccess: {
                    messages: hasMembershipFeature(accounts[nextUsername], 'messages'),
                    meetings: hasMembershipFeature(accounts[nextUsername], 'meetings')
                }
            };
        }

        setSession({
            username: result.username,
            fullName: result.fullName,
            isAdmin: result.isAdmin,
            membership: result.membership,
            featureAccess: result.featureAccess
        });
        showMessage('Profile updated successfully.', true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function configurePersonalStorage(payload) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            const result = await apiRequest('/api/storage/configure', {
                method: 'POST',
                body: JSON.stringify({ actor, ...payload })
            });
            if (result?.account?.username === actor) {
                setSession(result.account);
            }
            showMessage(result?.message || 'Storage updated.', true);
            return result?.account || null;
        }
        throw new Error('Personal storage switching needs the backend to be online.');
    } catch (error) {
        showMessage(error.message, false);
        return null;
    }
}

async function getBrowserProfile(username) {
    const targetUsername = String(username || localStorage.getItem('currentUsername') || '').trim();
    if (!targetUsername) return null;
    if (await hasBackend()) {
        const result = await apiRequest(`/api/browser-profile/${encodeURIComponent(targetUsername)}`);
        return result.browserProfile;
    }
    const key = `browserProfile:${targetUsername.toLowerCase()}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {
        homeUrl: 'https://start.coderazhaf.local',
        searchEngine: 'azha',
        theme: 'midnight',
        tabs: [{ id: 'home-tab', title: 'Start', url: 'https://start.coderazhaf.local' }],
        activeTabId: 'home-tab',
        bookmarks: [],
        history: [],
        organization: {
            name: '',
            type: 'personal',
            emailDomain: '',
            logoText: 'AZHA',
            managedBookmarks: []
        },
        controls: {
            blockedDomains: [],
            allowedDomains: [],
            strictMode: false,
            studentSafeMode: false
        },
        updatedAt: ''
    };
}

async function updateBrowserProfile(browserProfile) {
    const actor = localStorage.getItem('currentUsername');
    if (!actor) {
        showMessage('Sign in first.', false);
        return null;
    }
    if (await hasBackend()) {
        const result = await apiRequest(`/api/browser-profile/${encodeURIComponent(actor)}`, {
            method: 'PUT',
            body: JSON.stringify({ actor, browserProfile })
        });
        return result.browserProfile;
    }
    const key = `browserProfile:${actor.toLowerCase()}`;
    const next = {
        homeUrl: String(browserProfile?.homeUrl || 'https://start.coderazhaf.local'),
        searchEngine: String(browserProfile?.searchEngine || 'azha'),
        theme: String(browserProfile?.theme || 'midnight'),
        tabs: Array.isArray(browserProfile?.tabs) ? browserProfile.tabs : [{ id: 'home-tab', title: 'Start', url: 'https://start.coderazhaf.local' }],
        activeTabId: String(browserProfile?.activeTabId || 'home-tab'),
        bookmarks: Array.isArray(browserProfile?.bookmarks) ? browserProfile.bookmarks : [],
        history: Array.isArray(browserProfile?.history) ? browserProfile.history : [],
        organization: browserProfile?.organization || {
            name: '',
            type: 'personal',
            emailDomain: '',
            logoText: 'AZHA',
            managedBookmarks: []
        },
        controls: browserProfile?.controls || {
            blockedDomains: [],
            allowedDomains: [],
            strictMode: false,
            studentSafeMode: false
        },
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(next));
    return next;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const maxFileSize = 8 * 1024 * 1024;
        if (file.size > maxFileSize) {
            reject(new Error('Image is too large. Use a file under 8 MB.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Unable to read image file'));
        reader.readAsDataURL(file);
    });
}

async function getInbox(username) {
    if (await hasBackend()) {
        const messages = await apiRequest(`/api/messages?username=${encodeURIComponent(username)}`);
        return messages.map(normalizeClientMessage).filter((message) => message.to === username);
    }
    return readMessagesLocal().map(normalizeClientMessage).filter((message) => message.to === username);
}

async function getSent(username) {
    if (await hasBackend()) {
        const messages = await apiRequest(`/api/messages?username=${encodeURIComponent(username)}`);
        return messages.map(normalizeClientMessage).filter((message) => message.from === username);
    }
    return readMessagesLocal().map(normalizeClientMessage).filter((message) => message.from === username);
}

async function sendMessage(from, to, text, attachments = [], options = {}) {
    const payload = {
        from,
        to,
        text,
        attachments,
        kind: options.kind || 'message',
        meta: options.meta || {}
    };
    try {
        if (await hasBackend()) {
            await apiRequest('/api/messages', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } else {
            const messages = readMessagesLocal();
            messages.push({
                id: Date.now().toString(36),
                from,
                to,
                text,
                kind: payload.kind,
                meta: payload.meta,
                attachments: Array.isArray(attachments) ? attachments.slice(0, 4) : [],
                timestamp: new Date().toISOString(),
                read: false
            });
            writeMessagesLocal(messages);
        }
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function sendMeetingInvite(from, to, invite) {
    return sendMessage(
        from,
        to,
        invite.note || `Join ${invite.title || 'my meeting'}`,
        [],
        {
            kind: 'meeting-invite',
            meta: {
                roomCode: invite.roomCode || '',
                title: invite.title || 'AZHA Meeting',
                startsAt: invite.startsAt || '',
                host: invite.host || from,
                note: invite.note || '',
                joinUrl: invite.joinUrl || ''
            }
        }
    );
}

async function markMessageRead(messageId, username) {
    try {
        if (await hasBackend()) {
            await apiRequest(`/api/messages/${encodeURIComponent(messageId)}/read`, {
                method: 'PUT',
                body: JSON.stringify({ username })
            });
        } else {
            const messages = readMessagesLocal();
            const target = messages.find((message) => message.id === messageId && message.to === username);
            if (!target) throw new Error('Message not found');
            target.read = true;
            writeMessagesLocal(messages);
        }
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function deleteMessage(messageId, username) {
    try {
        if (await hasBackend()) {
            await apiRequest(`/api/messages/${encodeURIComponent(messageId)}`, {
                method: 'DELETE',
                body: JSON.stringify({ username })
            });
        } else {
            const messages = readMessagesLocal().filter((message) => !(message.id === messageId && (message.to === username || message.from === username)));
            writeMessagesLocal(messages);
        }
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

let presenceHeartbeatHandle = null;
let presenceHeartbeatUser = '';

async function setPresenceStatus(status) {
    const username = localStorage.getItem('currentUsername');
    const nextStatus = ['online', 'busy', 'offline'].includes(String(status || '').toLowerCase()) ? String(status).toLowerCase() : 'offline';
    if (!username) return false;
    try {
        if (await hasBackend()) {
            await apiRequest('/api/social/presence', {
                method: 'POST',
                body: JSON.stringify({ username, status: nextStatus })
            });
        } else {
            const accounts = readAccounts();
            const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === username.toLowerCase());
            if (!key) throw new Error('User not found');
            accounts[key].presenceStatus = nextStatus;
            accounts[key].lastSeenAt = new Date().toISOString();
            writeAccounts(accounts);
        }
        return true;
    } catch (error) {
        console.warn('Presence update failed:', error);
        return false;
    }
}

function startPresenceHeartbeat(defaultStatus = 'online') {
    const username = localStorage.getItem('currentUsername');
    if (!username) return null;
    if (presenceHeartbeatHandle && presenceHeartbeatUser === username) {
        return presenceHeartbeatHandle;
    }
    if (presenceHeartbeatHandle) {
        clearInterval(presenceHeartbeatHandle);
    }
    presenceHeartbeatUser = username;
    const tick = () => setPresenceStatus(defaultStatus);
    tick();
    presenceHeartbeatHandle = window.setInterval(tick, 60000);
    window.addEventListener('beforeunload', () => {
        setPresenceStatus('offline');
    });
    return presenceHeartbeatHandle;
}

function stopPresenceHeartbeat() {
    if (presenceHeartbeatHandle) {
        clearInterval(presenceHeartbeatHandle);
        presenceHeartbeatHandle = null;
    }
}

function buildLocalFriendSummaries(friendUsernames, actor) {
    const accounts = readAccounts();
    const balances = readBalancesLocal();
    return friendUsernames
        .map((username) => accounts[username] || Object.values(accounts).find((entry) => entry.username === username))
        .filter(Boolean)
        .map((account) => ({
            username: account.username,
            fullName: account.fullName,
            profilePic: account.profilePic || '',
            status: effectivePresenceStatus(account),
            lastSeenAt: account.lastSeenAt || '',
            membershipLabel: normalizeMembershipView(account.membership || {}).active ? normalizeMembershipView(account.membership || {}).label : 'Locked',
            balance: sanitizeDisplayBalance(account.username, balances[account.username]),
            isAdmin: Boolean(account.isAdmin),
            actorCanInspect: actor === 'AZHA'
        }))
        .sort((a, b) => a.username.localeCompare(b.username));
}

async function getFriendsView(username = localStorage.getItem('currentUsername'), actor = localStorage.getItem('currentUsername')) {
    if (!username) return { incomingRequests: [], outgoingRequests: [], friends: [] };
    if (await hasBackend()) {
        return apiRequest(`/api/social/friends?username=${encodeURIComponent(username)}&actor=${encodeURIComponent(actor || username)}`);
    }
    const friendsData = readFriendsDataLocal();
    const requests = friendsData.requests || [];
    const friendships = friendsData.friendships || [];
    const lowered = username.toLowerCase();
    const friendUsernames = friendships
        .filter((entry) => [String(entry.users?.[0] || '').toLowerCase(), String(entry.users?.[1] || '').toLowerCase()].includes(lowered))
        .map((entry) => (String(entry.users?.[0] || '').toLowerCase() === lowered ? entry.users?.[1] : entry.users?.[0]))
        .filter(Boolean);
    const account = findAccount(username);
    return {
        username,
        presence: effectivePresenceStatus(account),
        lastSeenAt: account?.lastSeenAt || '',
        incomingRequests: requests.filter((request) => String(request.to || '').toLowerCase() === lowered),
        outgoingRequests: requests.filter((request) => String(request.from || '').toLowerCase() === lowered),
        friends: buildLocalFriendSummaries(friendUsernames, actor)
    };
}

async function sendFriendRequest(to) {
    const from = localStorage.getItem('currentUsername');
    if (!from) {
        showMessage('Sign in first.', false);
        return false;
    }
    try {
        if (await hasBackend()) {
            await apiRequest('/api/social/friends/request', {
                method: 'POST',
                body: JSON.stringify({ from, to })
            });
        } else {
            const accounts = readAccounts();
            if (!findAccount(to)) throw new Error('User not found');
            if (from.toLowerCase() === String(to || '').toLowerCase()) throw new Error('You cannot friend yourself.');
            const data = readFriendsDataLocal();
            const exists = (data.friendships || []).some((entry) => friendshipKey(entry.users?.[0], entry.users?.[1]) === friendshipKey(from, to));
            if (exists) throw new Error('You are already friends.');
            const pending = (data.requests || []).some((entry) => friendshipKey(entry.from, entry.to) === friendshipKey(from, to));
            if (pending) throw new Error('A friend request is already pending.');
            data.requests.push({ id: Date.now().toString(36), from, to, status: 'pending', createdAt: new Date().toISOString() });
            writeFriendsDataLocal(data);
        }
        showMessage(`Friend request sent to ${to}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function acceptFriendRequest(fromUsername) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/social/friends/accept', {
                method: 'POST',
                body: JSON.stringify({ actor, fromUsername })
            });
        } else {
            const data = readFriendsDataLocal();
            const requestIndex = (data.requests || []).findIndex((entry) => String(entry.from || '').toLowerCase() === String(fromUsername || '').toLowerCase() && String(entry.to || '').toLowerCase() === String(actor || '').toLowerCase());
            if (requestIndex === -1) throw new Error('Friend request not found.');
            data.requests.splice(requestIndex, 1);
            if (!(data.friendships || []).some((entry) => friendshipKey(entry.users?.[0], entry.users?.[1]) === friendshipKey(actor, fromUsername))) {
                data.friendships.push({ id: Date.now().toString(36), users: [actor, fromUsername], createdAt: new Date().toISOString() });
            }
            writeFriendsDataLocal(data);
        }
        showMessage(`You are now friends with ${fromUsername}.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function rejectFriendRequest(fromUsername) {
    const actor = localStorage.getItem('currentUsername');
    try {
        if (await hasBackend()) {
            await apiRequest('/api/social/friends/reject', {
                method: 'POST',
                body: JSON.stringify({ actor, fromUsername })
            });
        } else {
            const data = readFriendsDataLocal();
            data.requests = (data.requests || []).filter((entry) => !(String(entry.from || '').toLowerCase() === String(fromUsername || '').toLowerCase() && String(entry.to || '').toLowerCase() === String(actor || '').toLowerCase()));
            writeFriendsDataLocal(data);
        }
        showMessage('Friend request removed.', true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function getChatThread(friendUsername, username = localStorage.getItem('currentUsername')) {
    if (!username || !friendUsername) return [];
    if (await hasBackend()) {
        return apiRequest(`/api/social/chat/${encodeURIComponent(friendUsername)}?username=${encodeURIComponent(username)}`);
    }
    return readChatMessagesLocal()
        .filter((entry) => friendshipKey(entry.from, entry.to) === friendshipKey(username, friendUsername))
        .sort((a, b) => (Date.parse(a.timestamp || '') || 0) - (Date.parse(b.timestamp || '') || 0));
}

async function sendChatMessage(to, text, options = {}) {
    const from = localStorage.getItem('currentUsername');
    const payload = {
        from,
        to,
        text,
        replyTo: options.replyTo || null,
        forwardedFrom: options.forwardedFrom || null
    };
    try {
        if (await hasBackend()) {
            await apiRequest('/api/social/chat', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } else {
            const data = readFriendsDataLocal();
            const isFriend = (data.friendships || []).some((entry) => friendshipKey(entry.users?.[0], entry.users?.[1]) === friendshipKey(from, to));
            if (!isFriend) throw new Error('You must be friends to chat.');
            const messages = readChatMessagesLocal();
            messages.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                from,
                to,
                text,
                timestamp: new Date().toISOString(),
                read: false,
                replyTo: options.replyTo || null,
                forwardedFrom: options.forwardedFrom || null
            });
            writeChatMessagesLocal(messages);
        }
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function markChatRead(chatId, username = localStorage.getItem('currentUsername')) {
    if (!chatId || !username) return false;
    try {
        if (await hasBackend()) {
            await apiRequest(`/api/social/chat/${encodeURIComponent(chatId)}/read`, {
                method: 'PUT',
                body: JSON.stringify({ username })
            });
        } else {
            const messages = readChatMessagesLocal();
            const target = messages.find((entry) => entry.id === chatId && entry.to === username);
            if (target) {
                target.read = true;
                writeChatMessagesLocal(messages);
            }
        }
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

window.login = login;
window.signup = signup;
window.logout = logout;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.showMessage = showMessage;
window.checkLogin = checkLogin;
window.makeAdmin = makeAdmin;
window.removeAdmin = removeAdmin;
window.warnUser = warnUser;
window.toggleBan = toggleBan;
window.deleteUserAccount = deleteUserAccount;
window.getBalance = getBalance;
window.giveAZINC = giveAZINC;
window.resetAZINC = resetAZINC;
window.setExactAZHABalance = setExactAZHABalance;
window.updateUserFromAdmin = updateUserFromAdmin;
window.updateOwnProfile = updateOwnProfile;
window.configurePersonalStorage = configurePersonalStorage;
window.readFileAsDataUrl = readFileAsDataUrl;
window.getInbox = getInbox;
window.getSent = getSent;
window.sendMessage = sendMessage;
window.sendMeetingInvite = sendMeetingInvite;
window.markMessageRead = markMessageRead;
window.deleteMessage = deleteMessage;
window.setPresenceStatus = setPresenceStatus;
window.startPresenceHeartbeat = startPresenceHeartbeat;
window.stopPresenceHeartbeat = stopPresenceHeartbeat;
window.getFriendsView = getFriendsView;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.getChatThread = getChatThread;
window.sendChatMessage = sendChatMessage;
window.markChatRead = markChatRead;
window.requestNotificationAccess = requestNotificationAccess;
window.startInboxPolling = startInboxPolling;
window.stopInboxPolling = stopInboxPolling;
window.getNotificationFeed = getNotificationFeed;
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.markNotificationAsRead = markNotificationAsRead;
window.clearNotificationItem = clearNotificationItem;
window.hasBackend = hasBackend;
window.apiRequest = apiRequest;
window.getAllUsers = getAllUsers;
window.getCurrentAccountData = getCurrentAccountData;
window.getMembershipPlans = getMembershipPlans;
window.ensureFeatureAccess = ensureFeatureAccess;
window.beginMembershipCheckout = beginMembershipCheckout;
window.claimMembershipReward = claimMembershipReward;
window.claimDailyReward = claimDailyReward;
window.grantFreeMembership = grantFreeMembership;
window.clearMembership = clearMembership;
window.cancelOwnMembership = cancelOwnMembership;
window.createManagedAccount = createManagedAccount;
window.getBrowserProfile = getBrowserProfile;
window.updateBrowserProfile = updateBrowserProfile;
