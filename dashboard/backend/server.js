const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard',
    port: process.env.DB_PORT || 3306
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    
    const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        const hash = bcrypt.hashSync('admin', 10);
        await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log('Default user created: admin / admin');
    }
}

app.use(express.json());

app.use(session({
    secret: 'dashboard-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 3600000
    }
}));

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

app.use('/storia', isAuthenticated, createProxyMiddleware({
    target: 'http://storia-del-corso:80',
    changeOrigin: true,
    pathRewrite: { '^/storia': '' }
}));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password richiesti' });
    }
    
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password)) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }
        
        req.session.userId = rows[0].id;
        req.session.username = rows[0].username;
        
        res.json({ success: true, username: rows[0].username });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Errore durante il logout' });
        }
        res.json({ success: true });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
});
