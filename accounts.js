// Default accounts
let accounts = JSON.parse(localStorage.getItem('accounts')) || {

     "azhafuddin": {
        username: "AZHAFUDDiN",
        password: "AZ MOH",
        fullName: "Azhafuddin Mohammed",
        isAdmin: true,
        warnings: 0,
        status: "active"
    },
    "jayrayapudi": {
        username: "jayrayapudi",
        password: "Jay Raps",
        fullName: "Jay Rayapudi",
        isAdmin: false,
        warnings: 0,
        status: "active"
    },
    "jeshrunt": {
        username: "jeshrun",
        password: "Jesh Pro",
        fullName: "Jeshrun Tappeta",
        isAdmin: true,
        warnings: 0,
        status: "active"
    },
    "zidanm": {
        username: "zidanm",
        password: "zidan123",
        fullName: "Zidanuddin Mohammed",
        isAdmin: false,
        warnings: 0,
        status: "active"
    }
};

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
    
    const account = accounts[username];
    if (account && account.password === password) {
        localStorage.setItem('currentUser', account.fullName);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isAdmin', account.isAdmin);
        
        // Update this line to use your GitHub Pages URL
        window.location.href = 'https://coderazhaf.github.io/index.html';
    } else {
        showMessage('Invalid username or password', false);
    }
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    // Update this line to use your GitHub Pages URL
    window.location.href = 'https://coderazhaf.github.io/Getin.html';
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
    // ...existing validation code...

    accounts[username] = {
        username: username,
        password: password,
        fullName: fullName,
        isAdmin: false, // New accounts are not admins by default
        warnings: 0,
        status: "active"
    };

    // ...existing code...`
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    window.location.href = 'Getin.html';
}
    
    const account = accounts[username];
    if (account && account.password === password) {
        if (account.status === 'banned') {
            showMessage('This account has been banned.', false);
            return;
        }
        
        localStorage.setItem('currentUser', account.fullName);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isAdmin', account.isAdmin);
        
        window.location.href = 'index.html';
    } else {
        showMessage('Invalid username or password', false);
    }

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('currentUser');
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn && currentUser) {
        document.getElementById('username').textContent = `Welcome back, ${currentUser}!`;
        document.querySelector('.logout-button').style.display = 'inline-block';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'none';
    } else {
        showLogin();
    }
});

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
                    const accountDiv = document.createElement('div');
                    accountDiv.className = 'account-item';
                    accountDiv.innerHTML = `
                        <div>
                            <strong>${account.fullName}</strong> (${username})
                            ${account.warnings > 0 ? `<span class="warning">Warnings: ${account.warnings}</span>` : ''}
                            ${account.status === 'banned' ? '<span class="banned">BANNED</span>' : ''}
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

function warnUser(username) {
    const accounts = JSON.parse(localStorage.getItem('accounts'));
    if (accounts[username]) {
        accounts[username].warnings = (accounts[username].warnings || 0) + 1;
        localStorage.setItem('accounts', JSON.stringify(accounts));
        showAdminPanel();
    }
}

function toggleBan(username) {
    const accounts = JSON.parse(localStorage.getItem('accounts'));
    if (accounts[username]) {
        accounts[username].status = accounts[username].status === 'banned' ? 'active' : 'banned';
        localStorage.setItem('accounts', JSON.stringify(accounts));
        showAdminPanel();
    }
}

function deleteUserAccount(username) {
    if (confirm(`Are you sure you want to delete ${username}'s account?`)) {
        const accounts = JSON.parse(localStorage.getItem('accounts'));
        delete accounts[username];
        localStorage.setItem('accounts', JSON.stringify(accounts));
        showAdminPanel();
    }
}