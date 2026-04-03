const fs = require('fs/promises');
const path = require('path');

const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const BALANCES_FILE = path.join(__dirname, 'balances.json');

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
        isAdmin: true,
        warnings: 0,
        status: 'active'
    },
    Alyanuddin: {
        username: 'Alyanuddin',
        password: 'alyanpro',
        fullName: 'Alyanuddin Mohammed',
        isAdmin: true,
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

const defaultMessages = [];
const defaultBalances = { AZHA: 'INF' };

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createFileStore() {
    async function readJson(filePath, fallbackValue) {
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            return JSON.parse(raw);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            await writeJson(filePath, fallbackValue);
            return clone(fallbackValue);
        }
    }

    async function writeJson(filePath, value) {
        await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    }

    return {
        async readAccounts() {
            return readJson(ACCOUNTS_FILE, defaultAccounts);
        },
        async writeAccounts(accounts) {
            await writeJson(ACCOUNTS_FILE, accounts);
        },
        async readMessages() {
            return readJson(MESSAGES_FILE, defaultMessages);
        },
        async writeMessages(messages) {
            await writeJson(MESSAGES_FILE, messages);
        },
        async readBalances() {
            return readJson(BALANCES_FILE, defaultBalances);
        },
        async writeBalances(balances) {
            await writeJson(BALANCES_FILE, balances);
        },
        getMode() {
            return 'file';
        }
    };
}

function createUpstashStore() {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    const prefix = process.env.UPSTASH_KEY_PREFIX || 'coder-azhaf';

    async function request(command, ...args) {
        const response = await fetch(`${baseUrl}/${command}/${args.map((value) => encodeURIComponent(value)).join('/')}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upstash ${command} failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        return data.result;
    }

    async function readKey(key, fallbackValue) {
        const raw = await request('get', `${prefix}:${key}`);
        if (!raw) {
            await writeKey(key, fallbackValue);
            return clone(fallbackValue);
        }
        return JSON.parse(raw);
    }

    async function writeKey(key, value) {
        await request('set', `${prefix}:${key}`, JSON.stringify(value));
    }

    return {
        async readAccounts() {
            return readKey('accounts', defaultAccounts);
        },
        async writeAccounts(accounts) {
            await writeKey('accounts', accounts);
        },
        async readMessages() {
            return readKey('messages', defaultMessages);
        },
        async writeMessages(messages) {
            await writeKey('messages', messages);
        },
        async readBalances() {
            return readKey('balances', defaultBalances);
        },
        async writeBalances(balances) {
            await writeKey('balances', balances);
        },
        getMode() {
            return 'upstash';
        }
    };
}

function createStorage() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        return createUpstashStore();
    }
    return createFileStore();
}

module.exports = {
    createStorage,
    defaultAccounts,
    defaultMessages,
    defaultBalances
};
