'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname,'.env') });

// require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const app = express();
app.use(express.static(path.join(__dirname, '..')));   // '..' remonte d'un niveau

// Chargez les certificats 
const options = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+1-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+1.pem'))
};

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server, path: '/ws' });




const crypto = require('crypto');
const mysql = require('mysql2/promise');
const twilio = require('twilio');

app.use(cors({ origin: '*' , methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']}));
app.use(express.json({ limit: '1mb' }));

let db = null;

console.log('ENV PATH =', path.join(__dirname, '..', '.env'));
console.log('TWILIO SID =', process.env.TWILIO_ACCOUNT_SID ? 'OK' : 'MISSING');
console.log('TWILIO TOKEN =', process.env.TWILIO_AUTH_TOKEN ? 'OK' : 'MISSING');
console.log('TWILIO FROM =', process.env.TWILIO_WHATSAPP_FROM ? 'OK' : 'MISSING');

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

async function connectDB() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307', 10),
      database: process.env.DB_NAME || 'tsunami_ready',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 10,
      timezone: '+00:00',
    });

    const [rows] = await db.query('SELECT 1 AS ok');
    if (rows[0].ok === 1) {
      console.log(`✅ MySQL connecté → ${process.env.DB_NAME || 'tsunami_ready'}`);
      return true;
    }
  } catch (err) {
    console.error('❌ MySQL connexion échouée:', err.message);
    db = null;
    return false;
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
}

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

async function dbLog(action, table, desc, userId, ip) {
  if (!db) return;
  try {
    await db.query(
      'INSERT INTO system_logs (action, table_name, description, performed_by, ip_address) VALUES (?, ?, ?, ?, ?)',
      [action, table, desc, userId || null, ip || null]
    );
  } catch (_) {}
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  if (!db) {
    return res.status(500).json({ message: 'Base de données indisponible' });
  }

  try {
    const hash = tokenHash(token);
    const [rows] = await db.query(
      `
      SELECT s.user_id, u.email, u.role, u.full_name
      FROM auth_sessions s
      JOIN users u ON u.user_id = s.user_id
      WHERE s.token_hash = ?
        AND s.is_active = 1
        AND s.expires_at > NOW()
      `,
      [hash]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Session expirée — reconnectez-vous' });
    }

    req.user = {
      userId: rows[0].user_id,
      email: rows[0].email,
      role: rows[0].role,
      full_name: rows[0].full_name,
      token,
    };

    next();
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur (auth)' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé — admin seulement' });
  }
  next();
}

/* =========================
   WHATSAPP / TWILIO
========================= */

async function sendWhatsAppAlert(phone, message) {
  if (!twilioClient) {
    console.warn('⚠️ Twilio non configuré');
    return false;
  }

  if (!phone) return false;

  try {
    const normalized = String(phone).trim();
    const to = normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;

    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
      to,
      body: message
    });

    console.log(`✅ WhatsApp envoyé à ${normalized}`);
    return true;
  } catch (err) {
    console.error(`❌ Erreur WhatsApp vers ${phone}:`, err.message);
    return false;
  }
}

