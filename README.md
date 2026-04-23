# 🌊 Agadir Tsunami-Ready



## 📝 Table des matières

- [À propos du projet Tsunami-Ready](#-à-propos-du-projet-tsunami-ready)
  - [Présentation](#présentation)
  - [Menaces & sécurité](#menaces--sécurité)
- [👥 L'équipe](#-léquipe)
  - [Red Team (Attaque)](#red-team-attaque)
  - [Blue Team (Défense)](#blue-team-défense)
  - [QA Engineers (Tests)](#qa-engineers-tests)
  - [Architects (Manuel)](#architects-manuel)
  - [Equipe Augmenteds (IA)](#equipe-augmenteds-ia)
- [🛠️ Technologies utilisées](#️-technologies-utilisées)
- [🚀 Installation et démarrage](#-installation-et-démarrage)
- [⚙️ Utilisation](#️-utilisation)
- [📊 Résultats des tests](#-résultats-des-tests)
  - [Version Augmenteds (IA)](#version-augmenteds-ia)
  - [Version Architects (Manuel)](#version-architects-manuel)
- [🔐 Audit de sécurité (Red Team)](#-audit-de-sécurité-red-team)
- [🛡️ Mesures de sécurisation (Blue Team)](#️-mesures-de-sécurisation-blue-team)
- [🤝 Contribution](#-contribution)
- [🤝Vidéo de démonstration](#-Vidéo-de-démonstration)

---

## 📖 À propos du projet Tsunami-Ready

### Présentation

**Tsunami-Ready** est un prototype de système d'information critique développé dans le cadre du module SIBD à l'ENSAI de Taroudant. Il vise à protéger la ville d'Agadir, zone côtière à haut risque sismique, en fournissant :

* Une **détection et alerte automatique** des tsunamis en moins d'une seconde.
* Le calcul en **temps réel** de routes d'évacuation optimales via l'algorithme de Haversine.
* Une **supervison centralisée** via un tableau de bord cartographique.
* Une **architecture multi-couches** combinant Flask, Node.js et MySQL.
* Un système de **notification multi-canal** (sirènes virtuelles, WhatsApp via Twilio).

Le projet explore deux approches distinctes pour répondre à ces défis : une version développée manuellement (Architects) et une autre générée par intelligence artificielle (Augmenteds).

### Menaces & sécurité

Conscient de la criticité du système (vies humaines en jeu), le projet intègre un volet de cybersécurité approfondi avec :

* Une **Red Team** chargée d'identifier les vulnérabilités.
* Une **Blue Team** responsable de la mise en place des contre-mesures.
* Des **QA Engineers** pour valider la qualité et la fiabilité des deux versions.

---

## 👥 L'équipe

Ce projet a été réalisé par une équipe aux compétences complémentaires, reflétant les enjeux de développement, de test et de sécurité d'un SI critique.

### Red Team (Attaque)
| Rôle |
| :--- |
| MOHHI Aya |
| MIFTAH Nouhaila |

### Blue Team (Défense)
| Rôle |
| :--- |
| ABELLAH M'RAK |
| IKRAM MOURABIT |

### QA Engineers (Tests)
| Rôle |
| :--- |
| Najy Omar |
| Aya Negry |

### Architects (Manuel)
| Rôle |
| :--- |
| LAMRANI ALAOUI Houda |
| Latlassi Abdelmaoula |
| MAZZINE Omar |

### Equipe Augmenteds (IA)
| Rôle |
| :--- |
| MERIZAK Yousra |
| MEZOUARA Hassna |
| MOUHADDAB Oumaima |

---

## 🛠️ Technologies utilisées

| Catégorie | Technologies |
| :--- | :--- |
| **Backend (IA)** | Node.js, Flask, MySQL |
| **Backend (Manuel)** | Django, Python, SQLite, Google Maps API |
| **Sécurité** | JWT, HTTPS/TLS, HMAC, UFW |
| **Notifications** | Twilio (WhatsApp) |
| **Frontend** | JavaScript Vanilla, Django Templates, Leaflet.js |
| **Outils de test** | OWASP ZAP, Apache Bench (ab), Burp Suite |

---

## 🚀 Installation et démarrage

### Prérequis
*   Git
*   Node.js (version 22.x)
*   Python (version 3.9+)
*   MySQL et/ou SQLite

### Étapes d'installation

1.  **Cloner le dépôt**
    ```bash
    git clone https://github.com/Nouhaila270/Tsunami-Ready.git
    cd Tsunami-Ready
1.  **Démarrer le backend Node.js (sur le port 3001)**
    ```bash
    cd Augmenteds/backend
    npm install
    node server.js

    # Dans un nouveau terminal, démarrer l'API Flask (sur le port 5000)
    cd Augmenteds/flask-api
    pip install -r requirements.txt
    python app.py

    # Dans un nouveau terminal, servir le frontend (sur le port 8080)
    cd Augmenteds/frontend
    # Utiliser un serveur local comme 'Live Server' de VS Code ou 'python -m http.server 8080'
1.  **Application (Version Architects - Manuel)**
    ```bash
    cd Architects
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver

### Utilisation
  Une fois les serveurs démarrés, vous pouvez accéder aux interfaces et aux fonctionnalités.
*    Dashboard de supervision : Visualisation en temps réel des alertes, des KPIs et de la carte.
*   Simulation de crise : Déclenchez un événement sismique via l'API (ex: handleSeismicEvent({ magnitude: 7.2, type: 'marine' })).
*  Inscription citoyenne : Les utilisateurs peuvent créer un compte, partager leur position GPS et recevoir des itinéraires d'évacuation.
*  Tests d'intrusion : Lancez les scripts fournis dans le dossier Attaque pour reproduire les vulnérabilités.




## Résultats des tests

Les **QA Engineers** ont réalisé **27 scénarios de test** au total (15 pour la version IA, 12 pour la version manuelle) pour valider les fonctionnalités clés : déclenchement des sirènes, authentification, RBAC, anti-injection SQL et calcul GPS.

### Version Augmenteds (IA)

| Indicateur | Valeur |
| :--- | :--- |
| **Taux de réussite** | 73% (11/15) |
| **Résultat détaillé** | 11 PASS, 1 BUG CRITIQUE, 3 PARTIELS |

### Version Architects (Manuel)

| Indicateur | Valeur |
| :--- | :--- |
| **Taux de réussite** | 58% (7/12) |
| **Résultat détaillé** | 7 PASS, 4 FAIL, 1 EN ATTENTE |



## Audit de sécurité (Red Team)

Un test d'intrusion complet (méthodologie **OWASP Top 10 + PTES**) a été mené sur les deux applications.

**Risque global évalué : HAUT À CRITIQUE (Score : 8.5 / 10)**

| ID | Vulnérabilité | Sévérité | Application cible |
| :--- | :--- | :--- | :--- |
| **VULN-001** | Broken Access Control — Données des sirènes exposées | **CRITIQUE** | App Augmented (Port 3001) |
| **VULN-002** | Accès public données sensibles & MitM | **CRITIQUE** | App Augmented (Port 3001) |
| **VULN-003** | CORS Wildcard — Mauvaise configuration cross-domain | **HAUTE** | App Augmented (Port 8080) |
| **VULN-004** | Absence de Rate Limiting — Déni de service applicatif | **HAUTE** | Les deux applications |

Un scénario de **chaîne d'attaque complet** a été démontré, permettant à un attaquant de cartographier les sirènes, de modifier des alertes et de saturer le serveur.



## Mesures de sécurisation (Blue Team)

En réponse à l'audit, la **Blue Team** a proposé et implémenté une architecture de défense en profondeur :

- **Contrôle d'accès (RBAC)** : Intégration de rôles (Admin, Opérateur, Citoyen) avec décorateurs `@login_required` et `@user_passes_test`.
- **Anti-injection SQL** : Remplacement des requêtes SQL concaténées par l'ORM Django (requêtes paramétrées).
- **Sécurisation des communications** : Déploiement de **HTTPS/TLS** avec certificats Let's Encrypt/mkcert et configuration HSTS.
- **Authentification des signaux** : Ajout d'une signature **HMAC** pour les données critiques des capteurs.
- **Déni de service (DoS)** : Implémentation de rate limiting avec `express-rate-limit` (Node.js) et `django-ratelimit` (Django).
- **Confidentialité des données** : Chiffrement **AES-256** des données sensibles (ex: coordonnées GPS).
- **Gestion des secrets** : Externalisation des clés et mots de passe dans un fichier **`.env`**.



## Contribution

Les contributions sont ce qui font de la communauté open-source un endroit incroyable pour apprendre, inspirer et créer. Toute contribution que vous apporterez est **grandement appréciée**.

- Signalez des bugs ou proposez des fonctionnalités via les **"issues"** GitHub.
- Consultez les **"pull requests"** existantes avant d'en ouvrir une nouvelle.

##  Vidéo de démonstration

Découvrez le fonctionnement du système d'alerte Tsunami-Ready en action :

[▶️ Regarder la vidéo (fichier MP4)](Demo_video.mp4)
