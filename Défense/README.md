# 🌊 Agadir Tsunami-Ready

> **Système d'Information Critique pour la Gestion des Routes d'Évacuation et des Sirènes d'Alerte — Région Souss-Massa**

![Django](https://img.shields.io/badge/Django-Python-092E20?style=flat&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-WebSocket-339933?style=flat&logo=node.js&logoColor=white)
![TLS](https://img.shields.io/badge/Security-HTTPS%2FTLS%201.3-green?style=flat)
![License](https://img.shields.io/badge/License-Academic-blue?style=flat)

---

## 📋 À propos du projet

**Agadir Tsunami-Ready** est un système d'information critique conçu pour la région **Souss-Massa (Agadir, Maroc)**. Il assure :

- 🗺️ La **gestion des routes d'évacuation côtières** en temps réel
- 🔔 Le **déclenchement automatique des sirènes d'alerte** lors de la détection d'un séisme marin de magnitude ≥ 6.5 sur l'échelle de Richter
- 📡 La **communication temps-réel** via WebSocket entre les capteurs sismiques et le dashboard
- 🔒 Une **architecture sécurisée** (Blue Team) avec défense en profondeur

> ⚠️ **Niveau de criticité : A (Maximum)**
> Temps de réponse imposé < 1 seconde · Disponibilité 24h/24, 7j/7, 365j/an

---

## 🏗️ Architecture

```
[Internet / Citoyens]
        ↓
[CDN Cloudflare / WAF]       ← Filtrage DDoS L3/L4/L7
        ↓
[Firewall UFW (port 443)]    ← Blocage tous ports sauf HTTPS
        ↓
[Nginx (Rate Limiting + TLS 1.3)]  ← 30 req/s/IP, HSTS, CSP
        ↓
[Load Balancer (3 instances)]      ← Haute disponibilité
        ↓
[API REST (Node.js/FastAPI)]  ← JWT Auth + RBAC + Validation
        ↓
[PostgreSQL (chiffré + RBAC)] ← Requêtes paramétrées uniquement
        ↓
      [SIEM]
```

---

## 🔐 Sécurité — Blue Team

Ce projet inclut un **audit de sécurité complet** avec correction des vulnérabilités suivantes :

| ID | Vulnérabilité | Statut |
|----|--------------|--------|
| V-01 | SQL Injection | ✅ Corrigé |
| V-02 | Man-in-the-Middle (MITM) | ✅ Corrigé |
| V-03 | Absence de contrôle d'accès (RBAC) | ✅ Corrigé |
| V-04 | Déni de Service (DoS) | ✅ Corrigé |
| V-05 | Falsification des signaux d'alerte | ✅ Corrigé |
| V-06 | Données capteurs aberrantes | ✅ Corrigé |

### Mesures de sécurité implémentées

- 🛡️ **RBAC complet** — rôles : `admin`, `operateur`, `citoyen`
- 🔑 **JWT Authentication** sur tous les endpoints sensibles
- 🧮 **Requêtes paramétrées** (Django ORM) — anti SQL Injection
- 🔒 **HTTPS/TLS 1.3** avec certificats mkcert (local) / Let's Encrypt (prod)
- ✍️ **Signature HMAC** des signaux capteurs sismiques (SHA-256 + timestamp)
- 🗄️ **Chiffrement AES-256** des coordonnées GPS des citoyens
- 🚦 **Rate Limiting** Nginx (30 req/s/IP)
- 🔥 **Firewall UFW** — port 443 uniquement
- 📝 **Variables d'environnement** — secrets externalisés dans `.env`
- ⚡ **SQL Triggers** pour déclenchement sécurisé des sirènes

---

## 🛠️ Technologies

### Backend
- **Django (Python)** — API REST principale
- **PostgreSQL** — Base de données (chiffrée)
- **Node.js** — Serveur WebSocket temps-réel
- **Nginx** — Reverse proxy + rate limiting + TLS

### Frontend
- **React.js** — Dashboard interface
- **WebSocket** — Alertes en temps réel
- **Chart.js** — Visualisation des données sismiques

### Sécurité
- `django-encrypted-model-fields` — Chiffrement AES-256
- `mkcert` — Certificats TLS locaux
- `HMAC SHA-256` — Signature des signaux
- `UFW` — Firewall Linux

---

## 🚀 Installation

### Prérequis

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- mkcert (pour HTTPS local)

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-username/agadir-tsunami-ready.git
cd agadir-tsunami-ready
```

### 2. Configuration de l'environnement

```bash
cp .env.example .env
```

Remplir le fichier `.env` :

```env
# Django
SECRET_KEY=votre_cle_secrete
DEBUG=False
ALLOWED_HOSTS=tsunami.souss-massa.ma,127.0.0.1

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tsunami_ready_db
DB_USER=tsunami_admin
DB_PASSWORD=votre_mot_de_passe_fort

# Sécurité
SEISMIC_HMAC_SECRET=votre_cle_hmac_secrete
FIELD_ENCRYPTION_KEY=votre_cle_aes256_secrete
```

### 3. Backend Django

```bash
cd Architects
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 4. Frontend React

```bash
cd Augmenteds_team/membre2-alerts
npm install
npm start
```

### 5. Certificats HTTPS (développement local)

```bash
# Installer mkcert
choco install mkcert  # Windows
brew install mkcert   # macOS

# Générer les certificats
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### 6. Firewall UFW (production)

```bash
chmod +x ufw_setup.sh
sudo ./ufw_setup.sh
```

---

## 🗂️ Structure du projet

```
Tsunami-Ready/
├── Architects/                  # Backend Django
│   ├── admin_dashboard/         # Interface administrateur
│   ├── alertes/                 # Gestion des alertes sismiques
│   ├── cartes/                  # Gestion des cartes
│   ├── config/                  # Configuration Django
│   ├── evacuation/              # Routes d'évacuation
│   ├── sql/                     # Triggers et scripts SQL
│   ├── utilisateurs/            # Gestion des utilisateurs (RBAC)
│   ├── .env                     # Variables d'environnement (non versionné)
│   ├── nginx.conf               # Configuration Nginx
│   └── manage.py
├── Augmenteds_team/             # Frontend
│   └── membre2-alerts/          # Dashboard React (WebSocket)
│       └── src/
│           ├── components/
│           ├── services/        # api.js, auth.js, websocket.js
│           └── store/
├── SETUP_GUIDE.pdf
└── README.md
```

---

## 👥 Équipe

| Nom | Rôle |
|-----|------|
| **ABELLAH M'RAK** |Sécurité (Blue Team) |
| **IKRAM MOURABIT** |Sécurité (Blue Team) |

**Encadré par :** Pr. Sara EL-ATEIF

**Module :** Systèmes d'Information et Bases de Données (SIBD)

**Filière :** Ingénierie des Technologies et Confiance Numérique (SITCN)

**École :** École Nationale Supérieure de l'Intelligence Artificielle et Sciences des Données — Taroudant (ENSIASD)

**Année universitaire :** 2025/2026

---

## 📄 Licence

Ce projet est réalisé dans un cadre académique. 2025 ENSIASD — Taroudant.

---

> *"Protéger les données sensibles tout en garantissant la disponibilité d'une alerte critique."*
