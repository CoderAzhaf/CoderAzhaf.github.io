const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
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

// Handle 404
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Press Ctrl+C to stop the server`);
});