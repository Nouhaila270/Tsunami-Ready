# 🌊 TsunamiReady — Système d'Alerte et d'Évacuation Côtière
### Agadir · Côte Atlantique · Maroc

> Plateforme temps réel de détection sismique, d'alerte tsunami et de coordination d'évacuation pour la ville d'Agadir.

---
## 🎥 Demo vidéo

👉 [▶️ Voir la démo complète du système TsunamiReady](https://drive.google.com/file/d/1T2hmv80XkQ6TNmzpsZC0p1LUXU2fj7SC/view?usp=sharing)
## 📸 Aperçu

| Dashboard | Sirènes | Carte | Points de Hauteur |
|-----------|---------|-------|-------------------|
| KPIs en temps réel | Activation automatique | Routes GPS | 6 zones refuge |
| Graphiques sismiques | Alertes WhatsApp | Zones inondables | Capacité en direct |

---

## 🏗️ Architecture du projet

```
tsunami-ready-v2/
│
├── membre2-alerts/              ← Backend Node.js (Membre 2)
│   ├── server.js                ← API REST + WebSocket + WhatsApp
│   ├── firebase-key.json        ← Clé Firebase (ne pas committer)
│   ├── package.json
│   └── .env                    ← Variables d'environnement (//)
│
├── src/
│   ├── components/
│   │   ├── app.js               ← Orchestrateur principal
│   │   ├── assembly.js          ← Points de rassemblement
│   │   ├── charts.js            ← Graphiques Chart.js
│   │   ├── dashboard.js         ← KPIs tableau de bord
│   │   ├── map.js               ← Carte Leaflet interactive
│   │   └── sirens.js            ← Réseau de sirènes + WhatsApp
│   │
│   ├── services/
│   │   ├── api.js               ← Appels API REST
│   │   ├── auth.js              ← Authentification + GPS
│   │   └── websocket.js         ← Connexion temps réel
│   │
│   ├── store/
│   │   └── state.js             ← État global de l'application
│   │
│   ├── utils/
│   │   └── evacuation.js        ← Algorithme de calcul des routes
│   │
│   └── styles/
│       └── main.css             ← Styles globaux
│
├── index.html                   ← Application principale
├── login.html                   ← Page de connexion / inscription
└── app.py                       ← API Flask (Membre 1) — événements sismiques
```

---

## ⚙️ Technologies utilisées

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5, CSS3, JavaScript vanilla |
| Carte | Leaflet.js 1.9.4 |
| Graphiques | Chart.js 4.4 |
| Backend | Node.js + Express |
| Temps réel | WebSocket (ws) |
| Base de données | MySQL 8 |
| Alertes SMS/WhatsApp | Twilio API |
| API sismique | Flask + PyMySQL |
| Authentification | Sessions JWT maison (auth_sessions) |

---

## 🚀 Installation et lancement

### Prérequis

- Node.js v18+
- Python 3.10+
- MySQL 8 (port **3307**)
- Compte Twilio (sandbox WhatsApp)

---



---

### 2. Configurer les variables d'environnement

Créez le fichier `.env` à la racine du projet :

```env
# Base de données MySQL
DB_HOST=localhost
DB_PORT=3307
DB_NAME=tsunami_ready
DB_USER=root
DB_PASSWORD=

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Serveur
PORT=3001
```



---

### 3. Installer les dépendances Node.js

```bash
cd membre2-alerts
npm install
```

---

### 4. Installer les dépendances Python

```bash
pip install flask flask-cors pymysql
```

---

### 5. Créer la base de données MySQL

Connectez-vous à MySQL et exécutez :

```sql
CREATE DATABASE tsunami_ready CHARACTER SET utf8mb4;
USE tsunami_ready;

-- Table utilisateurs
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(64) NOT NULL,
  role ENUM('admin','citizen') DEFAULT 'citizen',
  email VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  latitude DECIMAL(10,6) DEFAULT 30.420200,
  longitude DECIMAL(10,6) DEFAULT -9.598200,
  is_active TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- Table sessions
CREATE TABLE auth_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active TINYINT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Table positions GPS citoyens
CREATE TABLE citizens_locations (
  location_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  latitude DECIMAL(10,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  speed_kmh DECIMAL(5,2) DEFAULT 0,
  accuracy_m DECIMAL(8,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Table événements sismiques
CREATE TABLE seismic_events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  sensor_id INT NOT NULL,
  magnitude DECIMAL(4,2) NOT NULL,
  depth_km DECIMAL(6,2) DEFAULT 10.0,
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  duration_seconds INT,
  epicenter_description VARCHAR(250),
  event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table capteurs sismiques
CREATE TABLE seismic_sensors (
  sensor_id INT AUTO_INCREMENT PRIMARY KEY,
  sensor_code VARCHAR(20) UNIQUE,
  name VARCHAR(100),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  status ENUM('active','inactive') DEFAULT 'active',
  last_ping TIMESTAMP,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table alertes
CREATE TABLE alerts (
  alert_id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT,
  status ENUM('ACTIVE','ACKNOWLEDGED','RESOLVED') DEFAULT 'ACTIVE',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_by INT,
  acknowledged_at TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES seismic_events(event_id)
);

-- Table logs système
CREATE TABLE system_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50),
  table_name VARCHAR(50),
  description TEXT,
  performed_by INT,
  ip_address VARCHAR(45),
  new_data JSON,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comptes par défaut
INSERT INTO users (username, password_hash, role, email, full_name, phone, latitude, longitude)
VALUES
  ('admin', SHA2('admin2024!', 256), 'admin', 'admin@agadir.ma', 'Administrateur Système', '+212600000000', 30.4250, -9.6000),
  ('citizen', SHA2('citizen2024!', 256), 'citizen', 'citizen@agadir.ma', 'Citoyen Test', '+212718774347', 30.4202, -9.5982);

-- Capteur sismique par défaut
INSERT INTO seismic_sensors (sensor_code, name, latitude, longitude)
VALUES ('SENS-001', 'Capteur Agadir Centre', 30.4250, -9.6000);
```

---

### 6. Lancer le backend Node.js

```bash
cd membre2-alerts
node server.js
```

Résultat attendu :
```
✅ MySQL connecté → tsunami_ready
🌊 TsunamiReady Server — Port 3001
Twilio configuré: OUI
```

---

### 7. Lancer l'API Flask (optionnel — Membre 1)

```bash
python app.py
```

L'API Flask tourne sur le port **5000**.

---

### 8. Ouvrir l'application

Servez les fichiers statiques avec un serveur local (ex: Live Server VS Code, ou) :

```bash
npx serve . -p 8080
```

Puis ouvrez : **http://localhost:8080/index.html**

---

## 👤 Comptes de test

| Rôle | Email | Mot de passe | Accès |
|------|-------|-------------|-------|
| Admin | admin@agadir.ma | admin2024! | Tout + liste citoyens |
| Citoyen | citizen@agadir.ma | citizen2024! | Profil + GPS + route |

---

## 🔔 Fonctionnalités principales

### Dashboard temps réel
- Magnitude de la dernière secousse marine
- Nombre de sirènes actives
- Citoyens en évacuation (positions GPS)
- Routes d'évacuation calculées
- Graphiques : flux de population + historique sismique

### Carte d'évacuation interactive
- Positions GPS des citoyens en temps réel
- Routes d'évacuation calculées (algorithme Haversine)
- Zones inondables côtières (risque haut / moyen)
- 6 points de rassemblement en hauteur
- Couches activables/désactivables

### Réseau de sirènes
- 4 sirènes virtuelles (Port, Plage, Anza, Taghazout)
- Activation automatique si magnitude ≥ 6.5
- Test manuel avec envoi WhatsApp automatique
- Réinitialisation complète

### Alertes WhatsApp (Twilio)
- Envoi automatique à **tous les citoyens** avec numéro enregistré
- Seuil : magnitude ≥ 6.0
- Message personnalisé avec nom, magnitude et lieu
- Broadcast depuis `/api/alerts/whatsapp-broadcast`

### Points de rassemblement
| Point | Altitude | Capacité | District |
|-------|----------|----------|---------|
| Colline Yachts Club | 85m | 3 000 | Agadir Centre |
| Plateau Founty | 120m | 5 000 | Founty |
| Colline Anza Haute | 95m | 2 500 | Anza |
| Zone Industrielle | 110m | 4 000 | Industriel |
| Université Ibn Zohr | 140m | 8 000 | Hay Mohammadi |
| Colline Bensergao | 75m | 2 000 | Bensergao |

### Algorithme d'évacuation
- Calcul Haversine (distance réelle)
- Score composite : distance + altitude + taux d'occupation + risque inondation
- Vitesse de marche adaptée : 4 km/h normal, 2.5 km/h si zone à risque
- Route personnelle affichée dans la sidebar en temps réel

---

## 📡 API Endpoints

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Inscription citoyen |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil connecté |

### Utilisateurs (admin)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users` | Liste tous les utilisateurs |
| GET | `/api/users/citizens` | Liste les citoyens |
| GET | `/api/users/:id` | Profil utilisateur |
| PUT | `/api/users/:id` | Modifier profil |

### GPS & Localisation
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/locations/update` | Envoyer position GPS |
| GET | `/api/locations/active` | Positions actives (5 min) |

### Sirènes
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/sirens/status` | État de toutes les sirènes |
| POST | `/api/sirens/:id/activate` | Activer une sirène (admin) |
| POST | `/api/sirens/:id/deactivate` | Désactiver une sirène (admin) |

### Alertes WhatsApp
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/alerts/whatsapp-test` | WhatsApp → utilisateur connecté |
| POST | `/api/alerts/whatsapp-broadcast` | WhatsApp → tous les citoyens |
| GET | `/test-whatsapp?phone=+212...` | Test direct par numéro |

### API Flask (port 5000)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/events` | Liste événements sismiques |
| POST | `/events` | Ajouter un événement |
| GET | `/alerts` | Liste alertes |
| GET | `/sensors` | Liste capteurs |

---

## 🔌 WebSocket — Événements temps réel

| Type | Direction | Description |
|------|-----------|-------------|
| `identify` | Client → Serveur | Identification utilisateur |
| `identified` | Serveur → Client | Confirmation connexion |
| `citizen_position` | Serveur → Client | Nouvelle position GPS |
| `citizen_positions` | Serveur → Client | Toutes les positions |
| `seismic_event` | Serveur → Client | Nouveau séisme détecté |
| `siren_activate` | Serveur → Client | Sirène activée |
| `siren_deactivate` | Serveur → Client | Sirène désactivée |

---

## 📲 Configuration Twilio WhatsApp Sandbox

1. Créez un compte sur [console.twilio.com](https://console.twilio.com)
2. Allez dans **Messaging → Try it out → Send a WhatsApp message**
3. Notez votre mot de jointure (ex: `join example-word`)
4. Depuis chaque téléphone destinataire, envoyez ce message WhatsApp au **+1 415 523 8886**
5. Chaque numéro est maintenant opt-in et recevra les alertes

> Pour la production, passez au numéro WhatsApp Business Twilio approuvé.

---

## 🗂️ Fichiers à ne PAS committer

Ajoutez ces lignes dans votre `.gitignore` :

```gitignore
.env
membre2-alerts/firebase-key.json
node_modules/
__pycache__/
*.pyc
```

---

## 👥 Équipe

| Membre | Rôle | Responsabilité |
|--------|------|----------------|
| Membre 1 | Backend Flask | API sismique, base de données, alertes |
| Membre 2 | Backend Node.js | Auth, GPS, WebSocket, WhatsApp |
| Membre 3 | Frontend | Interface, carte, dashboard, algorithme |

---

## 📄 Licence

Projet académique — Université Ibn Zohr, Agadir.  
Développé dans le cadre du module Systèmes d'Information et Gestion des Risques.
