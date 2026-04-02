-- ============================================================
--  AGADIR TSUNAMI-READY — Base de données complète
--  ✅ Copier-coller DIRECT dans phpMyAdmin → onglet SQL
--  Ordre : schema → triggers → seed data
-- ============================================================

CREATE DATABASE IF NOT EXISTS tsunami_ready
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE tsunami_ready;

-- ============================================================
--  TABLES
USE tsunami_ready;

-- Convertir les anciens rôles en citizen
UPDATE users
SET role = 'citizen'
WHERE role IN ('operator', 'viewer', 'rescue');

-- Garder seulement admin et citizen
ALTER TABLE users
MODIFY COLUMN role ENUM('admin','citizen') NOT NULL DEFAULT 'citizen';

-- Optionnel : garder seulement 2 comptes de base
DELETE FROM users
WHERE email NOT IN ('admin@agadir.ma', 'citizen@agadir.ma');

DELETE FROM users
WHERE email IN ('admin@agadir.ma', 'citizen@agadir.ma');

INSERT INTO users
(username, password_hash, role, email, full_name, phone, latitude, longitude, is_active)
VALUES
('admin',   SHA2('admin2024!',256),   'admin',   'admin@agadir.ma',   'Administrateur', '+212600000001', 30.420200, -9.598200, 1),
('citizen', SHA2('citizen2024!',256), 'citizen', 'citizen@agadir.ma', 'Citoyen Test',   '+212600000002', 30.418000, -9.615000, 1);


