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
        }
    };
    localStorage.setItem('accounts', JSON.stringify(defaultAccounts));
}
// Global accounts variable (will be reloaded in functions for freshness)
let accounts = JSON.parse(localStorage.getItem('accounts'));
         
/**
 * Displays a temporary message (success or error) on the screen.
 */
function showMessage(message, isSuccess) {
    const div = document.createElement('div');
    div.textContent = message;
    div.className = `message ${isSuccess ? 'success' : 'error'}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000); // Remove message after 3 seconds
}

/**
 * Checks if the user is currently logged in. If not, redirects to Getin.html.
 */
function checkLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') { // Check for explicit 'true' string
        window.location.href = 'Getin.html';
        return false;
    }
    return true;
}

/**
 * Handles the user login process.
 */
function login() {
    const usernameInput = document.getElementById('login-username').value;
    const passwordInput = document.getElementById('login-password').value;

    const username = usernameInput;
    const password = passwordInput;

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

        localStorage.setItem('currentUser', account.fullName);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isAdmin', account.isAdmin ? 'true' : 'false'); // Store isAdmin status as a string

        showMessage('Login successful! Redirecting...', true);
        // Clear input fields after successful login
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        showMessage('Invalid username or password', false);
    }
}

/**
 * Shows the login form and hides the signup form.
 */
function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    // Clear signup fields when switching to login
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-fullname').value = '';
}

/**
 * Shows the signup form and hides the login form.
 */
function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    // Clear login fields when switching to signup
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

/**
 * Handles the user signup process.
 * NOTE: This is a client-side only implementation using localStorage.
 * For a real application, you need a backend server and a database for security.
 */
function signup() {
    const usernameInput = document.getElementById('signup-username');
    const passwordInput = document.getElementById('signup-password');
    const fullNameInput = document.getElementById('signup-fullname');

    const username = usernameInput.value;
    const password = passwordInput.value;
    const fullName = fullNameInput.value;

    if (!username || !password || !fullName) {
        showMessage('Please fill in all fields', false);
        return;
    }

    // Reload accounts to get the most current state before checking/adding
    accounts = JSON.parse(localStorage.getItem('accounts'));

    if (accounts[username]) {
        showMessage('Username already exists. Please choose a different one.', false);
        return;
    }

    // Add new account to the accounts object
    accounts[username] = {
        username: username,
        password: password, // In a real app, hash this password!
        fullName: fullName,
        isAdmin: false, // New users are not admins by default
        warnings: 0,
        status: "active" // Default status
    };

    // Save the updated accounts object back to localStorage
    localStorage.setItem('accounts', JSON.stringify(accounts));

    showMessage('Account created successfully! You can now login.', true);
    // Clear signup fields after successful signup
    usernameInput.value = '';
    passwordInput.value = '';
    fullNameInput.value = '';
    showLogin(); // Automatically switch to the login form
}

/**
 * Logs out the current user and redirects to Getin.html.
 */
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin'); // Clear admin status on logout
    showMessage('Logged out successfully. Redirecting...', true);
    setTimeout(() => {
        window.location.href = 'Getin.html';
    }, 1000);
}


// Event listener for when the DOM content is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Logic specific to Getin.html: If already logged in, redirect to index.html
    if (window.location.pathname.endsWith('Getin.html')) {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true') {
            window.location.href = 'index.html';
        }

        // Add event listener for Enter key on login password field
        const loginPassword = document.getElementById('login-password');
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    login();
                }
            });
        }

        // Add event listener for Enter key on signup full name field
        const signupFullName = document.getElementById('signup-fullname');
        if (signupFullName) {
            signupFullName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    signup();
                }
            });
        }
    }
});
function toggleBan(username) {
    if (username === "AZHA") {
        showMessage("Cannot ban the AZHA account.", false);
        return;
    }

    const accounts = JSON.parse(localStorage.getItem('accounts'));
    if (accounts[username]) {
        const newStatus = accounts[username].status === 'banned' ? 'active' : 'banned';
        accounts[username].status = newStatus;
        localStorage.setItem('accounts', JSON.stringify(accounts));
        // Re-display all accounts after banning/unbanning
        showAdminPanel();
        showMessage(`${username} has been ${newStatus}.`, true);
    }
}

function deleteUserAccount(username) {
    if (username === "AZHA") {
        showMessage("Cannot delete the AZHA account.", false);
        return;
    }

    if (confirm(`Are you sure you want to delete ${username}'s account? This cannot be undone.`)) {
        const accounts = JSON.parse(localStorage.getItem('accounts'));
        delete accounts[username];
        localStorage.setItem('accounts', JSON.stringify(accounts));
        // Re-display all accounts after deletion
        showAdminPanel();
        showMessage(`${username}'s account has been deleted.`, true);
    }
}