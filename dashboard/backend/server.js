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
    database: process.env.DB_NAME || 'dashboard_db',
    port: process.env.DB_PORT || 3306
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    
    const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        const hash = bcrypt.hashSync('admin', 10);
        await pool.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
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
        res.redirect('/login/');
    }
}

function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Accesso negato' });
    }
}

app.use('/storia-del-corso', isAuthenticated, createProxyMiddleware({
    target: 'http://storia-del-corso:80',
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/storia-del-corso\/?/, '/') || '/'
}));

app.use('/gestione-emergenze', isAuthenticated, createProxyMiddleware({
    target: 'http://gestione-emergenze:80',
    changeOrigin: true,
    pathRewrite: (path) => path.replace(/^\/gestione-emergenze\/?/, '/') || '/'
}));

// Proxy API calls for gestione-emergenze — auth checked here, forwarded with session userId in header
app.use('/api/emergencies', isAuthenticated, createProxyMiddleware({
    target: 'http://gestione-emergenze:80',
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq, req) => {
            proxyReq.setHeader('X-User-Id', req.session.userId);
            proxyReq.setHeader('X-Username', req.session.username);
            proxyReq.setHeader('X-User-Role', req.session.role);
        }
    }
}));

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password richiesti' });
    }
    
    if (username.length < 3 || password.length < 3) {
        return res.status(400).json({ error: 'Username e password devono essere almeno 3 caratteri' });
    }
    
    try {
        const hash = bcrypt.hashSync(password, 10);
        await pool.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, 'user']);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Username già esistente' });
        } else {
            res.status(500).json({ error: 'Errore del server' });
        }
    }
});

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
        req.session.role = rows[0].role;
        
        res.json({ success: true, username: rows[0].username, role: rows[0].role });
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
        res.json({ authenticated: true, username: req.session.username, role: req.session.role });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
    }
    
    try {
        await pool.execute('DELETE FROM users WHERE id = ? AND role != ?', [userId, 'admin']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.put('/api/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (userId === req.session.userId) {
        return res.status(400).json({ error: 'Non puoi modificare il tuo stesso ruolo' });
    }
    
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Ruolo non valido' });
    }
    
    try {
        await pool.execute('UPDATE users SET role = ? WHERE id = ? AND role != ?', [role, userId, 'admin']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
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