/*
CREATE TABLE IF NOT EXISTS users (
    user_id       INT            NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)    NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    role          ENUM('admin','operator','viewer','citizen','rescue') NOT NULL DEFAULT 'citizen',
    email         VARCHAR(100)   NOT NULL,
    full_name     VARCHAR(100),
    phone         VARCHAR(20),
    latitude      DECIMAL(9,6)   DEFAULT 30.420200,
    longitude     DECIMAL(9,6)   DEFAULT -9.598200,
    is_active     TINYINT(1)     NOT NULL DEFAULT 1,
    created_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_username (username),
    UNIQUE KEY uq_email    (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id  INT          NOT NULL AUTO_INCREMENT,
    user_id     INT          NOT NULL,
    token_hash  VARCHAR(64)  NOT NULL,
    ip_address  VARCHAR(45),
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME     NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (session_id),
    UNIQUE KEY uq_token (token_hash),
    INDEX idx_token   (token_hash),
    INDEX idx_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seismic_sensors (
    sensor_id            INT            NOT NULL AUTO_INCREMENT,
    sensor_code          VARCHAR(20)    NOT NULL,
    name                 VARCHAR(100)   NOT NULL,
    latitude             DECIMAL(9,6)   NOT NULL,
    longitude            DECIMAL(9,6)   NOT NULL,
    altitude_m           DECIMAL(8,2),
    depth_meters         DECIMAL(8,2),
    location_description TEXT,
    status               ENUM('ONLINE','OFFLINE','MAINTENANCE','FAULTY') NOT NULL DEFAULT 'ONLINE',
    installed_at         DATE           NOT NULL,
    last_ping            DATETIME,
    created_by           INT,
    PRIMARY KEY  (sensor_id),
    UNIQUE KEY   uq_sensor_code (sensor_code),
    FOREIGN KEY  (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seismic_events (
    event_id              INT            NOT NULL AUTO_INCREMENT,
    sensor_id             INT            NOT NULL,
    magnitude             DECIMAL(4,2)   NOT NULL,
    depth_km              DECIMAL(6,2),
    latitude              DECIMAL(9,6)   NOT NULL,
    longitude             DECIMAL(9,6)   NOT NULL,
    event_time            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_seconds      INT,
    epicenter_description VARCHAR(250),
    raw_data              JSON,
    processed             TINYINT(1)     NOT NULL DEFAULT 0,
    created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    FOREIGN KEY (sensor_id) REFERENCES seismic_sensors(sensor_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
    alert_id             INT            NOT NULL AUTO_INCREMENT,
    event_id             INT            NOT NULL,
    alert_level          ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
    alert_type           VARCHAR(50)    NOT NULL,
    message              TEXT           NOT NULL,
    triggered_at         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status               ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    acknowledged_by      INT,
    acknowledged_at      DATETIME,
    resolved_at          DATETIME,
    sirens_activated     TINYINT(1)     NOT NULL DEFAULT 0,
    evacuation_triggered TINYINT(1)     NOT NULL DEFAULT 0,
    PRIMARY KEY (alert_id),
    FOREIGN KEY (event_id)        REFERENCES seismic_events(event_id) ON DELETE RESTRICT,
    FOREIGN KEY (acknowledged_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_logs (
    log_id       INT            NOT NULL AUTO_INCREMENT,
    action       ENUM('INSERT','UPDATE','DELETE','ALERT_TRIGGERED','LOGIN','LOGOUT','API_CALL','REGISTER') NOT NULL,
    table_name   VARCHAR(50),
    record_id    INT,
    description  TEXT,
    old_data     JSON,
    new_data     JSON,
    performed_by INT,
    ip_address   VARCHAR(45),
    performed_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (log_id),
    FOREIGN KEY  (performed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evacuation_routes (
    route_id         INT            NOT NULL AUTO_INCREMENT,
    route_name       VARCHAR(100)   NOT NULL,
    start_point      VARCHAR(200)   NOT NULL,
    end_point        VARCHAR(200)   NOT NULL,
    distance_km      DECIMAL(6,2),
    capacity_persons INT,
    is_active        TINYINT(1)     NOT NULL DEFAULT 1,
    last_verified    DATE,
    PRIMARY KEY (route_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS citizens_locations (
    location_id INT          NOT NULL AUTO_INCREMENT,
    user_id     INT          NOT NULL,
    latitude    DECIMAL(9,6) NOT NULL,
    longitude   DECIMAL(9,6) NOT NULL,
    speed_kmh   DECIMAL(5,2) DEFAULT 0,
    accuracy_m  DECIMAL(8,2),
    recorded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_time (user_id, recorded_at),
    INDEX idx_recorded  (recorded_at)
) ENGINE=InnoDB;

-- ============================================================
--  INDEX PERFORMANCES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_sensor    ON seismic_events(sensor_id);
CREATE INDEX IF NOT EXISTS idx_events_time      ON seismic_events(event_time);
CREATE INDEX IF NOT EXISTS idx_events_magnitude ON seismic_events(magnitude);
CREATE INDEX IF NOT EXISTS idx_alerts_event     ON alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_time      ON alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_logs_time        ON system_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_sensors_status   ON seismic_sensors(status);

-- ============================================================
--  TRIGGERS
-- ============================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_auto_alert$$
CREATE TRIGGER trg_auto_alert
AFTER INSERT ON seismic_events
FOR EACH ROW
BEGIN
    DECLARE v_level      VARCHAR(10);
    DECLARE v_type       VARCHAR(50);
    DECLARE v_message    TEXT;
    DECLARE v_sirens     TINYINT(1) DEFAULT 0;
    DECLARE v_evacuation TINYINT(1) DEFAULT 0;

    IF NEW.magnitude >= 6.5 THEN
        IF NEW.magnitude >= 8.0 THEN
            SET v_level='CRITICAL'; SET v_type='TSUNAMI'; SET v_sirens=1; SET v_evacuation=1;
            SET v_message=CONCAT('🚨 ALERTE MAXIMALE — M',NEW.magnitude,' — ÉVACUATION TOTALE. Sirènes activées.');
        ELSEIF NEW.magnitude >= 7.0 THEN
            SET v_level='HIGH'; SET v_type='TSUNAMI'; SET v_sirens=1; SET v_evacuation=1;
            SET v_message=CONCAT('⚠️ ALERTE HAUTE — M',NEW.magnitude,' — RISQUE TSUNAMI. Évacuation immédiate.');
        ELSE
            SET v_level='MEDIUM'; SET v_type='SEISMIC'; SET v_sirens=0; SET v_evacuation=0;
            SET v_message=CONCAT('⚠️ ALERTE MOYENNE — M',NEW.magnitude,' — Surveillance tsunami activée.');
        END IF;
        INSERT INTO alerts (event_id,alert_level,alert_type,message,sirens_activated,evacuation_triggered)
        VALUES (NEW.event_id,v_level,v_type,v_message,v_sirens,v_evacuation);
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_validate_event$$
CREATE TRIGGER trg_validate_event
BEFORE INSERT ON seismic_events
FOR EACH ROW
BEGIN
    IF NEW.magnitude < 0 OR NEW.magnitude > 10 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Magnitude invalide (0-10).';
    END IF;
    IF NEW.depth_km IS NOT NULL AND NEW.depth_km < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Profondeur négative invalide.';
    END IF;
    UPDATE seismic_sensors SET last_ping=NOW() WHERE sensor_id=NEW.sensor_id;
END$$

DROP TRIGGER IF EXISTS trg_log_seismic_event$$
CREATE TRIGGER trg_log_seismic_event
AFTER INSERT ON seismic_events
FOR EACH ROW
BEGIN
    INSERT INTO system_logs (action,table_name,record_id,description,new_data)
    VALUES ('INSERT','seismic_events',NEW.event_id,
        CONCAT('Événement M',NEW.magnitude,' | Capteur #',NEW.sensor_id,' | ',NEW.event_time),
        JSON_OBJECT('event_id',NEW.event_id,'sensor_id',NEW.sensor_id,'magnitude',NEW.magnitude,
                    'depth_km',NEW.depth_km,'latitude',NEW.latitude,'longitude',NEW.longitude));
END$$

DROP TRIGGER IF EXISTS trg_log_alert$$
CREATE TRIGGER trg_log_alert
AFTER INSERT ON alerts
FOR EACH ROW
BEGIN
    INSERT INTO system_logs (action,table_name,record_id,description,new_data)
    VALUES ('ALERT_TRIGGERED','alerts',NEW.alert_id,
        CONCAT('ALERTE ',NEW.alert_type,' | ',NEW.alert_level,' | Évacuation:',NEW.evacuation_triggered),
        JSON_OBJECT('alert_id',NEW.alert_id,'event_id',NEW.event_id,'alert_level',NEW.alert_level,
                    'sirens_activated',NEW.sirens_activated,'evacuation_triggered',NEW.evacuation_triggered));
END$$

DELIMITER ;

-- ============================================================
--  PROCÉDURES STOCKÉES
-- ============================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS calculate_risk_level$$
CREATE PROCEDURE calculate_risk_level(IN p_magnitude DECIMAL(4,2))
BEGIN
    IF p_magnitude < 2.0 THEN
        SELECT 'NÉGLIGEABLE' AS risk_level,'Micro-séisme imperceptible.' AS description,'Surveillance standard.' AS recommended_action,'#6B7280' AS color_code;
    ELSEIF p_magnitude < 3.5 THEN
        SELECT 'TRÈS FAIBLE' AS risk_level,'Légère vibration perceptible.' AS description,'Notification équipe de veille.' AS recommended_action,'#10B981' AS color_code;
    ELSEIF p_magnitude < 5.0 THEN
        SELECT 'MODÉRÉ' AS risk_level,'Secousse notable.' AS description,'Alerte préventive équipes terrain.' AS recommended_action,'#F59E0B' AS color_code;
    ELSEIF p_magnitude < 6.5 THEN
        SELECT 'ÉLEVÉ' AS risk_level,'Dommages significatifs possibles.' AS description,'Activation protocole urgence.' AS recommended_action,'#F97316' AS color_code;
    ELSEIF p_magnitude < 7.5 THEN
        SELECT 'CRITIQUE' AS risk_level,'Séisme destructeur. Risque tsunami élevé.' AS description,'ÉVACUATION IMMÉDIATE zones côtières.' AS recommended_action,'#EF4444' AS color_code;
    ELSE
        SELECT 'CATASTROPHIQUE' AS risk_level,'Séisme majeur. Tsunami quasi-certain.' AS description,'ÉVACUATION TOTALE. ALERTE MAXIMALE.' AS recommended_action,'#7C3AED' AS color_code;
    END IF;
END$$

DROP PROCEDURE IF EXISTS get_seismic_report$$
CREATE PROCEDURE get_seismic_report(IN p_days INT)
BEGIN
    SELECT CONCAT('Derniers ',p_days,' jours') AS period_label,
        COUNT(DISTINCT e.event_id) AS total_events,
        ROUND(AVG(e.magnitude),2)  AS avg_magnitude,
        MAX(e.magnitude)           AS max_magnitude,
        COUNT(DISTINCT a.alert_id) AS total_alerts,
        SUM(CASE WHEN a.alert_level='CRITICAL' THEN 1 ELSE 0 END) AS critical_alerts
    FROM seismic_events e
    LEFT JOIN alerts a ON a.event_id=e.event_id
    WHERE e.event_time >= DATE_SUB(NOW(),INTERVAL p_days DAY);
END$$

DELIMITER ;

-- ============================================================
--  DONNÉES : Utilisateurs
--  Mots de passe hashés SHA2-256 (utilisé par Node.js)
-- ============================================================
INSERT INTO users (username, password_hash, role, email, full_name, phone, latitude, longitude, is_active) VALUES
('admin',          SHA2('admin2024!',256),      'admin',    'admin@agadir.ma',       'Administrateur Système',     '+212 528 000 001', 30.420200, -9.598200, 1),
('directeur',      SHA2('directeur2024!',256),  'admin',    'directeur@agadir.ma',   'Directeur Protection Civile','+212 528 000 002', 30.425000, -9.600000, 1),
('operateur1',     SHA2('operateur2024!',256),  'operator', 'operateur1@agadir.ma',  'Opérateur Centre de Crise',  '+212 528 000 010', 30.418000, -9.597000, 1),
('operateur2',     SHA2('operateur2024!',256),  'operator', 'operateur2@agadir.ma',  'Opérateur Sismique',         '+212 528 000 011', 30.421000, -9.601000, 1),
('secours',        SHA2('secours2024!',256),    'rescue',   'secours@agadir.ma',     'Chef Équipe Secours',        '+212 528 000 020', 30.410000, -9.600000, 1),
('pompiers_agadir',SHA2('pompiers2024!',256),   'rescue',   'pompiers@agadir.ma',    'Caserne Pompiers Agadir',    '+212 528 000 021', 30.415000, -9.605000, 1),
('demo',           SHA2('demo1234!',256),       'citizen',  'demo@agadir.ma',        'Citoyen Démo',               '+212 600 000 001', 30.415000, -9.610000, 1),
('citoyen_agadir', SHA2('citoyen1234!',256),    'citizen',  'citoyen@agadir.ma',     'Mohammed Al Agadir',         '+212 600 000 002', 30.418000, -9.615000, 1),
('fatima_anza',    SHA2('citoyen1234!',256),    'citizen',  'fatima@agadir.ma',      'Fatima Benali',              '+212 600 000 003', 30.455000, -9.645000, 1),
('karim_port',     SHA2('citoyen1234!',256),    'citizen',  'karim@agadir.ma',       'Karim Ouali',                '+212 600 000 004', 30.425000, -9.621000, 1);

-- ============================================================
--  DONNÉES : Capteurs sismiques
-- ============================================================
INSERT INTO seismic_sensors (sensor_code,name,latitude,longitude,altitude_m,depth_meters,location_description,status,installed_at,created_by) VALUES
('SENS-AG-001','Capteur Port Agadir',      30.4250,-9.6210,  3.0, 5.0,'Zone portuaire — exposition directe', 'ONLINE',     '2023-01-15',1),
('SENS-AG-002','Capteur Fond Marin Souss', 30.2000,-9.8000,-120.0, 0.0,'Fond marin — détection précoce',     'ONLINE',     '2023-03-20',1),
('SENS-AG-003','Capteur Cap Ghir',         30.6300,-9.8900, 45.0, 0.0,'Cap Ghir — surveillance atlantique',  'ONLINE',     '2023-06-10',1),
('SENS-AG-004','Capteur Taghazout',        30.5430,-9.7090,  8.0, 3.0,'Plage Taghazout — zone balnéaire',   'ONLINE',     '2023-09-05',1),
('SENS-AG-005','Capteur Anza Sous-Marin',  30.4550,-9.6800,-40.0, 0.0,'Plateau continental Anza',            'ONLINE',     '2024-01-10',1),
('SENS-AG-006','Capteur Tiznit Marine',    29.7000,-9.9500,-80.0, 0.0,'Large Tiznit — faille atlantique',    'ONLINE',     '2024-03-15',1),
('SENS-AG-007','Capteur Essaouira',        31.5100,-9.7700, 12.0, 0.0,'Essaouira — surveillance nord',       'MAINTENANCE','2023-11-20',1),
('SENS-AG-008','Capteur Safi Marine',      32.3000,-10.000,-60.0, 0.0,'Large Safi — faille nord-atlantique', 'ONLINE',     '2024-05-20',1);

-- ============================================================
--  DONNÉES : Routes d'évacuation
-- ============================================================
INSERT INTO evacuation_routes (route_name,start_point,end_point,distance_km,capacity_persons,is_active,last_verified) VALUES
('Route Plage → Colline Yachts Club',  'Front de mer Agadir',  'Colline Yachts Club (AP1)', 2.1,3000,1,'2024-11-01'),
('Route Port → Plateau Founty',        'Zone Portuaire',        'Plateau Founty (AP2)',      3.4,5000,1,'2024-11-01'),
('Route Anza → Colline Anza Haute',    'Plage Anza',            'Colline Anza Haute (AP3)',  1.8,2500,1,'2024-10-15'),
('Route Centre → Zone Industrielle',   'Agadir Centre',         'Zone Industrielle (AP4)',   4.2,4000,1,'2024-11-01'),
('Route Sud → Université Ibn Zohr',    'Cité Dakhla',           'Université Ibn Zohr (AP5)',5.1,8000,1,'2024-11-01'),
('Route Bensergao → Colline Bensergao','Bensergao Côte',        'Colline Bensergao (AP6)',   1.5,2000,1,'2024-10-20');

-- ============================================================
--  DONNÉES : Événements test (déclenche les triggers)
-- ============================================================
INSERT INTO seismic_events (sensor_id,magnitude,depth_km,latitude,longitude,epicenter_description) VALUES
(1, 3.2, 12.0, 30.380, -9.610, 'Microséisme Baie Agadir'),
(2, 4.8, 20.0, 30.290,-10.000, 'Secousse modérée Atlantique'),
(3, 5.4, 15.0, 30.500, -9.720, 'Séisme ressenti Taghazout'),
(5, 6.5, 12.0, 30.250,-10.050, 'SÉISME SIGNIFICATIF — Alerte tsunami'),
(5, 7.2,  7.5, 30.310, -9.880, 'SÉISME MAJEUR — Tsunami potentiel'),
(5, 8.1,  5.0, 30.180,-10.220, 'SÉISME CATASTROPHIQUE — Risque tsunami maximal');

-- ============================================================
--  LOG INITIAL
-- ============================================================
INSERT INTO system_logs (action,table_name,description) VALUES
('INSERT','users','Initialisation comptes système TsunamiReady'),
('INSERT','seismic_sensors','Déploiement réseau 8 capteurs Agadir'),
('INSERT','evacuation_routes','Configuration 6 routes évacuation côtière');

-- ============================================================
--  VÉRIFICATION FINALE
-- ============================================================
SELECT 'users'              AS table_name, COUNT(*) AS total FROM users
UNION ALL SELECT 'sensors',  COUNT(*) FROM seismic_sensors
UNION ALL SELECT 'events',   COUNT(*) FROM seismic_events
UNION ALL SELECT 'alerts',   COUNT(*) FROM alerts
UNION ALL SELECT 'logs',     COUNT(*) FROM system_logs
UNION ALL SELECT 'routes',   COUNT(*) FROM evacuation_routes;

-- ============================================================
--  COMPTES CRÉÉS
-- ============================================================
-- admin@agadir.ma        / admin2024!       → admin
-- directeur@agadir.ma   / directeur2024!   → admin
-- operateur1@agadir.ma  / operateur2024!   → operator
-- operateur2@agadir.ma  / operateur2024!   → operator
-- secours@agadir.ma     / secours2024!     → rescue
-- pompiers@agadir.ma    / pompiers2024!    → rescue
-- demo@agadir.ma        / demo1234!        → citizen
-- citoyen@agadir.ma     / citoyen1234!     → citizen
-- fatima@agadir.ma      / citoyen1234!     → citizen
-- karim@agadir.ma       / citoyen1234!     → citizen
*/