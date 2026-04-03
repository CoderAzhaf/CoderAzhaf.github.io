const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname))); // Serve all static files from root
app.use(express.json());

// Explicit page routes to prevent 404 from direct URL requests
app.get('/Getin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Getin.html'));
});
app.get('/Message.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Message.html'));
});
app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});
app.get('/Download.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Download.html'));
});

// On Vercel, use in-memory storage. Locally, use files.
const isVercel = !!process.env.VERCEL;
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const BALANCES_FILE = path.join(__dirname, 'balances.json');

// In-memory storage for Vercel
let accountsCache = null;
let messagesCache = null;
let balancesCache = null;

// Initialize data files if they don't exist (local only, or first boot on Vercel)
if (!isVercel && !fs.existsSync(ACCOUNTS_FILE)) {
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
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(defaultAccounts, null, 2));
}

if (!isVercel && !fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
}

if (!isVercel && !fs.existsSync(BALANCES_FILE)) {
    // start with AZHA infinite and everybody else zero
    fs.writeFileSync(BALANCES_FILE, JSON.stringify({ AZHA: "INF" }, null, 2));
}

// Initialize in-memory storage if needed
function initializeInMemory() {
    if (accountsCache) return; // already initialized
    accountsCache = {
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
    messagesCache = [];
    balancesCache = { AZHA: "INF" };
}

// Helper functions
function readAccounts() {
    if (isVercel) {
        initializeInMemory();
        return accountsCache;
    }
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
}

function writeAccounts(accounts) {
    if (isVercel) {
        accountsCache = accounts;
    } else {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
    }
}

function readMessages() {
    if (isVercel) {
        initializeInMemory();
        return messagesCache;
    }
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
}

function writeMessages(messages) {
    if (isVercel) {
        messagesCache = messages;
    } else {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    }
}

function readBalances() {
    if (isVercel) {
        initializeInMemory();
        return balancesCache;
    }
    return JSON.parse(fs.readFileSync(BALANCES_FILE, 'utf8'));
}

function writeBalances(bals) {
    if (isVercel) {
        balancesCache = bals;
    } else {
        fs.writeFileSync(BALANCES_FILE, JSON.stringify(bals, null, 2));
    }
}


// API Routes
// helper that finds an account by username, case-insensitive
function findAccount(username) {
    if (!username) return undefined;
    const accounts = readAccounts();
    const lower = username.toString().toLowerCase();
    return Object.values(accounts).find(acc => acc.username.toLowerCase() === lower);
}

app.post('/api/signup', (req, res) => {
    let { username, password, fullName } = req.body;
    username = username && username.toString().trim();
    password = password && password.toString().trim();
    fullName = fullName && fullName.toString().trim();
    if (!username || !password || !fullName) {
        return res.status(400).json({ error: 'Please fill in all fields' });
    }

    // prevent case-insensitive duplicates
    if (findAccount(username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const accounts = readAccounts();
    // store using the provided case, but lookup will be case-insensitive
    accounts[username] = {
        username,
        password, // In production, hash this!
        fullName,
        isAdmin: false,
        warnings: 0,
        status: "active"
    };

    writeAccounts(accounts);
    res.json({ message: 'Account created successfully' });
});

app.post('/api/login', (req, res) => {
    let { username, password } = req.body;
    username = username && username.toString().trim();
    password = password && password.toString().trim();
    if (!username || !password) {
        return res.status(400).json({ error: 'Please enter both username and password' });
    }

    const account = findAccount(username);
    if (!account || account.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (account.status === 'banned') {
        return res.status(403).json({ error: 'This account has been banned' });
    }

    res.json({
        username: account.username,
        fullName: account.fullName,
        isAdmin: account.isAdmin
    });
});

app.get('/api/messages', (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }

    const messages = readMessages();
    const userMessages = messages.filter(msg => msg.to === username || msg.from === username);
    res.json(userMessages);
});

// return basic user list (username + fullName) for recipients etc.
app.get('/api/users', (req,res) => {
    const accounts = readAccounts();
    // return full objects (password included) so admin panel can display all fields
    const list = Object.values(accounts);
    res.json(list);
});

// helper to verify actor is admin (case-insensitive lookup)
function isAdminUser(username) {
    const acct = findAccount(username && username.toString().trim());
    return acct && acct.isAdmin;
}

app.post('/api/admin/makeadmin', (req,res) => {
    const { actor, username } = req.body;
    if (!isAdminUser(actor)) return res.status(403).json({ error: 'Not authorized' });
    const accounts = readAccounts();
    // find the actual stored key for the provided username
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toString().toLowerCase());
    if (!key) return res.status(404).json({ error: 'User not found' });
    accounts[key].isAdmin = true;
    writeAccounts(accounts);
    res.json({ message: 'OK' });
});

app.post('/api/admin/warn', (req,res) => {
    const { actor, username } = req.body;
    if (!isAdminUser(actor)) return res.status(403).json({ error: 'Not authorized' });
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toString().toLowerCase());
    if (!key) return res.status(404).json({ error: 'User not found' });
    accounts[key].warnings = (accounts[key].warnings || 0) + 1;
    writeAccounts(accounts);
    res.json({ message: 'OK', warnings: accounts[key].warnings });
});

app.post('/api/admin/ban', (req,res) => {
    const { actor, username, action } = req.body;
    if (!isAdminUser(actor)) return res.status(403).json({ error: 'Not authorized' });
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toString().toLowerCase());
    if (!key) return res.status(404).json({ error: 'User not found' });
    accounts[key].status = action === 'unban' ? 'active' : 'banned';
    writeAccounts(accounts);
    res.json({ message: 'OK', status: accounts[key].status });
});

