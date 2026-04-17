USE dashboard_db;

-- ============================================================
-- reset.sql — DISTRUGGE tutti i dati e ricrea da zero.
-- Eseguire MANUALMENTE solo quando serve svuotare il DB.
-- Comando: docker compose run --rm db-reset
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS emergency_requests;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'root') DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_requests (
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

-- Ricrea utente root. Password: Vmware1! (bcrypt, rounds=10)
INSERT INTO users (username, password, role)
VALUES ('root', '$2b$10$EbIbB8Ol9HvgP.6/YKsplONYa5FjLVASwMjTv/.C6fYJCERQTfun2', 'root');

SELECT 'Reset completato. Utente root ricreato.' AS status;
