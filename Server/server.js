// =====================
// Imports & Initial Setup
// =====================
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const session = require('express-session');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('./swagger');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('ws'); // WebSocket server

dotenv.config();

const app = express();
const port = 3000;

// =====================
// Spotify Configuration
// =====================
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const CALLBACK_URL = process.env.SPOTIFY_CALLBACK_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
  console.error('Spotify credentials not set in .env file!');
  process.exit(1);
}

// =====================
// Middleware Configuration
// =====================
app.use(express.json());

app.use(cors({
  origin: 'http://37.27.206.153:8080', // Frontend origin
  credentials: true,
}));

app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// =====================
// Databases Initialization
// =====================
let dbtoken = new sqlite3.Database('./datatoken.db', (err) => {
  if (err) {
    console.error('Errore nella connessione al database token:', err.message);
  } else {
    console.log('Connesso al database SQLite per i token.');
  }
});

dbtoken.run(`
  CREATE TABLE IF NOT EXISTS token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emailSpotify TEXT,
    token TEXT
  )
`);

let db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Errore nella connessione al database:', err.message);
  } else {
    console.log('Connesso al database SQLite principale.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT UNIQUE,
    emailSpotify TEXT,
    isAdmin INTEGER DEFAULT 0,
    Position TEXT,
    Password TEXT,
    DateBorn TEXT
  )
`);

// =====================
// Passport Spotify Strategy
// =====================
passport.use(new SpotifyStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    passReqToCallback: true,
  },
  function (req, accessToken, refreshToken, expires_in, profile, done) {
    const emailSpotify = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';

    // Handle token database operations
    dbtoken.serialize(() => {
      dbtoken.run('DELETE FROM token WHERE emailSpotify = ?', [emailSpotify]);
      dbtoken.run('INSERT INTO token (emailSpotify, token) VALUES (?, ?)', [emailSpotify, accessToken]);
    });

    // Check/create user
    db.get('SELECT * FROM users WHERE emailSpotify = ?', [emailSpotify], (err, user) => {
      if (err) return done(err);

      if (!user) {
        const username = profile.username || profile.displayName || `spotify_${Date.now()}`;
        db.run(
          'INSERT INTO users (Username, emailSpotify, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?)',
          [username, emailSpotify, 0, '', '', ''],
          function (err) {
            if (err) return done(err);
            return done(null, {
              id: this.lastID,
              Username: username,
              emailSpotify: emailSpotify,
              isAdmin: 0
            });
          }
        );
      } else {
        return done(null, user);
      }
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    done(null, user);
  });
});

// =====================
// Swagger Configuration
// =====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - Username
 *         - Password
 *       properties:
 *         id:
 *           type: integer
 *         Username:
 *           type: string
 *         emailSpotify:
 *           type: string
 *         isAdmin:
 *           type: integer
 *         Position:
 *           type: string
 *         Password:
 *           type: string
 *         DateBorn:
 *           type: string
 *       example:
 *         id: 1
 *         Username: johndoe
 *         emailSpotify: johndoe@spotify.com
 *         isAdmin: 0
 *         Position: Treviglio
 *         Password: password123
 *         DateBorn: 1990-01-01
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestione e autenticazione degli utenti
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Registrare un nuovo utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Utente aggiunto con successo
 *       400:
 *         description: Username e Password sono obbligatori
 *       409:
 *         description: Nome utente già in uso
 *       500:
 *         description: Errore del server
 */
// Create user
app.post('/users', (req, res) => {
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, row) => {
    if (err) {
      console.error('Errore nel controllo del nome utente:', err.message);
      return res.status(500).send({ message: 'Errore del server.' });
    }

    if (row) {
      return res.status(409).send({ message: 'Nome utente già in uso.' });
    } else {
      db.run(
        'INSERT INTO users (Username, emailSpotify, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?)',
        [Username, emailSpotify || '', 0, Position || '', Password, DateBorn || ''],
        function (err) {
          if (err) {
            console.error('Errore durante la registrazione:', err.message);
            return res.status(500).send({ message: err.message });
          }
          res.send({ message: `Utente aggiunto con ID: ${this.lastID}` });
        }
      );
    }
  });
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login dell'utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Username
 *               - Password
 *             properties:
 *               Username:
 *                 type: string
 *               Password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito
 *       400:
 *         description: Username e Password sono obbligatori
 *       401:
 *         description: Credenziali non valide
 *       500:
 *         description: Errore del server
 */
// Login
app.post('/login', (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, user) => {
    if (err) {
      return res.status(500).send({ message: 'Errore del server.' });
    }
    if (!user || user.Password !== Password) {
      return res.status(401).send({ message: 'Credenziali non valide' });
    }

    req.session.authenticated = true;
    req.session.user = {
      id: user.id,
      isAdmin: user.isAdmin === 1
    };

    // Mark user online
    setUserOnline(user.id, true);

    res.send({ message: 'Login successful' });
  });
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout dell'utente
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logout effettuato con successo
 *       500:
 *         description: Errore del server
 */
// Logout
app.post('/logout', (req, res) => {
  if (req.session.user && req.session.user.id) {
    setUserOnline(req.session.user.id, false);
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ message: 'Errore durante il logout.' });
    }
    res.clearCookie('connect.sid');
    res.send({ message: 'Logout effettuato con successo' });
  });
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Ottenere la lista degli utenti con filtri opzionali
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: Position
 *         schema:
 *           type: string
 *         description: Filtra per posizione
 *       - in: query
 *         name: DateBorn
 *         schema:
 *           type: string
 *         description: Filtra per data di nascita
 *     responses:
 *       200:
 *         description: Lista degli utenti
 *         content: 
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Errore del server
 */
// Get users with filters
app.get('/users', (req, res) => {
  const { Position, DateBorn } = req.query;
  let query = 'SELECT * FROM users';
  const conditions = [];
  const params = [];

  if (Position) {
    conditions.push('Position LIKE ?');
    params.push(`%${Position}%`); // Use LIKE with wildcards
  }

  if (DateBorn) {
    conditions.push('DateBorn = ?');
    params.push(DateBorn);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Errore nel recupero utenti:', err.message);
      return res.status(500).send({ message: 'Errore del server.' });
    }
    res.send(rows);
  });
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Aggiornare un utente per ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID dell'utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Utente aggiornato con successo
 *       403:
 *         description: Forbidden: Non puoi aggiornare altri utenti
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore del server
 */
// Update user
app.put('/users/:id', (req, res) => {
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  const userId = id.toString();
  const reqId = requesterId.toString();

  if (!isAdmin && reqId !== userId) {
    return res.status(403).send({ message: 'Forbidden: Cannot update other users' });
  }

  let isAdminToSet = isAdmin ? 1 : 0;

  if (!isAdmin) {
    db.get('SELECT isAdmin FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Errore nel recupero di isAdmin:', err.message);
        return res.status(500).send({ message: 'Errore del server.' });
      }
      if (!row) {
        return res.status(404).send({ message: 'User not found' });
      }

      isAdminToSet = row.isAdmin;

      db.run(
        'UPDATE users SET Username = ?, emailSpotify = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
        [Username, emailSpotify || '', Position || '', Password, DateBorn || '', isAdminToSet, id],
        function (err) {
          if (err) {
            console.error('Errore nell\'aggiornamento:', err.message);
            return res.status(500).send({ message: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).send({ message: 'User not found' });
          }
          res.send({ message: `User updated with ID: ${id}` });
        }
      );
    });
  } else {
    db.run(
      'UPDATE users SET Username = ?, emailSpotify = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
      [Username, emailSpotify || '', Position || '', Password, DateBorn || '', isAdminToSet, id],
      function (err) {
        if (err) {
          console.error('Errore nell\'aggiornamento:', err.message);
          return res.status(500).send({ message: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).send({ message: 'User not found' });
        }
        res.send({ message: `User updated with ID: ${id}` });
      }
    );
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Cancellare un utente per ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID dell'utente
 *     responses:
 *       200:
 *         description: Utente cancellato con successo
 *       403:
 *         description: Forbidden: Non puoi cancellare altri utenti
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore del server
 */
// Delete user
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  const userId = id.toString();
  const reqId = requesterId.toString();

  if (!isAdmin && reqId !== userId) {
    return res.status(403).send({ message: 'Forbidden: Cannot delete other users' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Errore nella cancellazione:', err.message);
      return res.status(500).send({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send({ message: `User deleted with ID: ${id}` });
  });
});

// Spotify Auth
app.get('/auth/spotify', 
  (req, res, next) => {
    req.session.destroy((err) => {
      if (err) console.error('Error clearing session:', err);
      next();
    });
  },
  passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-top-read', 'user-read-currently-playing'],
    showDialog: true
  })
);

app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  (req, res) => {
    req.session.authenticated = true;
    req.session.user = {
      id: req.user.id,
      isAdmin: req.user.isAdmin === 1
    };

    setUserOnline(req.user.id, true);

    res.redirect('http://37.27.206.153:8080/auth/callback');
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Ottenere informazioni sull'utente autenticato
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Informazioni sull'utente autenticato
 *       401:
 *         description: Non autenticato
 */
app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  res.send({
    userId: req.user.id,
    isAdmin: req.user.isAdmin === 1,
    emailSpotify: req.user.emailSpotify
  });
});

app.get('/login/spotify', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('http://37.27.206.153:8080/auth/callback');
  }
  res.redirect('/auth/spotify');
});

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Ottenere le tracce preferite dell'utente da Spotify
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista delle tracce preferite
 *       401:
 *         description: Non autenticato
 *       400:
 *         description: Access Token non disponibile
 *       500:
 *         description: Errore del server
 */
app.get('/favorites', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('Non autenticato');

  const emailSpotify = req.user.emailSpotify;
  try {
    const row = await new Promise((resolve, reject) => {
      dbtoken.get('SELECT * FROM token WHERE emailSpotify = ?', [emailSpotify], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!row || !row.token) {
      return res.status(400).send('Access Token non disponibile');
    }

    const accessToken = row.token;

    const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    const tracks = data.items || [];
    res.json(tracks);

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).send('Errore del server');
  }
});

/**
 * @swagger
 * /auth/check-session:
 *   get:
 *     summary: Controllare lo stato della sessione utente
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Stato della sessione
 *       500:
 *         description: Errore del server
 */
app.get('/auth/check-session', (req, res) => {
  res.json({
    authenticated: req.session.authenticated === true,
    user: req.session.user || null
  });
});

// Protect /users routes after authentication check
app.use('/users', (req, res, next) => {
  if (!req.session.authenticated) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  next();
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Home route
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Messaggio di benvenuto
 */
app.get('/', (req, res) => {
  res.send('Benvenuto al server Express!');
});

// =====================
// Shutdown Handling
// =====================
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Errore nella chiusura del database:', err.message);
    }
    console.log('Connessione al database chiusa.');
    process.exit(0);
  });
});

// =====================
// WebSocket Server Setup
// =====================
const server = http.createServer(app);
const wss = new Server({ server });

let usersStatus = {}; 

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastUserStatuses() {
  const allStatuses = Object.keys(usersStatus).map(userId => ({
    userId,
    ...usersStatus[userId]
  }));
  broadcast({ type: 'status_update', data: allStatuses });
}

wss.on('connection', (ws) => {
  // Send current statuses to the newly connected client
  const allStatuses = Object.keys(usersStatus).map(userId => ({
    userId,
    ...usersStatus[userId]
  }));
  ws.send(JSON.stringify({ type: 'status_update', data: allStatuses }));
});

function setUserOnline(userId, isOnline = true) {
  if (!usersStatus[userId]) {
    usersStatus[userId] = {};
  }
  usersStatus[userId].online = isOnline;
  // No longer clearing the listening info on going offline.
  broadcastUserStatuses();
}

function setUserListening(userId, listeningInfo) {
  if (!usersStatus[userId]) {
    usersStatus[userId] = {};
  }
  // Even if the user is offline, we store their listening info.
  usersStatus[userId].listening = listeningInfo;
  broadcastUserStatuses();
}


async function updateListeningStatuses() {
  try {
    dbtoken.all('SELECT emailSpotify, token FROM token', async (err, rows) => {
      if (err) {
        console.error('Error fetching tokens:', err);
        return;
      }

      for (const row of rows) {
        const emailSpotify = row.emailSpotify;
        const accessToken = row.token;

        const user = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE emailSpotify = ?', [emailSpotify], (err, user) => {
            if (err) reject(err);
            else resolve(user);
          });
        });

        if (!user) continue;

        try {
          const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (response.status === 200) {
            const data = await response.json();
            if (data && data.item) {
              const listeningInfo = {
                trackName: data.item.name,
                artists: data.item.artists.map(a => a.name).join(', '),
                album: data.item.album.name,
                trackUrl: data.item.external_urls.spotify
              };
              setUserListening(user.id, listeningInfo);
            } else {
              // Not currently playing anything
              if (usersStatus[user.id]) {
                usersStatus[user.id].listening = null;
              }
            }
          } else {
            // No access or not currently playing
            if (usersStatus[user.id]) {
              usersStatus[user.id].listening = null;
            }
          }
        } catch (error) {
          console.error('Error updating listening status for user', user.id, error);
        }
      }

      broadcastUserStatuses();
    });
  } catch (error) {
    console.error('Error updating listening statuses:', error);
  }
}

// Update listening status every 15 seconds
setInterval(updateListeningStatuses, 15 * 1000);

// =====================
// Start Server
// =====================
server.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log(`Swagger UI disponibile su http://localhost:${port}/api-docs`);
});
