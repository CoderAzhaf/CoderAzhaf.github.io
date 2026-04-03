const express = require('express');
const path = require('path');
const fs = require('fs');
const { createStorage } = require('./storage');

const app = express();
const port = process.env.PORT || 3000;
const storage = createStorage();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

const pageRoutes = ['Getin.html', 'Message.html', 'contact.html', 'Download.html'];
pageRoutes.forEach((page) => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, page));
    });
});

function wrap(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

async function readAccounts() {
    return storage.readAccounts();
}

async function writeAccounts(accounts) {
    await storage.writeAccounts(accounts);
}

async function readMessages() {
    return storage.readMessages();
}

async function writeMessages(messages) {
    await storage.writeMessages(messages);
}

async function readBalances() {
    return storage.readBalances();
}

async function writeBalances(balances) {
    await storage.writeBalances(balances);
}

async function findAccount(username) {
    if (!username) return undefined;
    const accounts = await readAccounts();
    const lowered = String(username).trim().toLowerCase();
    return Object.values(accounts).find((account) => account.username.toLowerCase() === lowered);
}

async function findAccountKey(username) {
    const accounts = await readAccounts();
    const lowered = String(username).trim().toLowerCase();
    const key = Object.keys(accounts).find((entry) => accounts[entry].username.toLowerCase() === lowered);
    return { accounts, key };
}

async function isAdminUser(username) {
    const account = await findAccount(username);
    return Boolean(account && account.isAdmin);
}

app.get('/api/health', (req, res) => {
    res.json({ ok: true, storage: storage.getMode() });
});

app.get('/api/site-summary', wrap(async (req, res) => {
    const username = req.query.username ? String(req.query.username) : '';
    const accounts = await readAccounts();
    const messages = await readMessages();
    const balances = await readBalances();
    const unreadCount = username
        ? messages.filter((message) => message.to === username && !message.read).length
        : 0;

    res.json({
        storage: storage.getMode(),
        users: Object.keys(accounts).length,
        messages: messages.length,
        unreadCount,
        featuredProjects: 3,
        azhaBalance: balances.AZHA || 'INF'
    });
}));

app.post('/api/signup', wrap(async (req, res) => {
    let { username, password, fullName } = req.body;
    username = username && String(username).trim();
    password = password && String(password).trim();
    fullName = fullName && String(fullName).trim();

    if (!username || !password || !fullName) {
        return res.status(400).json({ error: 'Please fill in all fields' });
    }

    if (await findAccount(username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const accounts = await readAccounts();
    accounts[username] = {
        username,
        password,
        fullName,
        isAdmin: false,
        warnings: 0,
        status: 'active'
    };

    await writeAccounts(accounts);
    res.json({ message: 'Account created successfully' });
}));

app.post('/api/login', wrap(async (req, res) => {
    let { username, password } = req.body;
    username = username && String(username).trim();
    password = password && String(password).trim();

    if (!username || !password) {
        return res.status(400).json({ error: 'Please enter both username and password' });
    }

    const account = await findAccount(username);
    if (!account || account.password !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (account.status === 'banned') {
        return res.status(403).json({ error: 'This account has been banned' });
    }

    res.json({
        username: account.username,
        fullName: account.fullName,
        isAdmin: account.isAdmin,
        warnings: account.warnings || 0,
        status: account.status || 'active'
    });
}));

app.get('/api/users', wrap(async (req, res) => {
    const accounts = await readAccounts();
    res.json(Object.values(accounts));
}));

app.delete('/api/users/:username', wrap(async (req, res) => {
    const actor = req.body.actor;
    if (!(await isAdminUser(actor))) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const { accounts, key } = await findAccountKey(req.params.username);
    if (!key) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (accounts[key].username === 'AZHA') {
        return res.status(400).json({ error: 'Cannot delete AZHA' });
    }

    delete accounts[key];
    await writeAccounts(accounts);
    res.json({ message: 'deleted' });
}));

app.post('/api/admin/makeadmin', wrap(async (req, res) => {
    const { actor, username } = req.body;
    if (!(await isAdminUser(actor))) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const { accounts, key } = await findAccountKey(username);
    if (!key) {
        return res.status(404).json({ error: 'User not found' });
    }

    accounts[key].isAdmin = true;
    await writeAccounts(accounts);
    res.json({ message: 'OK' });
}));

app.post('/api/admin/warn', wrap(async (req, res) => {
    const { actor, username } = req.body;
    if (!(await isAdminUser(actor))) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const { accounts, key } = await findAccountKey(username);
    if (!key) {
        return res.status(404).json({ error: 'User not found' });
    }

    accounts[key].warnings = (accounts[key].warnings || 0) + 1;
    await writeAccounts(accounts);
    res.json({ message: 'OK', warnings: accounts[key].warnings });
}));

app.post('/api/admin/ban', wrap(async (req, res) => {
    const { actor, username, action } = req.body;
    if (!(await isAdminUser(actor))) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const { accounts, key } = await findAccountKey(username);
    if (!key) {
        return res.status(404).json({ error: 'User not found' });
    }

    accounts[key].status = action === 'unban' ? 'active' : 'banned';
    await writeAccounts(accounts);
    res.json({ message: 'OK', status: accounts[key].status });
}));

app.get('/api/balances', wrap(async (req, res) => {
    const username = req.query.username ? String(req.query.username) : '';
    const balances = await readBalances();
    if (username) {
        return res.json({ [username]: balances[username] || 0 });
    }
    res.json(balances);
}));

app.post('/api/admin/azinc', wrap(async (req, res) => {
    const { actor, username, amount } = req.body;
    if (!(await isAdminUser(actor))) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    if (!username || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const balances = await readBalances();
    if (username === 'AZHA') {
        balances.AZHA = 'INF';
    } else {
        const current = balances[username] || 0;
        if (current === 'INF') {
            return res.status(400).json({ error: 'User already has infinite balance' });
        }
        balances[username] = current + amount;
    }

    await writeBalances(balances);
    res.json({ message: 'Balance updated', balances });
}));

app.get('/api/messages', wrap(async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }

    const messages = await readMessages();
    const lowered = String(username).toLowerCase();
    const userMessages = messages.filter((message) => message.to.toLowerCase() === lowered || message.from.toLowerCase() === lowered);
    res.json(userMessages);
}));

app.post('/api/messages', wrap(async (req, res) => {
    const { from, to, text } = req.body;
    if (!from || !to || !text) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const recipient = await findAccount(to);
    if (!recipient) {
        return res.status(400).json({ error: 'Recipient does not exist' });
    }

    const sender = await findAccount(from);
    if (!sender) {
        return res.status(400).json({ error: 'Sender does not exist' });
    }

    const messages = await readMessages();
    const message = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        from: sender.username,
        to: recipient.username,
        text: String(text).trim(),
        timestamp: new Date().toISOString(),
        read: false
    };

    messages.push(message);
    await writeMessages(messages);
    res.json({ message: 'Message sent successfully', id: message.id });
}));

app.put('/api/messages/:id/read', wrap(async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    const lowered = String(username || '').toLowerCase();
    const messages = await readMessages();
    const messageIndex = messages.findIndex((message) => message.id === id && message.to.toLowerCase() === lowered);

    if (messageIndex === -1) {
        return res.status(404).json({ error: 'Message not found' });
    }

    messages[messageIndex].read = true;
    await writeMessages(messages);
    res.json({ message: 'Message marked as read' });
}));

app.delete('/api/messages/:id', wrap(async (req, res) => {
    const { id } = req.params;
    const lowered = String(req.body.username || '').toLowerCase();
    const messages = await readMessages();
    const messageIndex = messages.findIndex((message) => message.id === id && (message.to.toLowerCase() === lowered || message.from.toLowerCase() === lowered));

    if (messageIndex === -1) {
        return res.status(404).json({ error: 'Message not found' });
    }

    messages.splice(messageIndex, 1);
    await writeMessages(messages);
    res.json({ message: 'Message deleted' });
}));

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

app.use((req, res) => {
    const staticPath = path.join(__dirname, req.path);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        return res.sendFile(staticPath);
    }

    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }

    return res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack || err);
    res.status(500).json({ error: 'Something broke on the server' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Storage mode: ${storage.getMode()}`);
    });
}

module.exports = app;
