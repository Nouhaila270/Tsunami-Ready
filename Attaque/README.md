# 🔴 Red Team Security Assessment — Agadir Tsunami-Ready

<div align="center">

![Status](https://img.shields.io/badge/Statut-NOT%20PRODUCTION%20READY-red?style=for-the-badge&logo=shield)
![CVSS](https://img.shields.io/badge/Score%20CVSS-8.5%20%2F%2010-critical?style=for-the-badge&logo=bugcrowd)
![Method](https://img.shields.io/badge/Méthode-OWASP%20Top%2010%20%2B%20PTES-blue?style=for-the-badge&logo=owasp)
![Date](https://img.shields.io/badge/Date-13%20Avril%202026-orange?style=for-the-badge&logo=googlecalendar)
![Kali](https://img.shields.io/badge/Environnement-Kali%20Linux-557C94?style=for-the-badge&logo=kalilinux)

<br/>

> **⚠️ DOCUMENT CONFIDENTIEL — USAGE INTERNE UNIQUEMENT**
> Résultats de l'évaluation Red Team réalisée dans le cadre du **SIBD Projet 2025-2026**
> ENSIASD Taroudant — Pr. Sara El-Ateif

</div>

---

## 📋 Table des matières

- [👥 Équipe Red Team](#-équipe-red-team)
- [🎯 Contexte & Objectifs](#-contexte--objectifs)
- [🖥️ Applications testées](#️-applications-testées)
- [⚠️ Résumé des vulnérabilités](#️-résumé-des-vulnérabilités)
- [🔍 Détail des attaques](#-détail-des-attaques)
  - [VULN-001 — Broken Access Control](#vuln-001--broken-access-control--critique)
  - [VULN-002 — Man-in-the-Middle](#vuln-002--accès-données-sensibles--man-in-the-middle--critique)
  - [VULN-003 — CORS Wildcard](#vuln-003--cors-wildcard--high)
  - [VULN-004 — DoS / Rate Limiting](#vuln-004--absence-de-rate-limiting--dos--high)
- [🔗 Chaîne d'attaque complète](#-chaîne-dattaque-complète)
- [🛠️ Outils utilisés](#️-outils-utilisés)
- [📊 Score CVSS](#-score-cvss-v31)
- [🔧 Recommandations](#-recommandations)
- [📁 Livrables](#-livrables)

---

## 👥 Équipe Red Team

| Membre | Rôle |
|--------|------|
| MohhiAya | Lead Tester — Attaque & Exploitation |
| Miftah Nouhaila | Lead Tester — Analyse & Rapport |

**Superviseur :** Pr. Sara El-Ateif — ENSIASD Taroudant
**Projet :** SIBD 2025-2026

---

## 🎯 Contexte & Objectifs

Le système **Agadir Tsunami-Ready** est une plateforme critique de gestion des alertes tsunami et des routes d'évacuation pour la région Agadir / Souss-Massa. Notre équipe Red Team a été mandatée pour identifier les vulnérabilités exploitables avant tout déploiement opérationnel, en simulant le comportement d'un attaquant réel.

L'engagement a suivi une approche combinée **boîte noire** (sans connaissance initiale) et **boîte grise** (avec accès au code source), guidée par l'**OWASP Top 10 (2021)** et le standard **PTES** (Penetration Testing Execution Standard). Tous les tests ont été conduits sur un environnement **Kali Linux** isolé.

Les deux implémentations du système ont été testées :
- **App Architects** — développée manuellement avec la méthode MERISE
- **App Augmenteds** — développée avec assistance IA (Claude, Gemini, Cursor)

---

## 🖥️ Applications testées

| Application | Stack | Port | Base de données |
|-------------|-------|------|-----------------|
| **App Architects** | Django 5.2 + Python | `8000` | SQLite |
| **App Augmenteds — API** | Node.js 22 + Express | `3001` | MySQL |
| **App Augmenteds — Flask** | Flask + Python | `5000` | MySQL |
| **App Augmenteds — Frontend** | HTML / JS statique | `8080` | — |

### Endpoints identifiés (reconnaissance)

Découverts par analyse statique du code source (`grep` sur les fichiers JS et Python) :

```bash
grep -r "http\|/api\|fetch\|axios" ./Augmenteds_team/src/ --include="*.js" | head -n 30
```

| Endpoint | Port | Méthodes | Données exposées |
|----------|------|----------|-----------------|
| `/api/sirens/status` | 3001 | GET | ID, nom, zone, GPS, statut sirènes |
| `/alerts` | 3001 | GET, POST | Alertes tsunami : niveau, zone, message |
| `/api/users/citizens` | 3001 | GET | Liste des citoyens (partiellement protégé) |
| `/api/locations/active` | 3001 | GET | Positions GPS actives |
| `/api/alerts/whatsapp-broadcast` | 3001 | POST | Broadcast WhatsApp |
| `/events` | 5000 | GET, POST | Événements sismiques (Flask) |

---

## ⚠️ Résumé des vulnérabilités

| ID | Vulnérabilité | OWASP | CWE | Sévérité |
|----|---------------|-------|-----|----------|
| [VULN-001](#vuln-001--broken-access-control--critique) | Broken Access Control — données sirènes | A01:2021 | CWE-284 | 🔴 **CRITIQUE** |
| [VULN-002](#vuln-002--accès-données-sensibles--man-in-the-middle--critique) | Accès données sensibles + MitM | A01:2021 | CWE-284 | 🔴 **CRITIQUE** |
| [VULN-003](#vuln-003--cors-wildcard--high) | CORS Wildcard / Security Misconfiguration | A05:2021 | CWE-942 | 🟠 **HIGH** |
| [VULN-004](#vuln-004--absence-de-rate-limiting--dos--high) | Absence de Rate Limiting — DoS | A04/A05:2021 | CWE-770 | 🟠 **HIGH** |

---

## 🔍 Détail des attaques

---

### VULN-001 — Broken Access Control | 🔴 CRITIQUE

**Endpoint affecté :** `GET /api/sirens/status` — Port 3001
**OWASP :** A01:2021 | **CWE :** CWE-284 | **Auth requise :** Aucune

#### Description

L'endpoint `/api/sirens/status` est accessible sans aucune forme d'authentification. N'importe quel visiteur anonyme peut interroger cet endpoint et obtenir la liste complète des sirènes d'alerte de la côte d'Agadir : identifiant, nom, zone géographique, coordonnées GPS précises et statut d'activation en temps réel.

#### Preuve — commande exécutée

```bash
curl -X GET http://localhost:3001/api/sirens/status
```

#### Réponse obtenue (sans token)

```json
{
  "count": 4,
  "sirens": [
    {"id": "S1", "name": "Sirène Port",        "zone": "Zone Portuaire", "altitude_m": 5,  "lat": 30.425, "lng": -9.621, "active": false},
    {"id": "S2", "name": "Sirène Plage Agadir","zone": "Front de Mer",   "altitude_m": 3,  "lat": 30.418, "lng": -9.615, "active": false},
    {"id": "S3", "name": "Sirène Anza",        "zone": "Anza",           "altitude_m": 8,  "lat": 30.455, "lng": -9.645, "active": false},
    {"id": "S4", "name": "Sirène Taghazout",   "zone": "Taghazout",      "altitude_m": 10, "lat": 30.543, "lng": -9.709, "active": false}
  ]
}
```

#### Impact

- 📍 Cartographie complète de l'infrastructure d'alerte divulguée à n'importe qui
- 🎯 Ciblage physique possible des sirènes hors service ou mal positionnées
- 🔓 Aucune authentification requise depuis n'importe quel réseau

#### Remédiation

```javascript
// Ajouter le middleware JWT sur tous les endpoints sensibles
app.get('/api/sirens/status', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => {
  // ...
});

// Retourner HTTP 401 pour toute requête sans token valide
```

---

### VULN-002 — Accès données sensibles & Man-in-the-Middle | 🔴 CRITIQUE

**Endpoints affectés :** `/api/sirens/status`, `/alerts` — Port 3001
**OWASP :** A01:2021 | **CWE :** CWE-284 | **Vecteur :** HTTP non chiffré

#### Description

Les communications entre le frontend et le backend transitent en **HTTP non chiffré**. Un attaquant en position réseau peut intercepter et modifier les signaux d'alerte en transit via Burp Suite. En parallèle, les données de localisation GPS des citoyens en évacuation sont accessibles sans authentification.

#### Preuve — test MitM exécuté

```bash
# Configurer Burp Suite comme proxy sur 127.0.0.1:8080
# Intercepter la communication vers /api/sirens/status
curl -X GET http://localhost:3001/api/sirens/status
# → Données complètes retournées sans token, en HTTP clair
```

#### Impact

- 🔁 Modification du niveau d'alerte en transit (ex : 4.0 → 8.5) → évacuation injustifiée
- 🚫 Suppression d'une vraie alerte tsunami avant qu'elle atteigne le serveur
- 📡 Positions GPS des citoyens accessibles en clair sur le réseau

#### Remédiation

```nginx
# Forcer HTTPS + HSTS dans NGINX
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    ssl_certificate     /etc/ssl/tsunami-ready.crt;
    ssl_certificate_key /etc/ssl/tsunami-ready.key;
}
```

```python
# Ajouter signature HMAC sur les messages capteurs
import hmac, hashlib
signature = hmac.new(SECRET_KEY, message.encode(), hashlib.sha256).hexdigest()
```

---

### VULN-003 — CORS Wildcard | 🟠 HIGH

**Détecté par :** OWASP ZAP 2.17.0 — Automated Scan sur `http://localhost:8080`
**OWASP :** A05:2021 | **CWE :** CWE-942

#### Description

La configuration `Access-Control-Allow-Origin: *` autorise n'importe quel site web externe à effectuer des requêtes cross-origin vers l'API. Le scan automatisé ZAP a détecté **12 alertes** dont 7 occurrences de Cross-Domain Misconfiguration.

#### Preuve — scan ZAP exécuté

```bash
zaproxy &
# URL to attack : http://localhost:8080
# Mode : Automated Scan → Use traditional spider → Attack
# Résultat : 12 alertes (5 Medium, 4 Low, 3 Info)
```

#### Alertes détectées

| Alerte ZAP | Nombre | Sévérité |
|------------|--------|----------|
| Cross-Domain Misconfiguration | 7 | 🟠 Medium |
| CSP Header Not Set | 1 | 🟠 Medium |
| Missing Anti-clickjacking Header | 3 | 🟠 Medium |
| Server Leaks Info via X-Powered-By | 1 | 🟡 Low |
| X-Content-Type-Options Header Missing | 1 | 🟡 Low |
| Sub Resource Integrity Attribute Missing | 1 | 🟡 Low |
| Timestamp Disclosure — Unix | 2 | 🔵 Info |
| Modern Web Application | 3 | 🔵 Info |

#### Impact

- 🌐 CSRF facilité — actions malveillantes depuis un site tiers en nom d'un admin connecté
- 🖼️ Clickjacking — page intégrable dans un iframe malveillant
- 🔍 Stack technique révélée via `X-Powered-By`

#### Remédiation

```javascript
// Restreindre CORS aux origines autorisées
const corsOptions = {
  origin: ['https://tsunami-ready.agadir.ma'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Ajouter les headers de sécurité avec helmet
app.use(helmet());
// → X-Frame-Options: DENY
// → X-Content-Type-Options: nosniff
// → Content-Security-Policy: default-src 'self'
```

---

### VULN-004 — Absence de Rate Limiting / DoS | 🟠 HIGH

**Endpoints affectés :** `/alerts`, `/api/sirens/status`, `/events` — Ports 3001, 5000, 8000
**OWASP :** A04/A05:2021 | **CWE :** CWE-770

#### Description

Aucun mécanisme de limitation de débit n'est implémenté sur les endpoints critiques des deux applications. Un flood de 100 requêtes POST parallèles est accepté intégralement sans blocage. Apache Bench confirme que 984 requêtes sur 1000 aboutissent sans aucune restriction.

#### Preuve 1 — Apache Bench sur App Architects

```bash
ab -n 1000 -c 100 http://127.0.0.1:8000/alertes/current/
# Résultat : 984 / 1000 requêtes complétées
# apr_pollset_poll: The timeout specified has expired (70007)
# Total of 984 requests completed — aucun blocage détecté
```

#### Preuve 2 — Flood bash sur App Augmenteds

```bash
for i in {1..100}; do
  curl -X POST http://localhost:3001/alerts \
    -H "Content-Type: application/json" \
    -d "{\"niveau\":9.5,\"zone\":\"Test$i\",\"message\":\"DoS RED TEAM\"}" \
    -s -o /dev/null &
done
wait
echo "Flood terminé — 100 requêtes acceptées sans blocage"
```

#### Mesure de la dégradation des temps de réponse

```
Avant flood  → real 0.01s | cpu 82%
Pendant flood → real 0.03s | saturation connexions | erreurs HTTP 500
```

#### Impact

- 💥 Serveur inaccessible aux citoyens précisément pendant une alerte tsunami réelle
- 📩 Injection de centaines de faux événements sismiques en parallèle (amplification VULN-001)
- ⏱️ Dégradation mesurée du temps de réponse sous charge

#### Remédiation

```javascript
// Node.js — express-rate-limit
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Trop de requêtes — réessayez dans 60 secondes.' },
  standardHeaders: true,
}));
```

```python
# Django — django-ratelimit
from ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='30/m', block=True)
def current_alert(request):
    ...
```

```nginx
# NGINX — rate limiting upstream
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_req zone=api burst=20 nodelay;
```

---

## 🔗 Chaîne d'attaque complète

> Un attaquant unique non authentifié peut enchaîner ces vulnérabilités pour compromettre entièrement le système d'alerte tsunami d'Agadir.

```
ÉTAPE 1 ─── RECONNAISSANCE
            Analyse du code source GitHub
            grep → tous les endpoints et ports identifiés
               │
               ▼
ÉTAPE 2 ─── CARTOGRAPHIE DES SIRÈNES
            GET /api/sirens/status → sans token
            GPS + statut de toutes les sirènes côtières obtenus
               │
               ▼
ÉTAPE 3 ─── INTERCEPTION MitM
            HTTP non chiffré → Burp Suite proxy
            Modification des niveaux d'alerte en transit
               │
               ▼
ÉTAPE 4 ─── INJECTION DE FAUSSES ALERTES
            POST /alerts → niveau 9.8 sans authentification
            Fausse alerte critique → évacuation injustifiée possible
               │
               ▼
ÉTAPE 5 ─── ATTAQUE DoS
            100 requêtes parallèles → serveur saturé
            Système inaccessible pendant la crise
               │
               ▼
ÉTAPE 6 ─── EXPLOITATION CSRF (CORS *)
            Site malveillant → désactivation sirènes
            via session admin connecté
               │
               ▼
ÉTAPE 7 ─── IMPACT FINAL
            Vrai séisme → alertes bloquées
            Sirènes désactivées → citoyens sans information
```

---

## 🛠️ Outils utilisés

| Outil | Version | Utilisation |
|-------|---------|-------------|
| **Kali Linux** | 2026.1 | Système d'exploitation Red Team |
| **curl** | 8.x | Tests manuels des endpoints sans authentification |
| **OWASP ZAP** | 2.17.0 | Scan automatisé — 12 alertes détectées |
| **Apache Bench** | 2.3 | Test de charge DoS (1000 req, 100 concurrentes) |
| **Burp Suite Community** | 2026.4 | Interception et analyse du trafic HTTP / MitM |
| **Bash Scripts** | — | Flood parallèle 100 requêtes POST |
| **grep / tree** | — | Analyse statique du code source |

---

## 📊 Score CVSS v3.1

| Métrique | Valeur | Vecteur |
|----------|--------|---------|
| Attack Vector | Network | `AV:N` |
| Attack Complexity | Low | `AC:L` |
| Privileges Required | None | `PR:N` |
| User Interaction | None | `UI:N` |
| Scope | Changed | `S:C` |
| Confidentiality Impact | **High** | `C:H` |
| Integrity Impact | **High** | `I:H` |
| Availability Impact | **High** | `A:H` |

<div align="center">

### 🔴 Score CVSS Agrégé : 8.5 / 10 — HIGH TO CRITICAL

</div>

---

## 🔧 Recommandations

### 🔴 Priorité 1 — Critique (avant toute mise en production)

- [ ] Implémenter **JWT** sur tous les endpoints Node.js (`verifyToken` middleware) et Flask (`Flask-JWT-Extended`)
- [ ] Déployer **HTTPS** obligatoire avec certificat TLS valide (Let's Encrypt) sur tous les services
- [ ] Configurer **RBAC** avec les rôles `SENSOR` / `OPERATOR` / `ADMIN` et accès différenciés

### 🟠 Priorité 2 — High (avant déploiement)

- [ ] Remplacer `Access-Control-Allow-Origin: *` par la liste explicite des origines autorisées
- [ ] Intégrer **`express-rate-limit`** (Node.js) et **`django-ratelimit`** (Django) — 60 req/min par IP
- [ ] Installer **`helmet`** (Node.js) pour les headers de sécurité HTTP
- [ ] Déployer **NGINX** comme reverse proxy avec `limit_req_zone` et terminaison TLS

### 🟡 Priorité 3 — Medium

- [ ] Supprimer le header `X-Powered-By` de toutes les réponses
- [ ] Activer `X-Content-Type-Options: nosniff`
- [ ] Configurer une `Content-Security-Policy` explicite
- [ ] Désactiver `DEBUG = True` en environnement de production (Django)

---

## 📁 Livrables

```
Attaque/
├── README.md                       ← Ce fichier (synthèse Red Team)
└── report_redteam_final_vf.pdf     ← Rapport complet avec captures d'écran
```

| Fichier | Description | Statut |
|---------|-------------|--------|
| `README.md` | Synthèse de l'évaluation Red Team | ✅ Livré |
| `report_redteam_final_vf.pdf` | Rapport complet avec preuves et screenshots | ✅ Livré |

---

> **Avertissement légal :** Les tests décrits dans ce document ont été réalisés dans le cadre exclusif du SIBD Projet 2025-2026 de l'ENSIASD Taroudant, sur des environnements de développement locaux, avec autorisation explicite. Toute reproduction de ces techniques sur des systèmes réels sans autorisation est illégale.

---

<div align="center">

**Red Team — Agadir Tsunami-Ready**
SIBD Projet 2025-2026 | ENSIAS Taroudant | Pr. Sara El-Ateif
*Assessment Date : 13 Avril 2026*

</div>
