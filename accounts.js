// @ts-nocheck

console.log('Using backend-first account helpers with local fallback');

const apiBaseUrl = window.location.origin;
let backendAvailable = null;

const defaultAccounts = {
    AZHA: {
        username: 'AZHA',
        password: 'AZ MOH',
        fullName: 'AZHAFUDDiN MOHAMMED',
        isAdmin: true,
        warnings: 0,
        status: 'active'
    },
    'Vivvan Dash': {
        username: 'Vivvan Dash',
        password: 'dashpro',
        fullName: 'Vivvan Dash',
        isAdmin: false,
        warnings: 0,
        status: 'active'
    },
    Alyanuddin: {
        username: 'Alyanuddin',
        password: 'alyanpro',
        fullName: 'Alyanuddin Mohammed',
        isAdmin: false,
        warnings: 0,
        status: 'active'
    },
    Hacker: {
        username: 'Hacker',
        password: 'Hacker',
        fullName: 'Hacker',
        isAdmin: false,
        warnings: 0,
        status: 'active'
    },
    Umar: {
        username: 'Umar',
        password: 'Umar',
        fullName: 'Umar Suhail',
        isAdmin: false,
        warnings: 0,
        status: 'active'
    },
    Suleman: {
        username: 'Suleman',
        password: 'Suleman',
        fullName: 'Suleman Ahsan',
        isAdmin: false,
        warnings: 0,
        status: 'active'
    }
};

function initializeAccounts() {
    if (localStorage.getItem('accounts')) return;
    localStorage.setItem('accounts', JSON.stringify(defaultAccounts));
    localStorage.setItem('messages', JSON.stringify([]));
    localStorage.setItem('balances', JSON.stringify({ AZHA: 'INF' }));
}

initializeAccounts();

function readAccounts() {
    return JSON.parse(localStorage.getItem('accounts') || '{}');
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

function readBalancesLocal() {
    return JSON.parse(localStorage.getItem('balances') || '{}');
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
    return accounts.map((account) => ({
        ...account,
        balance: balances[account.username] ?? (account.username === 'AZHA' ? 'INF' : 0)
    }));
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
}

function clearSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
}

function checkLogin() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'Getin.html';
        return false;
    }
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

    try {
        if (await hasBackend()) {
            await apiRequest('/api/signup', {
                method: 'POST',
                body: JSON.stringify({ username, password, fullName })
            });
        } else {
            if (findAccount(username)) {
                throw new Error('Username already exists');
            }
            const accounts = readAccounts();
            accounts[username] = { username, password, fullName, isAdmin: false, warnings: 0, status: 'active' };
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
            if (localStorage.getItem('isAdmin') !== 'true') throw new Error('Only admins can give AZINC.');
            const balances = readBalancesLocal();
            if (targetUsername === 'AZHA') {
                balances.AZHA = 'INF';
            } else {
                const current = Number(balances[targetUsername] || 0);
                balances[targetUsername] = current + amount;
            }
            writeBalancesLocal(balances);
        }
        showMessage(`Gave ${amount} AZINC to ${targetUsername}.`, true);
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
            if (localStorage.getItem('isAdmin') !== 'true') throw new Error('Only admins can reset AZINC.');
            const balances = readBalancesLocal();
            if (targetUsername === 'AZHA') {
                balances.AZHA = 'INF';
            } else {
                balances[targetUsername] = 0;
            }
            writeBalancesLocal(balances);
        }
        showMessage(`${targetUsername}'s AZINC has been reset.`, true);
        return true;
    } catch (error) {
        showMessage(error.message, false);
        return false;
    }
}

async function getInbox(username) {
    if (await hasBackend()) {
        const messages = await apiRequest(`/api/messages?username=${encodeURIComponent(username)}`);
        return messages.filter((message) => message.to === username);
    }
    return readMessagesLocal().filter((message) => message.to === username);
}

async function getSent(username) {
    if (await hasBackend()) {
        const messages = await apiRequest(`/api/messages?username=${encodeURIComponent(username)}`);
        return messages.filter((message) => message.from === username);
    }
    return readMessagesLocal().filter((message) => message.from === username);
}

async function sendMessage(from, to, text) {
    try {
        if (await hasBackend()) {
            await apiRequest('/api/messages', {
                method: 'POST',
                body: JSON.stringify({ from, to, text })
            });
        } else {
            const messages = readMessagesLocal();
            messages.push({
                id: Date.now().toString(36),
                from,
                to,
                text,
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
window.getInbox = getInbox;
window.getSent = getSent;
window.sendMessage = sendMessage;
window.markMessageRead = markMessageRead;
window.deleteMessage = deleteMessage;
window.hasBackend = hasBackend;
window.apiRequest = apiRequest;
window.getAllUsers = getAllUsers;
