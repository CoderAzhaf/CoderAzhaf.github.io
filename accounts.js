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

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function signup() {
    const username = document.getElementById('signup-username').value.toLowerCase();
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

    // Username requirements
    if (username.length < 4) {
        showMessage('Username must be at least 4 characters', false);
        return;
    }

    // Password requirements
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', false);
        return;
    }

    accounts[username] = {
        username: username,
        password: password,
        fullName: fullName
    };

    localStorage.setItem('accounts', JSON.stringify(accounts));
    showMessage('Account created successfully!', true);
    
    // Clear form
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-fullname').value = '';
    setTimeout(showLogin, 1500);
}

function login() {
    const username = document.getElementById('login-username').value.toLowerCase();
    const password = document.getElementById('login-password').value;
    
    const account = accounts[username];
    if (account && account.password === password) {
        localStorage.setItem('currentUser', account.fullName);
        localStorage.setItem('currentUsername', account.username);
        localStorage.setItem('isLoggedIn', 'true');
        
        // Redirect to index.html after successful login
        window.location.href = 'index.html';
    } else {
        showMessage('Invalid username or password', false);
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    document.getElementById('username').textContent = '';
    document.querySelector('.logout-button').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
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