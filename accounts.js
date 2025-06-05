// Initialize default accounts if none exist
if (!localStorage.getItem('accounts')) {
    const defaultAccounts = {
       "AZHA": {
            username: "AZHA",
            password: "AZ MOH",
            fullName: "AZHAFUDDiN MOHAMMED",
            isAdmin: true,
            warnings: 0,
            status: "active"
        }
    };
    
    localStorage.setItem('accounts', JSON.stringify(defaultAccounts));
}

// Get accounts from localStorage
let accounts = JSON.parse(localStorage.getItem('accounts'));

function showMessage(message, isSuccess) {
    const div = document.createElement('div');
    div.textContent = message;
    div.className = `message ${isSuccess ? 'success' : 'error'}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showMessage('Please enter both username and password', false);
        return;
    }

    // Reload accounts from localStorage to ensure latest data
    accounts = JSON.parse(localStorage.getItem('accounts'));

    const account = accounts[username];
    if (account && account.password === password) {
        if (account.status === 'banned') {
            showMessage('This account has been banned.', false);
            return;
        }

        localStorage.setItem('currentUser', account.fullName); // <---- Make sure this line is present
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isAdmin', account.isAdmin);

        showMessage('Login successful! Redirecting...', true);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        showMessage('Invalid username or password', false);
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

function signup() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const fullName = document.getElementById('signup-fullname').value;

    if (!username || !password || !fullName) {
        showMessage('Please fill in all fields', false);
        return;
    }

    if (accounts[username]) {
        showMessage('Username already exists', false);
        return;
    }

    accounts[username] = {
        username: username,
        password: password,
        fullName: fullName,
        isAdmin: false,
        warnings: 0,
        status: "active"
    };

    localStorage.setItem('accounts', JSON.stringify(accounts));
    showMessage('Account created successfully! You can now login.', true);
    showLogin();
}

// Update logout function
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    window.location.href = 'Getin.html';
}
function makeAdmin(username) {
    const accounts = JSON.parse(localStorage.getItem('accounts'));
    if (accounts[username]) {
        accounts[username].isAdmin = true;
        localStorage.setItem('accounts', JSON.stringify(accounts));
        showAdminPanel(); // Refresh the admin panel
    }
}
function showAdminPanel() {
    const currentUsername = localStorage.getItem('currentUsername');
    const accounts = JSON.parse(localStorage.getItem('accounts')) || {};

    if (accounts[currentUsername]?.isAdmin) {
        const adminPanel = document.getElementById('adminPanel');
        const accountsList = document.getElementById('accountsList');

        if (adminPanel && accountsList) {
            adminPanel.style.display = 'block';
            accountsList.innerHTML = '';

            Object.entries(accounts).forEach(([username, account]) => {
                if (username !== currentUsername) {
                    console.log("Adding account:", username); // ADD THIS LINE
                    const accountDiv = document.createElement('div');
                    accountDiv.className = 'account-item';
                    accountDiv.innerHTML = `
                        <div>
                            <strong>${account.fullName}</strong> (${username})
                            ${account.warnings > 0 ? `<span class="warning">Warnings: ${account.warnings}</span>` : ''}
                            ${account.status === 'banned' ? `<span class="banned">BANNED</span>` : ''}
                        </div>
                        <div class="admin-controls">
                            <button onclick="warnUser('${username}')">Warn</button>
                            <button onclick="toggleBan('${username}')">${account.status === 'banned' ? 'Unban' : 'Ban'}</button>
                            <button onclick="deleteUserAccount('${username}')">Delete</button>
                        </div>
                    `;
                    accountsList.appendChild(accountDiv);
                }
            });
        }
    }
}
// Add event listener for Enter key on login form
window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const loginPassword = document.getElementById('login-password');
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});