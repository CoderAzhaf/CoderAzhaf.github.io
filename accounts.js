// @ts-nocheck
// accounts.js -- client helpers that interact with the backend API

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
 * Handles the user login process.
 */
async function login() {
    // trim whitespace to avoid accidental spaces causing mismatches
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) {
        showMessage('Please enter both username and password', false);
        return;
    }

    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await resp.json();
        if (resp.ok) {
            localStorage.setItem('currentUser', data.fullName);
            localStorage.setItem('currentUsername', username);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('isAdmin', data.isAdmin ? 'true' : 'false');
            showMessage('Login successful! Redirecting...', true);
            document.getElementById('login-username').value = '';
            document.getElementById('login-password').value = '';
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        } else {
            showMessage(data.error, false);
        }
    } catch (err) {
        console.error('Login error:', err);
        showMessage('An error occurred during login', false);
    }
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
 * Create new account via backend.
 */
async function signup() {
    // trim fields to prevent accidental leading/trailing spaces
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const fullName = document.getElementById('signup-fullname').value.trim();
    if (!username || !password || !fullName) {
        showMessage('Please fill in all fields', false);
        return;
    }
    try {
        const resp = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, fullName }),
        });
        const data = await resp.json();
        if (resp.ok) {
            showMessage('Account created successfully! You can now login.', true);
            document.getElementById('signup-username').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-fullname').value = '';
            showLogin();
        } else {
            showMessage(data.error || 'Signup failed', false);
        }
    } catch (err) {
        console.error('Signup error', err);
        showMessage('An error occurred during signup', false);
    }
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
    const actor = localStorage.getItem('currentUsername');
    try {
        const resp = await fetch('/api/admin/makeadmin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor, username }),
        });
        if (resp.ok) {
            showMessage(`${username} is now an admin!`, true);
            if (typeof showAdminPanel === 'function') showAdminPanel();
            return true;
        } else {
            const data = await resp.json().catch(() => ({}));
            showMessage(data.error || 'Failed to make admin', false);
            return false;
        }
    } catch (err) {
        console.error('makeAdmin error', err);
        showMessage('Error making admin', false);
        return false;
    }
}

async function warnUser(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        const resp = await fetch('/api/admin/warn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor, username }),
        });
        if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            showMessage(`Warning issued to ${username}.`, true);
            if (typeof showAdminPanel === 'function') showAdminPanel();
            return true;
        } else {
            const data = await resp.json().catch(() => ({}));
            showMessage(data.error || 'Failed to warn user', false);
            return false;
        }
    } catch (err) {
        console.error('warnUser error', err);
        showMessage('Error issuing warning', false);
        return false;
    }
}

async function toggleBan(username, action) {
    const actor = localStorage.getItem('currentUsername');
    try {
        const resp = await fetch('/api/admin/ban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor, username, action }),
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
            showMessage(`${username} has been ${data.status}.`, true);
            if (typeof showAdminPanel === 'function') showAdminPanel();
            return true;
        } else {
            showMessage(data.error || 'Failed to change ban status', false);
            return false;
        }
    } catch (err) {
        console.error('toggleBan error', err);
        showMessage('Error updating ban status', false);
        return false;
    }
}

async function deleteUserAccount(username) {
    const actor = localStorage.getItem('currentUsername');
    try {
        const resp = await fetch(`/api/users/${encodeURIComponent(username)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actor }),
        });
        if (resp.ok) {
            showMessage(`Account ${username} deleted.`, true);
            if (typeof showAdminPanel === 'function') showAdminPanel();
            return true;
        } else {
            const data = await resp.json().catch(() => ({}));
            showMessage(data.error || 'Failed to delete account', false);
            return false;
        }
    } catch (err) {
        console.error('deleteUserAccount error', err);
        showMessage('Error deleting account', false);
        return false;
    }
}

async function getBalance(username) {
    try {
        const resp = await fetch(`/api/balances?username=${encodeURIComponent(username)}`);
        if (!resp.ok) return 0;
        const data = await resp.json();
        return data[username] || 0;
    } catch (err) {
        console.error('getBalance error', err);
        return 0;
    }
}

async function giveAZINC(targetUsername, amount) {
    const actor = localStorage.getItem('currentUsername');
    const resp = await fetch('/api/admin/azinc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor, username: targetUsername, amount: Number(amount) }),
    });
    if (resp.ok) {
        showMessage(`Gave ${amount} AZINC to ${targetUsername}.`, true);
        return true;
    } else {
        const data = await resp.json().catch(() => ({}));
        showMessage(data.error || 'Failed to update balance', false);
        return false;
    }
}
