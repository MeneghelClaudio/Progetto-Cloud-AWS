const express = require('express');
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

function isAuthenticated(req, res, next) {
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-username'];
    const role = req.headers['x-user-role'];
    if (userId) {
        req.userId = parseInt(userId);
        req.username = username;
        req.role = role;
        next();
    } else {
        res.status(401).json({ error: 'Non autenticato' });
    }
}

app.get('/api/emergencies', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT er.*, u.username 
            FROM emergency_requests er 
            JOIN users u ON er.user_id = u.id 
            ORDER BY er.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.get('/api/emergencies/my', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM emergency_requests WHERE user_id = ? ORDER BY created_at DESC',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.post('/api/emergencies', isAuthenticated, async (req, res) => {
    const { type, description, latitude, longitude } = req.body;
    
    if (!type || !description) {
        return res.status(400).json({ error: 'Tipologia e descrizione richiesti' });
    }
    
    try {
        await pool.execute(
            'INSERT INTO emergency_requests (user_id, type, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
            [req.userId, type, description, latitude || null, longitude || null]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.put('/api/emergencies/:id/status', isAuthenticated, async (req, res) => {
    const emergencyId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['aperta', 'in_carico', 'annullata', 'chiusa'].includes(status)) {
        return res.status(400).json({ error: 'Stato non valido' });
    }
    
    try {
        await pool.execute(
            'UPDATE emergency_requests SET status = ? WHERE id = ?',
            [status, emergencyId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Errore del server' });
    }
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