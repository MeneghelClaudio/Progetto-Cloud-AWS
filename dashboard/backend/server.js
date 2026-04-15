const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard_db',
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
        const hash = bcrypt.hashSync('admin', 10);
        await pool.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hash, 'superadmin']
        );
        console.log('Default superadmin created: admin / admin');
    }
}

app.use(express.json());

app.use(session({
    secret: 'dashboard-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.status(401).json({ error: 'Non autenticato' });
}

function isAdmin(req, res, next) {
    if (req.session.role === 'admin' || req.session.role === 'superadmin') return next();
    res.status(403).json({ error: 'Accesso negato' });
}

// ── Helper: chiamata HTTP interna verso gestione-emergenze ────────────────────
// Usato per proxare le API emergenze senza perdere body o headers
function proxyToGestione(req, res, targetPath) {
    return new Promise((resolve, reject) => {
        const body = req.body ? JSON.stringify(req.body) : null;
        const options = {
            hostname: 'gestione-emergenze',
            port: 80,
            path: targetPath,
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': String(req.session.userId),
                'X-Username': req.session.username || '',
                'X-User-Role': req.session.role || ''
            }
        };
        if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

        const proxyReq = http.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => { data += chunk; });
            proxyRes.on('end', () => {
                res.status(proxyRes.statusCode);
                try {
                    res.json(JSON.parse(data));
                } catch {
                    res.send(data);
                }
                resolve();
            });
        });
        proxyReq.on('error', (err) => {
            console.error('[proxyToGestione] Error:', err.message);
            res.status(502).json({ error: 'Servizio non raggiungibile' });
            reject(err);
        });
        if (body) proxyReq.write(body);
        proxyReq.end();
    });
}

// ── Proxy API emergenze (tutte le route sotto /api/emergencies) ───────────────

app.get('/api/emergencies/stats', isAuthenticated, (req, res) => {
    proxyToGestione(req, res, '/api/emergencies/stats');
});

app.get('/api/emergencies/my', isAuthenticated, (req, res) => {
    proxyToGestione(req, res, '/api/emergencies/my');
});

app.get('/api/emergencies', isAuthenticated, (req, res) => {
    proxyToGestione(req, res, '/api/emergencies');
});

app.post('/api/emergencies', isAuthenticated, (req, res) => {
    proxyToGestione(req, res, '/api/emergencies');
});

app.put('/api/emergencies/:id/status', isAuthenticated, (req, res) => {
    proxyToGestione(req, res, `/api/emergencies/${req.params.id}/status`);
});

// ── Proxy pagine microservizi (HTML/assets) ───────────────────────────────────

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

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username e password richiesti' });
    if (username.length < 3 || password.length < 3)
        return res.status(400).json({ error: 'Username e password devono essere almeno 3 caratteri' });
    try {
        const hash = bcrypt.hashSync(password, 10);
        await pool.execute(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hash, 'user']
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            res.status(400).json({ error: 'Username già esistente' });
        else
            res.status(500).json({ error: 'Errore del server' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username e password richiesti' });
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password))
            return res.status(401).json({ error: 'Credenziali non valide' });
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
        if (err) return res.status(500).json({ error: 'Errore durante il logout' });
        res.json({ success: true });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId)
        res.json({ authenticated: true, username: req.session.username, role: req.session.role });
    else
        res.json({ authenticated: false });
});

// ── Gestione utenti ───────────────────────────────────────────────────────────

app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    const targetId = parseInt(req.params.id);
    if (targetId === req.session.userId)
        return res.status(400).json({ error: 'Non puoi eliminare il tuo stesso account' });
    try {
        const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [targetId]);
        if (rows.length === 0)
            return res.status(404).json({ error: 'Utente non trovato' });
        const targetRole = rows[0].role;
        if ((targetRole === 'admin' || targetRole === 'superadmin') && req.session.role !== 'superadmin')
            return res.status(403).json({ error: 'Solo il superadmin può eliminare altri admin' });
        if (targetRole === 'superadmin')
            return res.status(403).json({ error: 'Il superadmin non può essere eliminato' });
        await pool.execute('DELETE FROM users WHERE id = ?', [targetId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.put('/api/users/:id/role', isAuthenticated, isAdmin, async (req, res) => {
    const targetId = parseInt(req.params.id);
    const { role } = req.body;
    if (targetId === req.session.userId)
        return res.status(400).json({ error: 'Non puoi modificare il tuo stesso ruolo' });
    if (!['user', 'admin'].includes(role))
        return res.status(400).json({ error: 'Ruolo non valido' });
    try {
        const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [targetId]);
        if (rows.length === 0)
            return res.status(404).json({ error: 'Utente non trovato' });
        const targetRole = rows[0].role;
        if ((targetRole === 'admin' || targetRole === 'superadmin') && req.session.role !== 'superadmin')
            return res.status(403).json({ error: 'Solo il superadmin può modificare il ruolo di altri admin' });
        if (targetRole === 'superadmin')
            return res.status(403).json({ error: 'Il ruolo superadmin non può essere modificato' });
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, targetId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
});
