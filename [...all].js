const app = require('../server');

module.exports = (req, res) => {
    const originalUrl = req.url || '/';
    req.url = originalUrl.startsWith('/api') ? originalUrl : `/api${originalUrl === '/' ? '' : originalUrl}`;
    return app(req, res);
};
