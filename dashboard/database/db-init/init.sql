USE dashboard_db;

-- ============================================================
-- init.sql — eseguito ad ogni avvio dell'istanza EC2 / ASG.
-- Usa IF NOT EXISTS: idempotente, non distrugge dati esistenti.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'root') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('incidente', 'terremoto', 'incendio', 'alluvione', 'altro') NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status ENUM('aperta', 'in_carico', 'annullata', 'chiusa') DEFAULT 'aperta',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Inserisce utente root solo se non esiste (INSERT IGNORE).
-- Password: Vmware1! (bcrypt, rounds=10)
INSERT IGNORE INTO users (username, password, role)
VALUES ('root', '$2b$10$EbIbB8Ol9HvgP.6/YKsplONYa5FjLVASwMjTv/.C6fYJCERQTfun2', 'root');