app.delete('/api/users/:username', (req,res) => {
    const actor = req.body.actor;
    if (!isAdminUser(actor)) return res.status(403).json({ error: 'Not authorized' });
    const username = req.params.username;
    const accounts = readAccounts();
    const key = Object.keys(accounts).find(k => accounts[k].username.toLowerCase() === username.toString().toLowerCase());
    if (!key) return res.status(404).json({ error: 'User not found' });
    if (accounts[key].username === 'AZHA') return res.status(400).json({ error: 'Cannot delete AZHA' });
    delete accounts[key];
    writeAccounts(accounts);
    res.json({ message: 'deleted' });
});

app.get('/api/balances', (req,res) => {
    const username = req.query.username;
    const bals = readBalances();
    if (username) {
        return res.json({ [username]: bals[username] || 0 });
    }
    res.json(bals);
});

app.post('/api/admin/azinc', (req,res) => {
    const { actor, username, amount } = req.body;
    if (!isAdminUser(actor)) return res.status(403).json({ error: 'Not authorized' });
    if (!username || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const bals = readBalances();
    if (username === 'AZHA') {
        bals['AZHA'] = 'INF';
    } else {
        const cur = bals[username] || 0;
        if (cur === 'INF') {
            return res.status(400).json({ error: 'User already has infinite balance' });
        }
        bals[username] = cur + amount;
    }
    writeBalances(bals);
    res.json({ message: 'Balance updated', balances: bals });
});

app.post('/api/messages', (req, res) => {
    const { from, to, text } = req.body;
    if (!from || !to || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const accounts = readAccounts();
    if (!accounts[to]) {
        return res.status(400).json({ error: 'Recipient does not exist' });
    }

    const messages = readMessages();
    const message = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        from,
        to,
        text: String(text),
        timestamp: new Date().toISOString(),
        read: false
    };

    messages.push(message);
    writeMessages(messages);
    res.json({ message: 'Message sent successfully', id: message.id });
});

app.put('/api/messages/:id/read', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    const messages = readMessages();
    const messageIndex = messages.findIndex(msg => msg.id === id && msg.to === username);
    if (messageIndex === -1) {
        return res.status(404).json({ error: 'Message not found' });
    }

    messages[messageIndex].read = true;
    writeMessages(messages);
    res.json({ message: 'Message marked as read' });
});

app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    const messages = readMessages();
    const messageIndex = messages.findIndex(msg => msg.id === id && (msg.to === username || msg.from === username));
    if (messageIndex === -1) {
        return res.status(404).json({ error: 'Message not found' });
    }

    messages.splice(messageIndex, 1);
    writeMessages(messages);
    res.json({ message: 'Message deleted' });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Handle HTML pages
app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/Getin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Getin.html'));
});

app.get('/Download.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Download.html'));
});

app.get('/Message.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Message.html'));
});

// Handle 404 with fallback to static existing files or index
app.use((req, res) => {
    const staticPath = path.join(__dirname, req.path);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        return res.sendFile(staticPath);
    }
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    // For SPA-like behavior and direct route links
    return res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// For local development: start server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Press Ctrl+C to stop the server`);
    });
}

// For Vercel: export the app
module.exports = app;