async function getConnectedUserPhone(userId) {
  if (!db) return null;

  try {
    const [rows] = await db.query(
      `
      SELECT user_id, full_name, phone
      FROM users
      WHERE user_id = ?
        AND is_active = 1
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) return null;
    return rows[0];
  } catch (err) {
    console.error('❌ Erreur lecture téléphone user:', err.message);
    return null;
  }
}

async function sendWhatsAppToConnectedUser(userId, event) {
  if (!event || Number(event.magnitude) < 6) {
    return { success: false, reason: 'threshold' };
  }

  const user = await getConnectedUserPhone(userId);
  if (!user || !user.phone) {
    return { success: false, reason: 'phone_missing' };
  }

  const magnitude = Number(event.magnitude).toFixed(1);
  const location = event.location || event.epicenter_description || 'Zone côtière Agadir';

  const message =
`🚨 ALERTE TSUNAMI
Magnitude: ${magnitude}
Lieu: ${location}

Bonjour ${user.full_name || 'citoyen'},
une alerte tsunami a été détectée.
Évacuez immédiatement vers les hauteurs et consultez votre itinéraire dans TsunamiReady.`;

  const ok = await sendWhatsAppAlert(user.phone, message);
  return { success: ok, phone: user.phone };
}

/* =========================
   AUTH
========================= */

app.post('/api/auth/register', async (req, res) => {
  const { username, full_name, email, phone, password, latitude, longitude } = req.body || {};

  if (!username || !full_name || !email || !password) {
    return res.status(400).json({
      message: 'Champs obligatoires : username, full_name, email, password'
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Mot de passe minimum 6 caractères' });
  }

  if (!db) {
    return res.status(500).json({ message: 'Base de données indisponible' });
  }

  const cleanUsername = String(username).trim();
  const cleanName = String(full_name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = phone ? String(phone).trim() : null;
  const lat = Number.isFinite(parseFloat(latitude)) ? parseFloat(latitude) : 30.4202;
  const lng = Number.isFinite(parseFloat(longitude)) ? parseFloat(longitude) : -9.5982;
  const pwdHash = sha256(password);

  try {
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE email = ? OR username = ? LIMIT 1',
      [cleanEmail, cleanUsername]
    );

    if (existing.length) {
      return res.status(409).json({ message: 'Email ou username déjà utilisé' });
    }

    const [result] = await db.query(
      `
      INSERT INTO users
      (username, password_hash, role, email, full_name, phone, latitude, longitude, is_active)
      VALUES (?, ?, 'citizen', ?, ?, ?, ?, ?, 1)
      `,
      [cleanUsername, pwdHash, cleanEmail, cleanName, cleanPhone, lat, lng]
    );

    const userId = result.insertId;
    const token = makeToken();
    const hash = tokenHash(token);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await db.query(
      'INSERT INTO auth_sessions (user_id, token_hash, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [userId, hash, getIp(req), expiresAt]
    );

    await dbLog('REGISTER', 'users', `Nouvelle inscription citizen: ${cleanEmail}`, userId, getIp(req));

    return res.status(201).json({
      token,
      user: {
        user_id:   userId,
        id:        userId,        // compat
        username:  cleanUsername,
        full_name: cleanName,
        name:      cleanName,     // compat
        email:     cleanEmail,
        role:      'citizen',
        phone:     cleanPhone,
        latitude:  lat,
        longitude: lng,
        lat,                      // compat
        lng                       // compat
      }
    });
  } catch (err) {
    console.error('[REGISTER]', err.message);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const pwdHash = sha256(password);

  // fallback mode for dev without MySQL
  if (!db) {
    if (cleanEmail === 'testuser@example.com' && pwdHash === sha256('Tsunami123')) {
      const user = {
        user_id: 1,
        id: 1,
        username: 'testuser',
        full_name: 'Test User',
        name: 'Test User',
        email: 'testuser@example.com',
        role: 'citizen',
        phone: '+212600000000',
        latitude: 30.4202,
        longitude: -9.5982,
        lat: 30.4202,
        lng: -9.5982
      };
      return res.json({ token: 'devtoken', user });
    }

    return res.status(503).json({ message: 'Base de données indisponible (utiliser testuser@example.com/Tsunami123)' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT user_id, username, email, full_name, role, phone, latitude, longitude, is_active
      FROM users
      WHERE email = ? AND password_hash = ?
      LIMIT 1
      `,
      [cleanEmail, pwdHash]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    const token = makeToken();
    const hash = tokenHash(token);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await db.query(
      'INSERT INTO auth_sessions (user_id, token_hash, ip_address, expires_at) VALUES (?, ?, ?, ?)',
      [user.user_id, hash, getIp(req), expiresAt]
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
    await dbLog('LOGIN', 'auth_sessions', `Connexion: ${cleanEmail}`, user.user_id, getIp(req));

    return res.json({
      token,
      user: {
        user_id:   user.user_id,
        id:        user.user_id,        // compat
        username:  user.username,
        full_name: user.full_name,
        name:      user.full_name,      // compat
        email:     user.email,
        role:      user.role,
        phone:     user.phone,
        latitude:  parseFloat(user.latitude),
        longitude: parseFloat(user.longitude),
        lat:       parseFloat(user.latitude),   // compat
        lng:       parseFloat(user.longitude),  // compat
      }
    });
  } catch (err) {
    console.error('[LOGIN]', err.message);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE auth_sessions SET is_active = 0 WHERE token_hash = ?',
      [tokenHash(req.user.token)]
    );
    await dbLog('LOGOUT', 'auth_sessions', `Déconnexion: ${req.user.email}`, req.user.userId, getIp(req));
    return res.json({ message: 'Déconnecté' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT user_id, username, email, full_name, role, phone, latitude, longitude
      FROM users
      WHERE user_id = ?
      `,
      [req.user.userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const u = rows[0];
    return res.json({
      id: u.user_id,
      username: u.username,
      name: u.full_name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      lat: parseFloat(u.latitude),
      lng: parseFloat(u.longitude),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   USERS
========================= */

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT user_id, username, email, full_name, role, phone, latitude, longitude, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      `
    );
    return res.json({ count: rows.length, users: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/users/citizens', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT u.user_id, u.username, u.email, u.full_name, u.phone, u.latitude, u.longitude, u.is_active, u.last_login
      FROM users u
      WHERE u.role = 'citizen'
      ORDER BY u.full_name
      `
    );
    return res.json({ count: rows.length, citizens: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/users/:id', requireAuth, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && req.user.userId !== targetId) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT user_id, username, email, full_name, role, phone, latitude, longitude, is_active, created_at, last_login
      FROM users
      WHERE user_id = ?
      `,
      [targetId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', requireAuth, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && req.user.userId !== targetId) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const { full_name, phone, latitude, longitude } = req.body || {};
  const updates = {};
  const params = [];

  if (full_name !== undefined) updates.full_name = String(full_name).trim();
  if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
  if (latitude !== undefined) updates.latitude = parseFloat(latitude);
  if (longitude !== undefined) updates.longitude = parseFloat(longitude);

  const keys = Object.keys(updates);
  if (!keys.length) {
    return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
  }

  try {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    params.push(...keys.map(k => updates[k]), targetId);

    await db.query(`UPDATE users SET ${setClause} WHERE user_id = ?`, params);

    return res.json({ success: true, updated: updates });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   SIRENS
========================= */

const SIRENS_DATA = [
  { id:'S1', name:'Sirène Port',         zone:'Zone Portuaire', altitude_m:5,  lat:30.4250, lng:-9.6210, active:false },
  { id:'S2', name:'Sirène Plage Agadir', zone:'Front de Mer',   altitude_m:3,  lat:30.4180, lng:-9.6150, active:false },
  { id:'S3', name:'Sirène Anza',         zone:'Anza',           altitude_m:8,  lat:30.4550, lng:-9.6450, active:false },
  { id:'S4', name:'Sirène Taghazout',    zone:'Taghazout',      altitude_m:10, lat:30.5430, lng:-9.7090, active:false },
];

app.get('/api/sirens/status', async (req, res) => {
  return res.json({ count: SIRENS_DATA.length, sirens: SIRENS_DATA });
});

app.post('/api/sirens/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  const siren = SIRENS_DATA.find(s => s.id === req.params.id);
  if (!siren) return res.status(404).json({ message: 'Sirène introuvable' });

  siren.active = true;
  broadcast('siren_activate', { siren_id: siren.id, siren_name: siren.name, active: true });
  return res.json({ success: true, siren });
});

app.post('/api/sirens/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  const siren = SIRENS_DATA.find(s => s.id === req.params.id);
  if (!siren) return res.status(404).json({ message: 'Sirène introuvable' });

  siren.active = false;
  broadcast('siren_deactivate', { siren_id: siren.id, active: false });
  return res.json({ success: true, siren });
});

/* =========================
   LOCATIONS
========================= */

app.post('/api/locations/update', requireAuth, async (req, res) => {
  const { lat, lng, speed_kmh, accuracy } = req.body || {};

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ message: 'lat et lng requis' });
  }

  try {
    await db.query(
      `
      INSERT INTO citizens_locations (user_id, latitude, longitude, speed_kmh, accuracy_m)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.user.userId,
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(speed_kmh || 0),
        accuracy || null
      ]
    );

    broadcast('citizen_position', {
      user_id: req.user.userId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: parseFloat(speed_kmh || 0),
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/locations/active', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const [rows] = await db.query(
        `
        SELECT cl.user_id, u.full_name, u.role,
               cl.latitude AS lat, cl.longitude AS lng,
               cl.speed_kmh AS speed, cl.recorded_at AS timestamp
        FROM citizens_locations cl
        JOIN users u ON u.user_id = cl.user_id
        WHERE cl.recorded_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY cl.recorded_at DESC
        `
      );
      return res.json({ count: rows.length, locations: rows });
    }

    const [rows] = await db.query(
      `
      SELECT cl.user_id,
             cl.latitude AS lat, cl.longitude AS lng,
             cl.speed_kmh AS speed, cl.recorded_at AS timestamp
      FROM citizens_locations cl
      WHERE cl.user_id = ?
        AND cl.recorded_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      ORDER BY cl.recorded_at DESC
      LIMIT 1
      `,
      [req.user.userId]
    );

    return res.json({ count: rows.length, locations: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* =========================
   ALERTS / WHATSAPP
========================= */

app.post('/api/alerts/whatsapp-test', requireAuth, async (req, res) => {
  const { magnitude, location } = req.body || {};

  const event = {
    magnitude: Number(magnitude || 6.0),
    location: location || 'Agadir'
  };

  if (event.magnitude < 6) {
    return res.status(400).json({ message: 'Le seuil WhatsApp est fixé à magnitude >= 6' });
  }

  const result = await sendWhatsAppToConnectedUser(req.user.userId, event);

  if (!result.success) {
    if (result.reason === 'phone_missing') {
      return res.status(400).json({ message: 'Aucun numéro de téléphone trouvé pour cet utilisateur' });
    }
    return res.status(500).json({ message: 'Échec envoi WhatsApp' });
  }

  return res.json({
    success: true,
    message: 'WhatsApp envoyé à l’utilisateur connecté',
    phone: result.phone
  });
});

/* Envoie WhatsApp à TOUS les citoyens avec un numéro de téléphone */
app.post('/api/alerts/whatsapp-broadcast', requireAuth, async (req, res) => {
  const { magnitude, location } = req.body || {};
  const mag = Number(magnitude || 0);

  if (mag < 6) {
    return res.status(400).json({ message: 'Magnitude >= 6 requise pour diffusion' });
  }

  if (!db) return res.status(500).json({ message: 'Base de données indisponible' });

  try {
    const [citizens] = await db.query(
      `SELECT user_id, full_name, phone FROM users
       WHERE role = 'citizen' AND is_active = 1 AND phone IS NOT NULL AND phone != ''`
    );

    if (!citizens.length) {
      return res.json({ success: true, sent: 0, failed: 0, message: 'Aucun citoyen avec numéro enregistré' });
    }

    const loc = location || 'Zone côtière Agadir';
    let sent = 0, failed = 0;
    const results = [];

    for (const citizen of citizens) {
      const message =
`🚨 ALERTE TSUNAMI — TsunamiReady
Magnitude: ${mag.toFixed(1)}
Lieu: ${loc}

Bonjour ${citizen.full_name || 'citoyen'},
une alerte tsunami a été détectée.
ÉVACUEZ IMMÉDIATEMENT vers les hauteurs !`;

      const ok = await sendWhatsAppAlert(citizen.phone, message);
      if (ok) { sent++; results.push({ user_id: citizen.user_id, phone: citizen.phone, status: 'sent' }); }
      else     { failed++; results.push({ user_id: citizen.user_id, phone: citizen.phone, status: 'failed' }); }
    }

    console.log(`📲 Broadcast WhatsApp: ${sent} envoyés, ${failed} échoués`);
    return res.json({ success: true, sent, failed, total: citizens.length, results });

  } catch (err) {
    console.error('[BROADCAST]', err.message);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/test-whatsapp', async (req, res) => {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).send('Ajoute ?phone=+2126xxxxxxx');
  }

  const ok = await sendWhatsAppAlert(phone, 'Test WhatsApp TsunamiReady 🚨');
  if (ok) return res.send('Message WhatsApp envoyé');
  return res.status(500).send('Échec envoi WhatsApp');
});

/* =========================
   WEBSOCKET
========================= */

wss.on('connection', ws => {
  ws.userId = null;
  ws.role = null;

  ws.on('message', async raw => {
    try {
      const data = JSON.parse(raw);
      if (data.type !== 'identify') return;

      const { user_id, role, token } = data.payload || {};
      if (!token) return;

      const [rows] = await db.query(
        'SELECT user_id FROM auth_sessions WHERE token_hash = ? AND is_active = 1 AND expires_at > NOW()',
        [tokenHash(token)]
      );

      if (!rows.length) {
        ws.send(JSON.stringify({ type: 'auth_error', payload: { message: 'Session expirée' } }));
        return;
      }

      ws.userId = user_id;
      ws.role = role || 'citizen';

      ws.send(JSON.stringify({
        type: 'identified',
        payload: { user_id, message: 'Connexion sécurisée' }
      }));
    } catch (_) {}
  });
});

/* =========================
   START
========================= */

const PORT = parseInt(process.env.PORT || '3001', 10);

(async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n🌊 TsunamiReady Server — Port ${PORT}`);
    console.log(`API : https://localhost:${PORT}/api`);
    console.log(`WS  : wss://localhost:${PORT}/ws`);
    console.log(`\n── Statut Sécurité ──────────────────────`);
    console.log(`Certificat SSL : ACTIF (mkcert) ✅`);
    console.log(`\n── Comptes ─────────────────────────────`);
    console.log(`admin@agadir.ma   / admin2024!`);
    console.log(`citizen@agadir.ma / citizen2024!`);
    console.log(`\n── WhatsApp ────────────────────────────`);
    console.log(`Twilio configuré: ${twilioClient ? 'OUI' : 'NON'}`);
  });
})();