// @ts-nocheck
// accounts.js -- localStorage-based authentication (no backend needed)

console.log('Using localStorage-based authentication (GitHub Pages compatible)');

/**
 * Initialize default accounts on first load.
 */
function initializeAccounts() {
    if (localStorage.getItem('accounts')) return;
    const defaultAccounts = {
        "AZHA": {
            username: "AZHA",
            password: "AZ MOH",
            fullName: "AZHAFUDDiN MOHAMMED",
            isAdmin: true,
            warnings: 0,
            status: "active"
        },
        "Vivvan Dash": {
            username: "Vivvan Dash",
            password: "dashpro",
            fullName: "Vivvan Dash",
            isAdmin: true,
            warnings: 0,
            status: "active"
        },
        "Alyanuddin": {
            username: "Alyanuddin",
            password: "alyanpro",
            fullName: "Alyanuddin Mohammed",
            isAdmin: true,
            warnings: 0,
            status: "active"
        },
        "Hacker": {
            username: "Hacker",
            password: "Hacker",
            fullName: "Hacker",
            isAdmin: false,
            warnings: 0,
            status: "active"
        },
        "Umar": {
            username: "Umar",
            password: "Umar",
            fullName: "Umar Suhail",
            isAdmin: false,
            warnings: 0,
            status: "active"
        },
        "Suleman": {
            username: "Suleman",
            password: "Suleman",
            fullName: "Suleman Ahsan",
            isAdmin: false,
            warnings: 0,
            status: "active"
        }
    };
    localStorage.setItem('accounts', JSON.stringify(defaultAccounts));
    localStorage.setItem('messages', JSON.stringify([]));
    localStorage.setItem('balances', JSON.stringify({ AZHA: "INF" }));
}

initializeAccounts();

/**
 * Helper: read/write accounts from localStorage.
 */
function readAccounts() {
    return JSON.parse(localStorage.getItem('accounts') || '{}');
}

function writeAccounts(accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
}

/**
 * Helper: find account by username (case-insensitive).
 */
function findAccount(username) {
    if (!username) return undefined;
    const accounts = readAccounts();
    const lower = username.toString().toLowerCase();
    return Object.values(accounts).find(acc => acc.username.toLowerCase() === lower);
}

/**
 * Displays a temporary message (success or error) on the screen.
 */
function showMessage(message, isSuccess) {
    const div = document.createElement('div');
    div.textContent = message;
    div.className = `message ${isSuccess ? 'success' : 'error'}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

/**
 * Checks if the user is currently logged in. If not, redirects to Getin.html.
 */
function checkLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'Getin.html';
        return false;
    }
    return true;
}

/**
 * Handles the user login process (localStorage-based).
 */
async function login() {
    console.log('login() called');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    console.log('attempting login', { username, password });
    
    if (!username || !password) {
        showMessage('Please enter both username and password', false);
        return;
    }

    const account = findAccount(username);
    if (!account) {
        showMessage('Invalid username or password', false);
        return;
    }

    if (account.password !== password) {
        showMessage('Invalid username or password', false);
        return;
    }

    if (account.status === 'banned') {
        showMessage('This account has been banned', false);
        return;
    }

    // Login successful
    localStorage.setItem('currentUser', account.fullName);
    localStorage.setItem('currentUsername', account.username);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('isAdmin', account.isAdmin ? 'true' : 'false');
    showMessage('Login successful! Redirecting...', true);
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
}


/**
 * Swap forms on Getin.html
 */
function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-fullname').value = '';
}
function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

/**
 * Create new account (localStorage-based).
 */
async function signup() {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const fullName = document.getElementById('signup-fullname').value.trim();
    
    if (!username || !password || !fullName) {
        showMessage('Please fill in all fields', false);
        return;
    }

    if (findAccount(username)) {
        showMessage('Username already exists', false);
        return;
    }

    const accounts = readAccounts();
    accounts[username] = {
        username,
        password,
        fullName,
        isAdmin: false,
        warnings: 0,
        status: "active"
    };
    writeAccounts(accounts);
    showMessage('Account created successfully! You can now login.', true);
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-fullname').value = '';
    showLogin();
}

/**
 * Logs out current user.
 */
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    showMessage('Logged out successfully. Redirecting...', true);
    setTimeout(() => { window.location.href = 'Getin.html'; }, 1000);
}

// small helpers used by admin panel
async function makeAdmin(username) {
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toLowerCase());
    if (!key) {
        showMessage('User not found', false);
        return false;
    }
    accounts[key].isAdmin = true;
    writeAccounts(accounts);
    showMessage(`${username} is now an admin!`, true);
    if (typeof showAdminPanel === 'function') showAdminPanel();
    return true;
}

async function warnUser(username) {
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toLowerCase());
    if (!key) {
        showMessage('User not found', false);
        return false;
    }
    accounts[key].warnings = (accounts[key].warnings || 0) + 1;
    writeAccounts(accounts);
    showMessage(`Warning issued to ${username}.`, true);
    if (typeof showAdminPanel === 'function') showAdminPanel();
    return true;
}

async function toggleBan(username, action) {
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toLowerCase());
    if (!key) {
        showMessage('User not found', false);
        return false;
    }
    accounts[key].status = action === 'unban' ? 'active' : 'banned';
    writeAccounts(accounts);
    showMessage(`${username} has been ${accounts[key].status}.`, true);
    if (typeof showAdminPanel === 'function') showAdminPanel();
    return true;
}

async function deleteUserAccount(username) {
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toLowerCase());
    if (!key) {
        showMessage('User not found', false);
        return false;
    }
    if (accounts[key].username === 'AZHA') {
        showMessage('Cannot delete AZHA', false);
        return false;
    }
    delete accounts[key];
    writeAccounts(accounts);
    showMessage(`Account ${username} deleted.`, true);
    if (typeof showAdminPanel === 'function') showAdminPanel();
    return true;
}

async function getBalance(username) {
    const balances = JSON.parse(localStorage.getItem('balances') || '{}');
    return balances[username] || 0;
}

async function giveAZINC(targetUsername, amount) {
    const actor = localStorage.getItem('currentUsername');
    if (actor !== 'AZHA') {
        showMessage('Only AZHA can give AZINC.', false);
        return false;
    }
    const balances = JSON.parse(localStorage.getItem('balances') || '{}');
    if (targetUsername === 'AZHA') {
        balances['AZHA'] = 'INF';
    } else {
        const cur = balances[targetUsername] || 0;
        if (cur === 'INF') {
            showMessage('User already has infinite balance', false);
            return false;
        }
        balances[targetUsername] = cur + amount;
    }
    localStorage.setItem('balances', JSON.stringify(balances));
    showMessage(`Gave ${amount} AZINC to ${targetUsername}.`, true);
    return true;
}

/**
 * Message functions (localStorage-based).
 */
async function getInbox(username) {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    return messages.filter(msg => msg.to === username);
}

async function getSent(username) {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    return messages.filter(msg => msg.from === username);
}
