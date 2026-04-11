const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');

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
        res.status(401).json({ error: 'Non autenticato' });
    }
}

app.use((req, res, next) => {
    next();
});

app.get('/api/emergencies/stats', isAuthenticated, async (req, res) => {
    try {
        const [[{ open }]] = await pool.execute("SELECT COUNT(*) as open FROM emergency_requests WHERE status = 'aperta'");
        const [[{ in_carico }]] = await pool.execute("SELECT COUNT(*) as in_carico FROM emergency_requests WHERE status = 'in_carico'");
        const [[{ closed }]] = await pool.execute("SELECT COUNT(*) as closed FROM emergency_requests WHERE status = 'chiusa'");
        
        const [[{ avg_duration }]] = await pool.execute(`
            SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_duration 
            FROM emergency_requests 
            WHERE status = 'chiusa' AND updated_at > created_at
        `);
        
        res.json({ open: open || 0, in_carico: in_carico || 0, closed: closed || 0, avg_duration: avg_duration || null });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Gestione Emergenze backend running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
});