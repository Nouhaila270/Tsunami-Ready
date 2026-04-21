# 🔴 Red Team Security Assessment — Agadir Tsunami-Ready

<div align="center">

![Status](https://img.shields.io/badge/Status-NOT%20PRODUCTION%20READY-red?style=for-the-badge)
![Risk](https://img.shields.io/badge/CVSS%20Score-8.5%20%2F%2010-critical?style=for-the-badge)
![OWASP](https://img.shields.io/badge/Methodology-OWASP%20Top%2010%20%2B%20PTES-blue?style=for-the-badge)
![Date](https://img.shields.io/badge/Assessment%20Date-13%20Avril%202026-orange?style=for-the-badge)

</div>

---

> **Document Classification : CONFIDENTIAL — RESTRICTED**
> Ce dossier contient les résultats de l'évaluation de sécurité Red Team réalisée dans le cadre du **SIBD Projet 2025-2026** — ENSIASD Taroudant (Pr. Sara El-Ateif).

---

## 📋 Table des matières

- [Présentation](#-présentation)
- [Équipe Red Team](#-équipe-red-team)
- [Applications testées](#-applications-testées)
- [Résumé des vulnérabilités](#-résumé-des-vulnérabilités)
- [Détail des attaques](#-détail-des-attaques)
  - [VULN-001 — Broken Access Control](#vuln-001--broken-access-control-critique)
  - [VULN-002 — Accès données sensibles & MitM](#vuln-002--accès-données-sensibles--man-in-the-middle-critique)
  - [VULN-003 — CORS Wildcard](#vuln-003--cors-wildcard--security-misconfiguration-high)
  - [VULN-004 — Absence de Rate Limiting](#vuln-004--absence-de-rate-limiting--dos-high)
- [Chaîne d'attaque complète](#-chaîne-dattaque-complète)
- [Outils utilisés](#-outils-utilisés)
- [Score CVSS](#-score-cvss)
- [Recommandations](#-recommandations)
- [Livrables](#-livrables)

---

## 🎯 Présentation

Ce dossier contient les résultats complets de l'évaluation **Red Team** (tests d'intrusion) effectuée sur le système **Agadir Tsunami-Ready** — une plateforme critique de gestion des alertes et des routes d'évacuation tsunami pour la région Agadir / Souss-Massa.

L'engagement a combiné une approche **boîte noire** (sans connaissance initiale) et **boîte grise** (avec accès au code source) selon la méthodologie **OWASP Top 10 (2021)** et le standard **PTES**.

L'évaluation a été conduite sur un environnement **Kali Linux**, sur les deux implémentations du système livrées par les équipes de développement.

---

## 👥 Équipe Red Team

| Rôle | Nom |
|------|-----|
| Lead Tester — Attaque & Exploitation | *Mohhi Aya* |
| Lead Tester — Analyse & Rapport | *Miftah Nouhaila* |
| Superviseur | Pr. Sara El-Ateif — ENSIASD Taroudant |

---

## 🖥️ Applications testées

| Application | Stack | Port | Base de données |
|-------------|-------|------|-----------------|
| **App Architects** | Django 5.2 + Python | `8000` | SQLite |
| **App Augmenteds** | Node.js 22 + Express | `3001` | MySQL |
| **App Augmenteds (API)** | Flask + Python | `5000` | MySQL |
| **App Augmenteds (Frontend)** | HTML/JS statique | `8080` | — |

---

## ⚠️ Résumé des vulnérabilités

| ID | Vulnérabilité | OWASP | CWE | Sévérité | App cible |
|----|---------------|-------|-----|----------|-----------|
| [VULN-001](#vuln-001--broken-access-control-critique) | Broken Access Control — données sirènes exposées | A01 | CWE-284 | 🔴 **CRITIQUE** | Augmenteds (3001) |
| [VULN-002](#vuln-002--accès-données-sensibles--man-in-the-middle-critique) | Accès données sensibles + Man-in-the-Middle | A01 | CWE-284 | 🔴 **CRITIQUE** | Augmenteds (3001) |
| [VULN-003](#vuln-003--cors-wildcard--security-misconfiguration-high) | CORS Wildcard — Cross-Domain Misconfiguration | A05 | CWE-942 | 🟠 **HIGH** | Augmenteds (8080) |
| [VULN-004](#vuln-004--absence-de-rate-limiting--dos-high) | Absence de Rate Limiting — DoS applicatif | A04/A05 | CWE-770 | 🟠 **HIGH** | Les 2 apps |

---

## 🔍 Détail des attaques

### VULN-001 — Broken Access Control [CRITIQUE]

**Endpoint affecté :** `GET /api/sirens/status` (Port 3001)

**Description :**
L'endpoint `/api/sirens/status` est accessible sans aucune authentification. N'importe quel visiteur anonyme obtient la liste complète des sirènes d'alerte : ID, nom, zone géographique, coordonnées GPS et statut d'activation.

**Preuve — commande exécutée :**
```bash
curl -X GET http://localhost:3001/api/sirens/status
```

**Réponse obtenue :**
```json
{
  "count": 4,
  "sirens": [
    {"id": "S1", "name": "Sirène Port", "zone": "Zone Portuaire", "altitude_m": 5, "lat": 30.425, "lng": -9.621, "active": false},
    {"id": "S2", "name": "Sirène Plage Agadir", "zone": "Front de Mer", "altitude_m": 3, "lat": 30.418, "lng": -9.615, "active": false},
    {"id": "S3", "name": "Sirène Anza", "zone": "Anza", "altitude_m": 8, "lat": 30.455, "lng": -9.645, "active": false},
    {"id": "S4", "name": "Sirène Taghazout", "zone": "Taghazout", "altitude_m": 10, "lat": 30.543, "lng": -9.709, "active": false}
  ]
}
```

**Impact :**
- 📍 Cartographie complète de l'infrastructure d'alerte divulguée publiquement
- 🎯 Ciblage physique possible des sirènes hors service
- 🔓 Aucune authentification requise depuis n'importe où sur le réseau

**Remédiation :**
```javascript
// Ajouter le middleware JWT sur tous les endpoints sensibles
app.get('/api/sirens/status', verifyToken, requireRole(['ADMIN', 'OPERATOR']), (req, res) => { ... });
```

---

### VULN-002 — Accès données sensibles & Man-in-the-Middle [CRITIQUE]

**Endpoints affectés :** `/api/sirens/status`, `/alerts` (Port 3001)

**Description :**
Les communications entre le frontend et le backend transitent en **HTTP non chiffré**. Un attaquant en position réseau peut intercepter et modifier les signaux d'alerte en transit. De plus, certains endpoints exposent des données de localisation GPS en temps réel.

**Preuve — interception MitM avec Burp Suite :**
```bash
# Configurer Burp Suite comme proxy (127.0.0.1:8080)
# Intercepter la requête vers /api/sirens/status
# Modifier les données avant transmission au serveur
curl -X GET http://localhost:3001/api/sirens/status
# → Données sirènes retournées sans token
```

**Impact :**
- 🔁 Modification du niveau d'alerte en transit (ex: 4.0 → 8.5)
- 🚫 Suppression d'une vraie alerte tsunami avant qu'elle atteigne le serveur
- 📡 Communication HTTP sans chiffrement → MitM trivial sur le réseau local

**Remédiation :**
```nginx
# Forcer HTTPS + HSTS dans NGINX
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
}
```

---

### VULN-003 — CORS Wildcard / Security Misconfiguration [HIGH]

**Détecté par :** OWASP ZAP 2.17.0 — Automated Scan sur `http://localhost:8080`

**Description :**
La configuration CORS permissive `Access-Control-Allow-Origin: *` permet à n'importe quel site web externe d'effectuer des requêtes vers l'API. ZAP a détecté **12 alertes** lors du scan automatisé.

**Alertes ZAP détectées :**

| Alerte | Sévérité |
|--------|----------|
| Cross-Domain Misconfiguration (7 occurrences) | 🟠 Medium |
| CSP: Failure to Define Directive with No Fallback | 🟠 Medium |
| Content Security Policy (CSP) Header Not Set | 🟠 Medium |
| Missing Anti-clickjacking Header (3) | 🟠 Medium |
| Server Leaks Information via X-Powered-By Header | 🟡 Low |
| X-Content-Type-Options Header Missing | 🟡 Low |
| Sub Resource Integrity Attribute Missing | 🟡 Low |
| Timestamp Disclosure - Unix (2) | 🔵 Info |
| Modern Web Application (3) | 🔵 Info |

**Preuve — commande ZAP :**
```bash
zaproxy &
# URL to attack : http://localhost:8080
# Automated Scan → Attack
# Résultat : 12 alertes (5 Medium, 4 Low, 3 Info)
```

**Impact :**
- 🌐 CSRF facilité — actions malveillantes en nom d'un admin connecté
- 🖼️ Clickjacking — absence de X-Frame-Options
- 🔍 Information disclosure — X-Powered-By révèle la stack technique

**Remédiation :**
```javascript
// Node.js — Restreindre CORS
const corsOptions = {
  origin: ['https://tsunami-ready.agadir.ma'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Ajouter les headers de sécurité
app.use(helmet()); // X-Frame-Options, X-Content-Type-Options, CSP...
```

---

### VULN-004 — Absence de Rate Limiting / DoS [HIGH]

**Endpoints affectés :** `/alerts`, `/api/sirens/status`, `/events` (Ports 3001, 5000, 8000)

**Description :**
Aucun mécanisme de limitation de débit n'est implémenté sur les endpoints critiques. Un flood de 100 requêtes parallèles est accepté sans aucun blocage.

**Preuve 1 — Apache Bench sur App Architects :**
```bash
ab -n 1000 -c 100 http://127.0.0.1:8000/alertes/current/
# Résultat : 984/1000 requêtes complétées — aucun blocage
# Timeout après saturation : apr_pollset_poll: The timeout specified has expired
```

**Preuve 2 — Flood bash sur App Augmenteds :**
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3001/alerts \
    -H "Content-Type: application/json" \
    -d "{\"niveau\":9.5,\"zone\":\"Test$i\",\"message\":\"DoS RED TEAM\"}" -s -o /dev/null &
done
wait
echo "Flood terminé — 100 requêtes acceptées sans blocage"
```

**Mesure de la dégradation :**
```
Avant flood  : real 0.01s — cpu 82%
Pendant flood : real 0.03s (dégradation +200%) — connexions refusées
```

**Impact :**
- 💥 Serveur inaccessible aux citoyens pendant une vraie alerte tsunami
- 📩 Injection de centaines de faux événements sismiques en parallèle
- ⏱️ Temps de réponse dégradé de 10ms → saturation complète

**Remédiation :**
```javascript
// Node.js — express-rate-limit
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,               // 60 requêtes max par IP
  message: { error: 'Trop de requêtes, réessayez dans 60 secondes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);
```

```python
# Django — django-ratelimit
from ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='30/m', block=True)
def current_alert(request):
    ...
```

---

## 🔗 Chaîne d'attaque complète

```
┌─────────────────────────────────────────────────────────────────┐
│                    FULL ATTACK CHAIN                            │
├────┬────────────────────────┬────────────────────────────────────┤
│ 1  │ RECONNAISSANCE         │ Analyse code source GitHub → grep  │
│    │                        │ endpoints + ports identifiés       │
├────┼────────────────────────┼────────────────────────────────────┤
│ 2  │ CARTOGRAPHIE SIRÈNES   │ GET /api/sirens/status → GPS +     │
│    │                        │ statut de toutes les sirènes       │
├────┼────────────────────────┼────────────────────────────────────┤
│ 3  │ INTERCEPTION MitM      │ HTTP non chiffré → Burp Suite →    │
│    │                        │ modification des signaux d'alerte  │
├────┼────────────────────────┼────────────────────────────────────┤
│ 4  │ INJECTION ALERTES      │ POST /alerts → fausse alerte 9.8   │
│    │                        │ → évacuation injustifiée possible  │
├────┼────────────────────────┼────────────────────────────────────┤
│ 5  │ FLOOD DoS              │ 100 req parallèles → serveur       │
│    │                        │ saturé → alertes bloquées          │
├────┼────────────────────────┼────────────────────────────────────┤
│ 6  │ CSRF via CORS *        │ Site malveillant → désactivation   │
│    │                        │ sirènes depuis session admin       │
├────┼────────────────────────┼────────────────────────────────────┤
│ 7  │ IMPACT FINAL           │ Vrai séisme → alertes bloquées     │
│    │                        │ → sirènes désactivées → 💀         │
└────┴────────────────────────┴────────────────────────────────────┘
```

---

## 🛠️ Outils utilisés

| Outil | Version | Utilisation |
|-------|---------|-------------|
| **Kali Linux** | 2026.1 | Système d'exploitation Red Team |
| **curl** | 8.x | Tests manuels des endpoints sans auth |
| **OWASP ZAP** | 2.17.0 | Scan automatisé — 12 alertes détectées |
| **Apache Bench (ab)** | 2.3 | Test de charge DoS (1000 req, 100 concurrentes) |
| **Burp Suite Community** | 2026.4 | Interception MitM trafic HTTP |
| **Bash Scripts** | — | Flood parallèle 100 requêtes POST |
| **grep / tree** | — | Analyse statique code source |

---
# Rapport Red Team — Agadir Tsunami-Ready

**Projet SIBD 2025-2026 — ENSIASD Taroudant**
Encadrant : Pr. Sara El-Ateif

---

## Informations générales

| Champ | Détail |
|---|---|
| Projet | Agadir Tsunami-Ready — Système d'alerte et d'évacuation tsunami |
| Type d'évaluation | Test d'intrusion Red Team (Black-box / Grey-box) |
| Méthodologie | OWASP Top 10 (2021) + PTES |
| Date d'évaluation | 13 Avril 2026 |
| Score de risque global | 8.5 / 10 — HIGH TO CRITICAL |
| Verdict | NOT PRODUCTION READY |

---

## Membres de l'équipe

| Nom | Rôle |
|---|---|
| Mohhi Aya | Red Team — Attaque & Exploitation |
| Miftah Nouhaila | Red Team — Analyse & Rapport |

---

## Contexte

Dans le cadre du projet SIBD 2025-2026, notre équipe a été chargée de réaliser l'évaluation de sécurité (Red Team) du système **Agadir Tsunami-Ready**, développé par les équipes Architects et Augmenteds. Ce système est une plateforme critique de gestion des alertes tsunami et des routes d'évacuation pour la région Agadir / Souss-Massa.

L'objectif était d'identifier les vulnérabilités exploitables avant tout déploiement, en simulant le comportement d'un attaquant réel. Les tests ont été conduits sur un environnement Kali Linux, sur les deux implémentations du système.

---

## Environnement de test

| Application | Technologie | Port |
|---|---|---|
| App Architects | Django 5.2 + SQLite | 8000 |
| App Augmenteds (API) | Node.js 22 + MySQL | 3001 |
| App Augmenteds (Flask) | Flask + MySQL | 5000 |
| App Augmenteds (Frontend) | HTML / JS statique | 8080 |

### Outils utilisés

| Outil | Utilisation |
|---|---|
| curl | Tests manuels des endpoints sans authentification |
| OWASP ZAP 2.17.0 | Scan automatisé — 12 alertes détectées |
| Apache Bench (ab) | Test de charge DoS (1000 requêtes, 100 concurrentes) |
| Burp Suite 2026.4 | Interception et analyse du trafic HTTP |
| Bash Scripts | Flood parallèle 100 requêtes POST |
| grep / tree | Analyse statique du code source |

---

## Vulnérabilités identifiées

### VULN-001 — Broken Access Control `[CRITIQUE]`

**Endpoint :** `GET /api/sirens/status` (Port 3001)

**Description :**
L'endpoint `/api/sirens/status` est accessible sans aucune authentification. N'importe quel visiteur anonyme obtient la liste complète des sirènes d'alerte : identifiant, nom, zone géographique, coordonnées GPS et statut d'activation.

**Commande exécutée :**
```bash
curl -X GET http://localhost:3001/api/sirens/status
```

**Réponse obtenue :**
```json
{
  "count": 4,
  "sirens": [
    {"id": "S1", "name": "Sirène Port", "zone": "Zone Portuaire",
     "altitude_m": 5, "lat": 30.425, "lng": -9.621, "active": false},
    {"id": "S2", "name": "Sirène Plage Agadir", "zone": "Front de Mer",
     "altitude_m": 3, "lat": 30.418, "lng": -9.615, "active": false},
    {"id": "S3", "name": "Sirène Anza", "zone": "Anza",
     "altitude_m": 8, "lat": 30.455, "lng": -9.645, "active": false},
    {"id": "S4", "name": "Sirène Taghazout", "zone": "Taghazout",
     "altitude_m": 10, "lat": 30.543, "lng": -9.709, "active": false}
  ]
}
```

**Impact :** Cartographie complète de l'infrastructure d'alerte divulguée publiquement. Un attaquant connaît la position GPS de chaque sirène et son état opérationnel sans s'authentifier.

**Remédiation :** Protéger l'endpoint avec un middleware JWT. Appliquer le RBAC : seuls les rôles `ADMIN` et `OPERATOR` accèdent aux données des sirènes. Retourner HTTP 401 pour toute requête sans token valide.

---

### VULN-002 — Accès aux données sensibles & Man-in-the-Middle `[CRITIQUE]`

**Endpoints :** `/api/sirens/status`, `/alerts` (Port 3001)

**Description :**
Les communications entre le frontend et le backend transitent en HTTP non chiffré. Un attaquant en position réseau peut intercepter et modifier les signaux d'alerte en transit. Le test Man-in-the-Middle réalisé avec Burp Suite a démontré la faisabilité de modifier la magnitude d'un séisme avant qu'elle atteigne le serveur.

**Commande exécutée :**
```bash
curl -X GET http://localhost:3001/api/sirens/status
# Retourne coordonnées GPS et statuts de toutes les sirènes sans authentification
# MitM : interception via Burp Suite — modification des données en transit
```

**Impact :** Un attaquant peut modifier un niveau d'alerte de 4.0 à 8.5 en transit, déclenchant une évacuation injustifiée, ou supprimer une vraie alerte tsunami avant traitement.

**Remédiation :** Déployer HTTPS avec un certificat TLS valide sur tous les services. Configurer HSTS. Ajouter une signature HMAC sur les messages capteurs pour garantir l'intégrité des données en transit.

---

### VULN-003 — CORS Wildcard / Security Misconfiguration `[HIGH]`

**Détecté par :** OWASP ZAP 2.17.0 sur `http://localhost:8080`

**Description :**
La configuration `Access-Control-Allow-Origin: *` autorise n'importe quel site web externe à effectuer des requêtes vers l'API. Le scan ZAP a détecté 12 alertes au total.

**Commande exécutée :**
```bash
zaproxy &
# URL : http://localhost:8080 — Automated Scan → Attack
# Résultat : 12 alertes (5 Medium, 4 Low, 3 Info)
```

**Alertes détectées par ZAP :**

| Alerte | Sévérité |
|---|---|
| Cross-Domain Misconfiguration (7 occurrences) | Medium |
| CSP Header Not Set | Medium |
| Missing Anti-clickjacking Header (3) | Medium |
| Server Leaks Information via X-Powered-By | Low |
| X-Content-Type-Options Header Missing | Low |
| Sub Resource Integrity Attribute Missing | Low |
| Timestamp Disclosure — Unix (2) | Info |

**Impact :** CSRF facilité depuis un site malveillant. Absence de protection contre le clickjacking. La stack technique est révélée via le header `X-Powered-By`.

**Remédiation :** Restreindre CORS aux origines légitimes. Configurer `Content-Security-Policy`, `X-Frame-Options: DENY` et `X-Content-Type-Options: nosniff`. Supprimer le header `X-Powered-By`.

---

### VULN-004 — Absence de Rate Limiting / DoS `[HIGH]`

**Endpoints :** `/alerts`, `/api/sirens/status`, `/events` (Ports 3001, 5000, 8000)

**Description :**
Aucun mécanisme de limitation de débit n'est implémenté sur les endpoints critiques. Un flood de 100 requêtes POST parallèles est accepté sans blocage. Le test Apache Bench confirme que 984 requêtes sur 1000 aboutissent sans aucune restriction.

**Commandes exécutées :**
```bash
# Test Apache Bench — App Architects
ab -n 1000 -c 100 http://127.0.0.1:8000/alertes/current/

# Flood bash — App Augmenteds
for i in {1..100}; do
  curl -X POST http://localhost:3001/alerts \
    -H "Content-Type: application/json" \
    -d "{\"niveau\":9.5,\"zone\":\"Test$i\",\"message\":\"DoS RED TEAM\"}" -s -o /dev/null &
done
wait
```

**Mesure de la dégradation :**

| Moment | Temps de réponse |
|---|---|
| Avant flood | 0.01s |
| Pendant flood | 0.03s (saturation connexions) |

**Impact :** Le serveur devient inaccessible aux citoyens précisément pendant une alerte réelle. Injection de centaines de faux événements sismiques possible en parallèle.

**Remédiation :** Intégrer `express-rate-limit` sur Node.js (60 req/min par IP). Utiliser `django-ratelimit` sur Django. Déployer NGINX comme reverse proxy avec `limit_req_zone`. Retourner HTTP 429 avec header `Retry-After`.

---

## Chaîne d'attaque complète

L'enchaînement des vulnérabilités identifiées permet à un attaquant non authentifié de compromettre entièrement le système selon le scénario suivant.

**Étape 1 — Reconnaissance :** Analyse du code source public sur GitHub. Identification de tous les endpoints, ports et mécanismes d'authentification via grep sur les fichiers JS et Python.

**Étape 2 — Cartographie des sirènes :** Interrogation de `/api/sirens/status` sans token. Obtention de la position GPS et du statut de chaque sirène d'alerte de la côte d'Agadir.

**Étape 3 — Interception Man-in-the-Middle :** En l'absence de HTTPS, interception du trafic via Burp Suite. Modification des niveaux d'alerte en transit avant traitement côté serveur.

**Étape 4 — Injection de fausses alertes :** POST sur `/alerts` avec un niveau 9.8. Insertion d'une fausse alerte critique dans le système sans vérification de source.

**Étape 5 — Attaque DoS :** Flood de 100 requêtes parallèles qui saturent le serveur. Le système devient inaccessible aux citoyens au moment le plus critique.

**Étape 6 — Exploitation CSRF :** Un site malveillant exploite le CORS wildcard pour effectuer des actions en nom d'un administrateur connecté, incluant la désactivation de sirènes.

**Étape 7 — Impact final :** Lors d'un séisme réel, les alertes légitimes ne passent plus, les sirènes sont désactivées, les citoyens ne peuvent pas accéder au système d'évacuation.

---

## Tableau récapitulatif OWASP

| ID | OWASP | Vulnérabilité | CWE | Sévérité |
|---|---|---|---|---|
| VULN-001 | A01:2021 | Broken Access Control — sirènes | CWE-284 | CRITIQUE |
| VULN-002 | A01:2021 | Broken Access Control — MitM | CWE-284 | CRITIQUE |
| VULN-003 | A05:2021 | CORS Wildcard / Security Misconfiguration | CWE-942 | HIGH |
| VULN-004 | A04/A05:2021 | Absence de Rate Limiting — DoS | CWE-770 | HIGH |

---

## Score de risque CVSS v3.1

| Métrique | Valeur | Vecteur |
|---|---|---|
| Attack Vector | Network | AV:N |
| Attack Complexity | Low | AC:L |
| Privileges Required | None | PR:N |
| User Interaction | None | UI:N |
| Scope | Changed | S:C |
| Confidentiality Impact | High | C:H |
| Integrity Impact | High | I:H |
| Availability Impact | High | A:H |

**Score agrégé : 8.5 / 10 — HIGH TO CRITICAL**

---

## Recommandations

**Priorité immédiate :**
- Implémenter JWT sur tous les endpoints Node.js et Flask
- Déployer HTTPS avec certificat TLS valide sur tous les services
- Configurer RBAC avec les rôles SENSOR / OPERATOR / ADMIN

**Avant déploiement :**
- Remplacer `Access-Control-Allow-Origin: *` par la liste des origines autorisées
- Intégrer `express-rate-limit` (Node.js) et `django-ratelimit` (Django)
- Installer `helmet` pour les headers de sécurité HTTP
- Déployer NGINX comme reverse proxy avec limitation de connexions

---

## Livrables

| Fichier | Description |
|---|---|
| `README.md` | Ce fichier — synthèse de l'évaluation Red Team |
| `report_redteam_final_vf.pdf` | Rapport complet avec captures d'écran et preuves |

---

*SIBD Projet 2025-2026 — ENSIASD Taroudant — Pr. Sara El-Ateif*
*Évaluation réalisée le 13 Avril 2026*
